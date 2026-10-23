import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import {
  followUpForSource,
  followUpSource,
} from "../shared/learning-activities.ts";
import {
  parseNotebookArchive,
  notebookMarkdown,
} from "../shared/learning-workspace.ts";

const source = {
  url: "https://book.test/chapters/benchmarking/#p-example",
  title: "Synthetic passage",
  kind: "passage",
  anchor: "p-example",
  excerpt: "A synthetic reading observation.",
  revision: "test-revision",
  conceptIds: ["queue"],
};
const initial = {
  title: "My prediction",
  kind: "attempt",
  body: "I am unsure which observation window to use.",
  source,
};
function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "learning-notebook-"));
  let notebook = openLearningNotebook(directory);
  t.after(() => {
    notebook.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    get notebook() {
      return notebook;
    },
    restart() {
      notebook.close();
      notebook = openLearningNotebook(directory);
    },
  };
}
test("private notes persist across restart with original prediction and reviewed assistance", (t) => {
  const f = fixture(t);
  const note = f.notebook.saveEntry(initial, "2026-10-06T08:00:00.000Z");
  const revised = f.notebook.saveEntry(
    {
      ...note,
      expected: note.revision,
      body: "The observations need a stable common window.",
      assistance: "Reviewed synthetic tutor suggestion, conversation example.",
    },
    "2026-10-06T09:00:00.000Z",
  );
  f.restart();
  const restored = f.notebook.entry(note.id)!;
  assert.deepEqual(restored, revised);
  assert.equal(restored.history[0]?.body, initial.body);
  assert.match(restored.history[1]!.assistance!, /Reviewed synthetic/);
  assert.equal(restored.source.url, "https://book.test/chapters/benchmarking/");
});
test("stale edits and deletions preserve the latest text", (t) => {
  const f = fixture(t),
    note = f.notebook.saveEntry(initial);
  const revised = f.notebook.saveEntry({
    ...note,
    expected: note.revision,
    body: "My revised explanation.",
  });
  assert.throws(
    () =>
      f.notebook.saveEntry({
        ...note,
        expected: note.revision,
        body: "Stale draft.",
      }),
    /changed/,
  );
  assert.throws(
    () => f.notebook.deleteEntry(note.id, note.revision),
    /changed/,
  );
  assert.equal(f.notebook.entry(note.id)?.body, revised.body);
});
test("separate application and reflection retain authored context, relationships and reviewed assistance in portable version 1 archives", (t) => {
  const from = fixture(t),
    to = fixture(t);
  const first = from.notebook.saveEntry(initial);
  const demoSource = {
    ...first.source,
    kind: "demo" as const,
    anchor: "demo-cache-decision-lab",
    url: "https://book.test/chapters/architecture/",
    title: "Cache decision lab",
    conceptIds: ["cache", "contract", "consistency", "trade-off"],
  };
  const activity = followUpForSource(demoSource);
  const application = from.notebook.saveEntry({
    kind: "revisit",
    title: "My changed case",
    body: "I think the stale response needs validation.",
    source: followUpSource(demoSource, activity, "What if the origin changes?"),
    relatedIds: [first.id],
  });
  const reflection = from.notebook.saveEntry({
    kind: "reflection",
    title: "Still uncertain",
    body: "I still want help distinguishing freshness and validation.",
    source: demoSource,
    relatedIds: [first.id, application.id],
    assistance:
      "Reviewed suggestion from a selected conversation; this is my own reflection.",
  });
  const future = followUpSource(demoSource, {
    ...activity,
    version: 2,
    question: "A different question.",
  });
  assert.notEqual(application.source.excerpt, future.excerpt);
  from.restart();
  const archive = from.notebook.export();
  assert.equal(archive.version, 1);
  to.notebook.import(JSON.parse(JSON.stringify(archive)));
  to.restart();
  assert.deepEqual(to.notebook.entry(application.id), application);
  assert.deepEqual(to.notebook.entry(reflection.id), reflection);
  assert.match(application.source.excerpt, /reading-application \(version 1\)/);
  assert.match(application.source.excerpt, /change one assumption or boundary/);
  assert.match(
    application.source.excerpt,
    /Student-chosen case: What if the origin changes/,
  );
  assert.equal(application.source.revision, "test-revision");
  assert.equal(to.notebook.entry(first.id)?.body, initial.body);
  assert.deepEqual(to.notebook.judgments(), []);
});
test("portable import restores notes and dated concept judgments without replacing conflicting work", (t) => {
  const from = fixture(t),
    to = fixture(t);
  const note = from.notebook.saveEntry(initial);
  const judgment = from.notebook.saveJudgment({
    conceptId: "queue",
    studied: true,
    understanding: "unsure",
    evidenceIds: [note.id],
    intention: "Try a changed case.",
  });
  from.notebook.saveJudgment({
    ...judgment,
    expected: judgment.revision,
    understanding: "can-explain",
  });
  const archive = from.notebook.export();
  assert.equal(
    to.notebook.import(JSON.parse(JSON.stringify(archive))).added,
    1,
  );
  assert.equal(to.notebook.import(archive).added, 0);
  to.restart();
  assert.equal(to.notebook.judgments()[0]?.understanding, "can-explain");
  assert.equal(to.notebook.export().judgmentHistory.length, 2);
  const changedHistory = structuredClone(archive);
  changedHistory.judgmentHistory[0]!.intention =
    "An unrecorded change to past thinking.";
  assert.throws(
    () => to.notebook.import(changedHistory),
    /conflict in self-assessment history/,
  );
  to.notebook.saveEntry({
    ...note,
    expected: note.revision,
    body: "A different explanation on this computer.",
  });
  const another = from.notebook.saveEntry({
    ...initial,
    title: "Another note",
  });
  const conflicting = from.notebook.export();
  conflicting.entries.sort(
    (a, b) => Number(b.id === another.id) - Number(a.id === another.id),
  );
  assert.throws(() => to.notebook.import(conflicting), /Import conflict/);
  assert.equal(
    to.notebook.entry(another.id),
    null,
    "Import is atomic even when some new entries precede a conflict.",
  );
});
test("scratch notes remain short and selected submission drafts exclude unselected notes", (t) => {
  const f = fixture(t);
  const short = f.notebook.saveEntry({
    ...initial,
    kind: "scratch",
    body: "Window?",
  });
  f.notebook.saveEntry({
    ...initial,
    title: "Private unrelated thought",
    body: "Keep this out of the submission.",
  });
  const draft = notebookMarkdown([short]);
  assert.match(draft, /Window\?/);
  assert.doesNotMatch(draft, /unrelated|Keep this/);
});
test("invalid portable versions and inconsistent histories are rejected", (t) => {
  const f = fixture(t);
  f.notebook.saveEntry(initial);
  const archive = f.notebook.export();
  assert.throws(
    () => parseNotebookArchive({ ...archive, version: 2 }),
    /Unsupported/,
  );
  const malformed = structuredClone(archive);
  malformed.entries[0]!.body = "Unrecorded change";
  assert.throws(() => f.notebook.import(malformed), /latest revision/);
  assert.equal(f.notebook.entries()[0]?.body, initial.body);
});
