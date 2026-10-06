import { DatabaseSync } from "node:sqlite";
import { existsSync, lstatSync, chmodSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { learningAssert } from "../../shared/learning-workspace.ts";

type DatabaseKind = "notebook" | "conversations";
const schemas = {
  notebook: {
    notebook_records: ["kind", "id", "revision", "body"],
    notebook_judgment_history: ["revision", "body"],
  },
  conversations: { conversations: ["id", "body"] },
};
export function inspectLearningDatabase(filename: string, kind: DatabaseKind) {
  const state = lstatSync(filename);
  learningAssert(
    state.isFile() && !state.isSymbolicLink(),
    "Use a regular learning database file.",
  );
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const version = Number(
      db.prepare("PRAGMA user_version").get()!.user_version,
    );
    learningAssert(
      version <= 1,
      `This ${kind} database needs a newer companion. Its data was not changed.`,
    );
    learningAssert(version >= 0, "Unsupported learning database schema.");
    for (const [table, expected] of Object.entries(schemas[kind])) {
      const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row) => String(row.name));
      learningAssert(
        JSON.stringify(columns) === JSON.stringify(expected),
        `The ${kind} schema is not recognized. Restore a backup or use a compatible companion; its data was not changed.`,
      );
    }
    return version;
  } finally {
    db.close();
  }
}

/** Legacy databases receive a snapshot before a transaction marks schema 1. */
export function openLearningDatabase(
  filename: string,
  kind: DatabaseKind,
  initialSql: string,
) {
  const existing = existsSync(filename);
  const version = existing ? inspectLearningDatabase(filename, kind) : 1;
  let backup: string | null = null;
  if (existing && version === 0) {
    backup = `${filename}.before-schema-1-${randomUUID()}.backup`;
    const reader = new DatabaseSync(filename, { readOnly: true });
    try {
      reader.prepare("VACUUM INTO ?").run(backup);
      chmodSync(backup, 0o600);
    } catch (error) {
      if (existsSync(backup)) rmSync(backup);
      throw error;
    } finally {
      reader.close();
    }
  }
  const db = new DatabaseSync(filename);
  try {
    db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
    if (!existing) db.exec(initialSql);
    db.exec("PRAGMA user_version=1; COMMIT");
    chmodSync(filename, 0o600);
    return db;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* SQLite may have already rolled back. */
    }
    db.close();
    throw error;
  }
}
