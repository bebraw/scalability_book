import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLearningDatabase } from "./learning-database.ts";
import { learningAssert } from "../../shared/learning-workspace.ts";

export interface LocalWireMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}
export interface LocalTurn {
  complete: boolean;
  messages: LocalWireMessage[];
  instructions?: string;
}
interface LocalSession {
  id: string;
  backend: string;
  turns: LocalTurn[];
  returnedModel?: string;
}

/** Private wire snapshots have their own schema and never enter portable notebook archives. */
export function openLocalHistory(directory: string, backend: string) {
  const db = openLearningDatabase(
    path.join(directory, "local-provider.sqlite"),
    "local-provider",
    "CREATE TABLE local_sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL)",
  );
  let closed = false;
  function get(id: string): LocalSession {
    learningAssert(
      /^local-[a-f0-9-]{36}$/.test(id),
      "This conversation belongs to another provider. Start a new local-model conversation; its history was retained.",
      409,
    );
    const row = db
      .prepare("SELECT body FROM local_sessions WHERE id=?")
      .get(id);
    learningAssert(
      row,
      "The private local conversation is missing. Restore the full companion backup or start a new conversation; visible history was retained.",
      409,
    );
    let session: LocalSession;
    try {
      session = JSON.parse(String(row.body));
    } catch {
      throw new Error("Invalid local conversation storage.");
    }
    learningAssert(
      session && session.id === id && session.backend === backend,
      "This conversation used a different endpoint, model or tool mode. Restore that configuration or start a new conversation; no private history was sent.",
      409,
    );
    learningAssert(
      Array.isArray(session.turns) &&
        session.turns.length <= 500 &&
        session.turns.every(
          (turn) =>
            turn &&
            typeof turn.complete === "boolean" &&
            Array.isArray(turn.messages) &&
            turn.messages.every(
              (message) =>
                message &&
                ["user", "assistant", "tool"].includes(message.role) &&
                (typeof message.content === "string" ||
                  message.content === null),
            ),
        ),
      "The private local conversation is invalid. Restore a full backup or start a new conversation.",
      409,
    );
    return session;
  }
  function save(session: LocalSession) {
    const body = JSON.stringify(session);
    learningAssert(
      Buffer.byteLength(body) <= 8_000_000,
      "This private conversation has reached its storage limit. Start a new conversation; its history was retained.",
      413,
    );
    db.prepare(
      "INSERT INTO local_sessions VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
    ).run(session.id, body);
  }
  return {
    get,
    save,
    create(): LocalSession {
      const session = { id: `local-${randomUUID()}`, backend, turns: [] };
      save(session);
      return session;
    },
    close() {
      if (closed) return;
      closed = true;
      db.close();
    },
  };
}
