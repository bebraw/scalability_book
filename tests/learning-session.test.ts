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
  const legacy = JSON.parse(record!);
  legacy.view = "guide";
  record = JSON.stringify(legacy);
  assert.equal(readNotebookSession().experience, "assistant");
  assert.equal(readNotebookSession().assistantView, "guide");
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
