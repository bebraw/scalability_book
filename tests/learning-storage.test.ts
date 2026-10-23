import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import {
  openLearningDatabase,
  inspectLearningDatabase,
} from "../scripts/lib/learning-database.ts";
import {
  learningDataDirectory,
  lockLearningDirectory,
  migrateLearningDirectory,
} from "../scripts/lib/learning-storage.ts";

const source = {
  url: "https://book.test/demos/",
  title: "Synthetic check",
  kind: "demo",
  anchor: "demo-cache-decision-lab",
  excerpt: "Synthetic context",
  revision: "test-source",
  conceptIds: ["cache"],
};
test("per-user defaults are independent of the current folder and cached package version", () => {
  assert.equal(
    learningDataDirectory("darwin", "/student", {}),
    "/student/Library/Application Support/scalableweb-companion",
  );
  assert.equal(
    learningDataDirectory("linux", "/student", {}),
    "/student/.local/share/scalableweb-companion",
  );
  assert.equal(
    learningDataDirectory("linux", "/student", {
      XDG_DATA_HOME: "/private-data",
    }),
    "/private-data/scalableweb-companion",
  );
  assert.equal(
    learningDataDirectory("linux", "/student", { XDG_DATA_HOME: "relative" }),
    "/student/.local/share/scalableweb-companion",
  );
});
test("legacy schema upgrade retains accepted revisions and makes a restorable backup; newer schemas are never rewritten", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-schema-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let notebook = openLearningNotebook(dir);
  const initial = notebook.saveEntry({
    kind: "attempt",
    source,
    title: "Initial",
    body: "Original prediction",
  });
  const revised = notebook.saveEntry({
    ...initial,
    expected: initial.revision,
    body: "Revised explanation",
    assistance: "Reviewed synthetic assistance",
  });
  notebook.close();
  const filename = path.join(dir, "notebook.sqlite");
  let db = new DatabaseSync(filename);
  db.exec("PRAGMA user_version=0");
  db.close();
  notebook = openLearningNotebook(dir);
  assert.deepEqual(notebook.entry(initial.id), revised);
  notebook.close();
  assert.equal(inspectLearningDatabase(filename, "notebook"), 1);
  const backup = readdirSync(dir).find((name) =>
    name.includes("before-schema-1"),
  )!;
  assert.ok(backup);
  copyFileSync(path.join(dir, backup), filename);
  assert.equal(inspectLearningDatabase(filename, "notebook"), 0);
  notebook = openLearningNotebook(dir);
  assert.equal(notebook.entry(initial.id)!.body, revised.body);
  notebook.close();
  db = new DatabaseSync(filename);
  db.exec("PRAGMA user_version=2");
  db.close();
  const bytes = readFileSync(filename);
  assert.throws(() => openLearningNotebook(dir), /newer companion/);
  assert.deepEqual(readFileSync(filename), bytes);
});
test("an interrupted legacy upgrade leaves the source schema and a readable backup", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-schema-interruption-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "conversations.sqlite");
  const writer = new DatabaseSync(filename);
  writer.exec(
    "CREATE TABLE conversations(id TEXT PRIMARY KEY, body TEXT NOT NULL); INSERT INTO conversations VALUES ('synthetic','retained'); BEGIN IMMEDIATE",
  );
  try {
    assert.throws(
      () => openLearningDatabase(filename, "conversations", ""),
      /locked/,
    );
  } finally {
    writer.exec("ROLLBACK");
    writer.close();
  }
  assert.equal(inspectLearningDatabase(filename, "conversations"), 0);
  const backup = path.join(
    dir,
    readdirSync(dir).find((name) => name.includes("before-schema-1"))!,
  );
  const restored = new DatabaseSync(backup, { readOnly: true });
  assert.equal(
    restored.prepare("SELECT body FROM conversations").get()!.body,
    "retained",
  );
  restored.close();
  openLearningDatabase(filename, "conversations", "").close();
  assert.equal(inspectLearningDatabase(filename, "conversations"), 1);
});
test("explicit migration retains the source and revisions, rejects conflicts and live companions, and recovers stale locks", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-directory-migration-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const old = path.join(dir, "old"),
    next = path.join(dir, "next");
  const notebook = openLearningNotebook(old);
  const entry = notebook.saveEntry({
    kind: "reflection",
    source,
    title: "Keep this",
    body: "Initial context retained",
    assistance: "Reviewed draft",
  });
  notebook.close();
  assert.throws(
    () => migrateLearningDirectory(old, next, false),
    /confirm-stopped/,
  );
  const release = lockLearningDirectory(old);
  assert.throws(
    () => migrateLearningDirectory(old, next, true),
    /Another companion/,
  );
  release();
  writeFileSync(
    path.join(old, "companion.lock"),
    JSON.stringify({ pid: 2147483647, owner: "synthetic-dead-process" }),
  );
  const original = readFileSync(path.join(old, "notebook.sqlite"));
  migrateLearningDirectory(old, next, true);
  assert.deepEqual(readFileSync(path.join(old, "notebook.sqlite")), original);
  const moved = openLearningNotebook(next);
  assert.deepEqual(moved.entry(entry.id), entry);
  moved.close();
  assert.throws(() => migrateLearningDirectory(old, next, true), /not empty/);
  assert.deepEqual(readFileSync(path.join(old, "notebook.sqlite")), original);
});
