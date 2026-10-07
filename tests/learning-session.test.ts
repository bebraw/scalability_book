import test from "node:test";
import assert from "node:assert/strict";
import {
  readNotebookSession,
  saveNotebookSession,
} from "../site/scripts/learning-session.ts";

test("tab continuity retains unfinished writing and preparation, rejecting unusable sources without rewriting the stored record", (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  let record: string | null = null;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: () => record,
      setItem: (_key: string, value: string) => {
        record = value;
      },
    },
  });
  t.after(() => {
    if (descriptor)
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  });
  const body = "An unfinished explanation.\nThe next idea is ";
  const preparation = "Synthetic selected material.\n".repeat(5000);
  saveNotebookSession({
    open: true,
    view: "write",
    assistance: null,
    selected: [],
    preparation,
    editor: {
      id: "",
      expected: "",
      kind: "scratch",
      title: "Synthetic title ",
      body,
      relatedIds: [],
      source: {
        url: "https://book.example/chapters/example/",
        title: "Synthetic chapter",
        kind: "page",
        anchor: "",
        excerpt: "",
        revision: "synthetic-revision",
        conceptIds: ["queue"],
      },
    },
  });
  const restored = readNotebookSession();
  assert.equal(restored.open, true);
  assert.equal(restored.editor?.body, body);
  assert.equal(restored.editor?.title, "Synthetic title ");
  assert.equal(
    restored.editor?.source.url,
    "https://book.example/chapters/example/",
  );
  assert.equal(restored.preparation, preparation);
  assert.equal(restored.experience, "notebook");
  assert.equal(restored.notebookView, "write");
  assert.equal(restored.assistant, null);
  assert.equal(restored.notebookOpen, true);
  assert.equal(restored.assistantOpen, false);
  const legacy = JSON.parse(record!);
  legacy.view = "guide";
  record = JSON.stringify(legacy);
  assert.equal(readNotebookSession().experience, "assistant");
  assert.equal(readNotebookSession().assistantView, "guide");
  assert.equal(readNotebookSession().assistantOpen, true);
  assert.equal(readNotebookSession().notebookOpen, false);
  const current = {
    ...legacy,
    experience: "assistant",
    notebookView: "notes",
    assistantView: "agent",
    assistant: {
      source: restored.editor!.source,
      browserId: "c0000000-0000-4000-8000-000000000001",
      conversationId: "c0000000-0000-4000-8000-000000000002",
      question: "Keep this unfinished question. ",
      goal: "A chosen goal",
      mode: "explanation",
      supportNeed: "prerequisite",
    },
  };
  record = JSON.stringify(current);
  assert.deepEqual(readNotebookSession().assistant, current.assistant);
  assert.equal(readNotebookSession().notebookView, "notes");
  assert.equal(readNotebookSession().assistantView, "agent");
  record = JSON.stringify({ ...current, view: "connect" });
  assert.equal(readNotebookSession().assistantPaneView, "connect");
  assert.equal(readNotebookSession().notebookPaneView, "notes");
  record = JSON.stringify({ ...current, selected: ["legacy-selected"] });
  const migrated = readNotebookSession();
  assert.deepEqual(migrated.assistantSelected, ["legacy-selected"]);
  migrated.selected.push("notebook-only");
  assert.deepEqual(migrated.assistantSelected, ["legacy-selected"]);
  saveNotebookSession({
    ...migrated,
    notebookOpen: true,
    assistantOpen: true,
    notebookPaneView: "prepare",
    assistantPaneView: "guide",
    selected: ["notebook-only"],
    assistantSelected: ["assistant-only"],
  });
  const concurrent = readNotebookSession();
  assert.equal(concurrent.notebookOpen, true);
  assert.equal(concurrent.assistantOpen, true);
  assert.equal(concurrent.notebookPaneView, "prepare");
  assert.equal(concurrent.assistantPaneView, "guide");
  assert.deepEqual(concurrent.selected, ["notebook-only"]);
  assert.deepEqual(concurrent.assistantSelected, ["assistant-only"]);
  assert.deepEqual(concurrent.assistant, current.assistant);
  assert.equal(concurrent.editor?.body, body);
  current.assistant.source = {
    ...current.assistant.source,
    url: "javascript:synthetic",
  };
  record = JSON.stringify(current);
  assert.equal(readNotebookSession().assistant, null);
  assert.equal(readNotebookSession().editor?.body, body);
  const invalid = JSON.parse(record!);
  invalid.editor.source.url = "javascript:synthetic";
  record = JSON.stringify(invalid);
  const unchanged = record;
  assert.equal(readNotebookSession().open, false);
  assert.equal(readNotebookSession().editor, null);
  assert.equal(record, unchanged);
});
