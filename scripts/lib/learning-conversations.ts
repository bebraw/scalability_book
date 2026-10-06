import { openLearningDatabase } from "./learning-database.ts";
import { chmodSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { conceptPages } from "../../shared/concept-pages.ts";
import { demoResources } from "../../shared/learning-resources.ts";
import {
  helpModes,
  type DemoToolRequest,
  type LearningConversation,
} from "../../shared/learning-agent.ts";
import {
  learningAssert,
  learningObject,
  learningText,
  learningList,
  learningId,
  parseLearningSource,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import type { LearningNotebook } from "./learning-notebook.ts";
import type { LearningProvider } from "./learning-codex.ts";

export function openLearningConversations(
  directory: string,
  notebook: LearningNotebook,
  provider: LearningProvider | null,
) {
  const filename = path.join(directory, "conversations.sqlite");
  const db = openLearningDatabase(
    filename,
    "conversations",
    "CREATE TABLE conversations (id TEXT PRIMARY KEY, body TEXT NOT NULL)",
  );
  chmodSync(filename, 0o600);
  let closed = false;
  const load = (id: string) => {
    const row = db
      .prepare("SELECT body FROM conversations WHERE id=?")
      .get(learningId(id));
    learningAssert(row, "Conversation not found.", 404);
    return JSON.parse(String(row.body)) as LearningConversation;
  };
  const save = (conversation: LearningConversation) => {
    if (closed) return;
    conversation.updatedAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO conversations VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
    ).run(conversation.id, JSON.stringify(conversation));
  };
  for (const row of db.prepare("SELECT body FROM conversations").all()) {
    const conversation = JSON.parse(String(row.body)) as LearningConversation;
    if (conversation.state === "working") {
      conversation.state = "failed";
      conversation.error =
        "The companion restarted. Your conversation was retained; send another message to resume.";
      save(conversation);
    }
  }
  let running: {
    conversation: LearningConversation;
    session: string;
    browser: string;
    origin: string;
    attempt: boolean;
  } | null = null;
  const tools = new Map<
    string,
    {
      request: DemoToolRequest;
      session: string;
      browser: string;
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const message = (
    conversation: LearningConversation,
    role: "student" | "agent" | "observation",
    text: string,
  ) => {
    conversation.messages.push({
      id: randomUUID(),
      role,
      text: text.slice(0, 32_000),
      at: new Date().toISOString(),
    });
    save(conversation);
  };
  const clearTools = () => {
    for (const pending of tools.values()) {
      clearTimeout(pending.timer);
      pending.reject(new LearningProblem("The investigation stopped.", 409));
    }
    tools.clear();
  };
  return {
    provider: provider?.name ?? null,
    list() {
      return db
        .prepare("SELECT body FROM conversations ORDER BY rowid DESC")
        .all()
        .map((row) => {
          const conversation = JSON.parse(
            String(row.body),
          ) as LearningConversation;
          return {
            id: conversation.id,
            title: conversation.title,
            updatedAt: conversation.updatedAt,
            source: conversation.source,
          };
        });
    },
    get: load,
    start(input: unknown, origin: string) {
      const value = learningObject(input);
      const source = parseLearningSource(value.source);
      learningAssert(
        new URL(source.url).origin === origin,
        "Use the paired book's source context.",
      );
      const conversation: LearningConversation = {
        id: randomUUID(),
        title: learningText(
          value.title ?? source.title,
          "Conversation title",
          300,
          true,
        ),
        threadId: null,
        source,
        messages: [],
        state: "idle",
        error: null,
        updatedAt: new Date().toISOString(),
      };
      save(conversation);
      return conversation;
    },
    send(id: string, input: unknown, session: string, origin: string) {
      learningAssert(
        provider,
        "Start the companion with --codex after signing in to its dedicated profile.",
        503,
      );
      learningAssert(
        !running,
        "A reply is already running. Wait or stop it first.",
        409,
      );
      const conversation = load(id);
      learningAssert(
        conversation.messages.length < 500,
        "Start a new conversation; this one has reached its message limit.",
        413,
      );
      const value = learningObject(input);
      const browser = learningId(value.browserId);
      const text = learningText(value.text, "Your question", 8000, true);
      const goal = learningText(value.goal ?? "", "Learning goal", 1000);
      const mode = learningText(value.mode, "Help mode", 30, true);
      learningAssert(
        (helpModes as readonly string[]).includes(mode),
        "Choose a help mode.",
      );
      const selected = learningList(value.noteIds ?? [], 30).map((id) => {
        const entry = notebook.entry(learningId(id));
        learningAssert(entry, "Selected note not found.", 404);
        return entry;
      });
      const attempt = selected.some(
        (entry) =>
          entry.kind === "attempt" &&
          entry.source.url === conversation.source.url &&
          entry.source.anchor === conversation.source.anchor &&
          entry.body.trim().length > 0,
      );
      const prompt = JSON.stringify({
        helpMode: mode,
        goal,
        source: conversation.source,
        selectedNotes: selected.map(({ id, kind, source, body }) => ({
          id,
          kind,
          source,
          body,
        })),
        question: text,
        availableDemos: demoResources.map(
          ({ id, title, url, assumptions }) => ({
            id,
            title,
            url,
            assumptions,
          }),
        ),
        bookResources: conceptPages.map(({ title, url }) => ({ title, url })),
      });
      learningAssert(
        prompt.length <= 96_000,
        "Select fewer notes for this conversation; the selected context is too large.",
        413,
      );
      running = { conversation, session, browser, origin, attempt };
      conversation.state = "working";
      conversation.error = null;
      message(conversation, "student", text);
      const current = running;
      const runTool = async (name: string, arguments_: unknown) => {
        learningAssert(
          running === current,
          "This investigation is no longer active.",
          409,
        );
        const args = learningObject(arguments_);
        if (name === "read_book") {
          const requested = learningText(args.path, "Book path", 400, true);
          const url = new URL(requested, origin);
          const published = new Set([
            ...conceptPages.map((page) => page.url),
            "/concepts/",
            "/concepts/graph.md",
            "/concepts/graph.json",
            "/concepts/agent-guide.md",
            "/explore/",
            "/explore/activities.md",
            "/explore/activities.json",
            "/demos/",
          ]);
          learningAssert(
            url.origin === origin &&
              !url.username &&
              !url.password &&
              published.has(url.pathname) &&
              !url.search,
            "That resource is outside the published book contract.",
            403,
          );
          url.hash = "";
          const response = await fetch(url, {
            redirect: "error",
            credentials: "omit",
            signal: AbortSignal.timeout(15_000),
          });
          learningAssert(
            response.ok && response.body,
            "The published resource is unavailable.",
            502,
          );
          const reader = response.body.getReader();
          let text = "";
          const decoder = new TextDecoder();
          try {
            while (text.length < 32_000) {
              const next = await reader.read();
              if (next.done) break;
              text += decoder.decode(next.value, { stream: true });
            }
          } finally {
            await reader.cancel();
            reader.releaseLock();
          }
          return {
            url: url.href,
            kind: "static-published-source",
            text: text.slice(0, 32_000),
            warning: "HTML is source text, not an executed demonstration.",
          };
        }
        learningAssert(
          name === "observe_demo" || name === "change_demo",
          "Only bounded book tools are available.",
          403,
        );
        const demoId = learningText(args.demoId, "Demo", 150, true);
        learningAssert(
          demoResources.some((demo) => demo.id === demoId),
          "Unknown authored demo.",
          404,
        );
        if (name === "change_demo")
          learningAssert(
            current.attempt,
            "Save and select your own initial thinking for this source before proposing demo changes.",
            403,
          );
        learningAssert(
          tools.size < 3,
          "Finish the current browser observation first.",
          429,
        );
        return new Promise((resolve, reject) => {
          const id = randomUUID();
          const request: DemoToolRequest = {
            id,
            conversationId: conversation.id,
            tool: name,
            demoId,
            arguments: args,
            expiresAt: new Date(Date.now() + 120_000).toISOString(),
          };
          const timer = setTimeout(() => {
            tools.delete(id);
            reject(
              new LearningProblem(
                "The browser did not complete this demo request. Ask the student to return to the demo; do not invent observations.",
                504,
              ),
            );
          }, 120_000);
          tools.set(id, { request, session, browser, resolve, reject, timer });
        });
      };
      void provider
        .run(conversation.threadId, prompt, runTool, (threadId) => {
          conversation.threadId = threadId;
          save(conversation);
        })
        .then(
          (answer) => {
            message(conversation, "agent", answer);
            conversation.state = "idle";
          },
          (error) => {
            conversation.state = "failed";
            conversation.error =
              error instanceof LearningProblem
                ? error.message
                : "The provider could not answer. Your work was retained.";
          },
        )
        .finally(() => {
          clearTools();
          save(conversation);
          if (running === current) running = null;
        });
      return conversation;
    },
    requests(session: string, browser: string) {
      return [...tools.values()]
        .filter(
          (pending) =>
            pending.session === session && pending.browser === browser,
        )
        .map((pending) => pending.request);
    },
    respond(id: string, input: unknown, session: string) {
      const pending = tools.get(learningId(id));
      learningAssert(
        pending && pending.session === session,
        "Browser request not found.",
        404,
      );
      const value = learningObject(input);
      learningAssert(
        value.browserId === pending.browser,
        "Use the browser that started this investigation.",
        403,
      );
      learningAssert(
        Buffer.byteLength(JSON.stringify(value)) < 64_000,
        "Demo observation is too large.",
        413,
      );
      learningAssert(
        typeof value.success === "boolean",
        "Report whether the browser request succeeded.",
      );
      tools.delete(id);
      clearTimeout(pending.timer);
      if (value.success) {
        message(
          running!.conversation,
          "observation",
          JSON.stringify({
            demoId: pending.request.demoId,
            tool: pending.request.tool,
            result: value.result,
          }),
        );
        pending.resolve(value.result);
      } else
        pending.reject(
          new LearningProblem(
            learningText(value.message, "Browser result", 1000, true),
            409,
          ),
        );
      return { completed: true };
    },
    async stop(session: string) {
      if (running)
        learningAssert(
          running.session === session,
          "This browser session does not own the running investigation.",
          403,
        );
      clearTools();
      await provider?.cancel();
      return { stopped: true };
    },
    close() {
      closed = true;
      clearTools();
      provider?.close();
      db.close();
    },
  };
}
export type LearningConversations = ReturnType<
  typeof openLearningConversations
>;
