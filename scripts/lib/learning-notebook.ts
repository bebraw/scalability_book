import { mkdirSync, chmodSync } from "node:fs";
import { openLearningDatabase } from "./learning-database.ts";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  notebookVersion,
  learningAssert,
  learningObject,
  learningText,
  learningId,
  learningList,
  parseLearningSource,
  parseEntry,
  parseJudgment,
  parseNotebookArchive,
  type NotebookEntry,
  type NotebookArchive,
  type ConceptJudgment,
  type NoteKind,
  noteKinds,
} from "../../shared/learning-workspace.ts";

/** Private state: never imported by a Worker or serialized by course APIs. */
export function openLearningNotebook(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "notebook.sqlite");
  const database = openLearningDatabase(
    filename,
    "notebook",
    `
    CREATE TABLE notebook_records (kind TEXT NOT NULL, id TEXT NOT NULL, revision TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id));
    CREATE TABLE notebook_judgment_history (revision TEXT PRIMARY KEY, body TEXT NOT NULL);`,
  );
  chmodSync(filename, 0o600);
  database.exec("PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000");
  function records<T>(kind: string): T[] {
    return database
      .prepare("SELECT body FROM notebook_records WHERE kind = ? ORDER BY id")
      .all(kind)
      .map((row) => JSON.parse(String(row.body)) as T);
  }
  function get<T>(kind: string, id: string): T | null {
    const row = database
      .prepare("SELECT body FROM notebook_records WHERE kind = ? AND id = ?")
      .get(kind, id);
    return row ? (JSON.parse(String(row.body)) as T) : null;
  }
  function write(
    kind: string,
    id: string,
    revision: string,
    body: unknown,
    expected: string | null,
  ) {
    const written = database
      .prepare(
        `INSERT INTO notebook_records (kind,id,revision,body) SELECT ?,?,?,? WHERE (? IS NULL OR EXISTS(SELECT 1 FROM notebook_records WHERE kind = ? AND id = ?))
      ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,body=excluded.body WHERE notebook_records.revision = ? RETURNING id`,
      )
      .get(
        kind,
        id,
        revision,
        JSON.stringify(body),
        expected,
        kind,
        id,
        expected,
      );
    learningAssert(
      written,
      "This record changed. Reload it before saving; your draft has not been overwritten.",
      409,
    );
  }
  function transaction<T>(action: () => T): T {
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const api = {
    close() {
      database.close();
    },
    entries() {
      return records<NotebookEntry>("entry").sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    judgments() {
      return records<ConceptJudgment>("judgment");
    },
    entry(id: string) {
      return get<NotebookEntry>("entry", learningId(id));
    },
    saveEntry(input: unknown, now = new Date().toISOString()): NotebookEntry {
      const value = learningObject(input);
      const id = value.id === undefined ? randomUUID() : learningId(value.id);
      const prior = get<NotebookEntry>("entry", id);
      learningAssert(
        prior || value.id === undefined,
        "Unknown notebook entry.",
        404,
      );
      const kind = value.kind;
      learningAssert(
        noteKinds.includes(kind as NoteKind),
        "Unknown note kind.",
      );
      const revision = randomUUID();
      const body = learningText(value.body, "Note", 16_000, true);
      const assistance =
        value.assistance === undefined || value.assistance === null
          ? null
          : learningText(value.assistance, "Assistance provenance", 2000, true);
      const entry = parseEntry({
        id,
        kind,
        source: prior?.source ?? parseLearningSource(value.source),
        title: learningText(value.title, "Note title", 300, true),
        body,
        createdAt: prior?.createdAt ?? now,
        updatedAt: now,
        revision,
        relatedIds: learningList(value.relatedIds ?? [], 100).map(learningId),
        history: [
          ...(prior?.history ?? []),
          { revision, body, at: now, assistance },
        ],
      });
      const expected = prior ? learningId(value.expected) : null;
      write("entry", id, revision, entry, expected);
      return entry;
    },
    deleteEntry(id: string, expected: string) {
      learningId(id);
      learningId(expected);
      const result = database
        .prepare(
          "DELETE FROM notebook_records WHERE kind = 'entry' AND id = ? AND revision = ?",
        )
        .run(id, expected);
      learningAssert(
        result.changes,
        "This record changed. Reload before deleting.",
        409,
      );
    },
    saveJudgment(
      input: unknown,
      now = new Date().toISOString(),
    ): ConceptJudgment {
      const value = learningObject(input);
      const judgment = parseJudgment({
        ...value,
        revision: randomUUID(),
        updatedAt: now,
      });
      for (const id of judgment.evidenceIds)
        learningAssert(get("entry", id), "Choose existing notebook evidence.");
      const prior = get<ConceptJudgment>("judgment", judgment.conceptId);
      return transaction(() => {
        write(
          "judgment",
          judgment.conceptId,
          judgment.revision,
          judgment,
          prior ? learningId(value.expected) : null,
        );
        database
          .prepare(
            "INSERT INTO notebook_judgment_history (revision,body) VALUES (?,?)",
          )
          .run(judgment.revision, JSON.stringify(judgment));
        return judgment;
      });
    },
    export(now = new Date().toISOString()): NotebookArchive {
      return {
        version: notebookVersion,
        exportedAt: now,
        entries: api.entries(),
        judgments: api.judgments(),
        judgmentHistory: database
          .prepare("SELECT body FROM notebook_judgment_history ORDER BY rowid")
          .all()
          .map((row) => JSON.parse(String(row.body)) as ConceptJudgment),
      };
    },
    import(input: unknown) {
      const archive = parseNotebookArchive(input);
      return transaction(() => {
        let added = 0;
        for (const entry of archive.entries) {
          const prior = get<NotebookEntry>("entry", entry.id);
          learningAssert(
            !prior || JSON.stringify(prior) === JSON.stringify(entry),
            `Import conflict for “${entry.title}”. Existing notes were preserved.`,
            409,
          );
          if (!prior) {
            write("entry", entry.id, entry.revision, entry, null);
            added++;
          }
        }
        for (const judgment of archive.judgments) {
          const prior = get<ConceptJudgment>("judgment", judgment.conceptId);
          learningAssert(
            !prior || JSON.stringify(prior) === JSON.stringify(judgment),
            `Import conflict for concept ${judgment.conceptId}. Existing judgments were preserved.`,
            409,
          );
          if (!prior)
            write(
              "judgment",
              judgment.conceptId,
              judgment.revision,
              judgment,
              null,
            );
        }
        for (const judgment of archive.judgmentHistory) {
          const prior = database
            .prepare(
              "SELECT body FROM notebook_judgment_history WHERE revision = ?",
            )
            .get(judgment.revision);
          learningAssert(
            !prior || String(prior.body) === JSON.stringify(judgment),
            "Import conflict in self-assessment history. Existing history was preserved.",
            409,
          );
          database
            .prepare(
              "INSERT OR IGNORE INTO notebook_judgment_history (revision,body) VALUES (?,?)",
            )
            .run(judgment.revision, JSON.stringify(judgment));
        }
        return { added };
      });
    },
  };
  return api;
}
export type LearningNotebook = ReturnType<typeof openLearningNotebook>;
