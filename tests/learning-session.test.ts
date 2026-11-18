import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  readNotebookSession,
  saveNotebookSession,
  type NotebookDraftPreview,
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
  assert.equal(restored.notePreview, null);
  assert.equal(restored.notebookOpen, true);
  assert.equal(restored.assistantOpen, false);
  const legacy = JSON.parse(record!);
  legacy.view = "guide";
  record = JSON.stringify(legacy);
  assert.equal(readNotebookSession().experience, "assistant");
  assert.equal(readNotebookSession().assistantView, "guide");
  assert.equal(readNotebookSession().assistantOpen, true);
  assert.equal(readNotebookSession().notePreview, null);
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

function mockSessionStorage(t: TestContext) {
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
  return {
    read: () => record,
    write: (value: unknown) => {
      record = JSON.stringify(value);
    },
  };
}

function previewSnapshot(): NotebookDraftPreview {
  return {
    conversationId: "c0000000-0000-4000-8000-000000000001",
    replyId: "c0000000-0000-4000-8000-000000000002",
    studentId: "c0000000-0000-4000-8000-000000000003",
    source: {
      url: "https://book.example/chapters/example/",
      title: "Synthetic chapter",
      kind: "passage",
      anchor: "synthetic-passage",
      excerpt: "The source passage.",
      revision: "synthetic-revision",
      conceptIds: ["queue"],
    },
    relatedIds: ["c0000000-0000-4000-8000-000000000004"],
    teaching: "A synthetic authored explanation",
    studentText: "My unfinished question. ",
    replyText: "A synthetic reply.\n",
    includeStudent: false,
    includeReply: true,
    open: true,
  };
}

test("note preview round trips full review text and source independently of a new Assistant discussion", (t) => {
  mockSessionStorage(t);
  const preview = previewSnapshot();
  preview.studentText = " \n" + "s".repeat(31_996) + "\n ";
  preview.replyText = " \n" + "r".repeat(31_996) + "\n ";
  preview.teaching = "t".repeat(2000);
  preview.relatedIds = Array.from(
    { length: 100 },
    (_, i) => `d0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  );
  saveNotebookSession({ ...readNotebookSession(), notePreview: preview });
  const restored = readNotebookSession();
  assert.deepEqual(restored.notePreview, preview);
  saveNotebookSession({
    ...restored,
    assistant: {
      source: { ...preview.source, title: "Another discussion source" },
      conversationId: null,
      browserId: "c0000000-0000-4000-8000-000000000005",
      question: "A different unfinished question.",
      goal: "",
      mode: "question",
      supportNeed: "unspecified",
    },
  });
  assert.deepEqual(readNotebookSession().notePreview, preview);
  const closed = {
    ...preview,
    studentId: null,
    includeStudent: true,
    includeReply: false,
    open: false,
  };
  saveNotebookSession({ ...readNotebookSession(), notePreview: closed });
  assert.deepEqual(readNotebookSession().notePreview, closed);
});

test("unusable note previews do not discard Notebook writing or the Assistant draft", (t) => {
  const storage = mockSessionStorage(t);
  const preview = previewSnapshot();
  const state = {
    ...readNotebookSession(),
    editor: {
      id: "",
      expected: "",
      kind: "scratch" as const,
      title: "Keep my title ",
      body: "Keep this unfinished writing. ",
      relatedIds: [],
      source: preview.source,
    },
    assistant: {
      source: preview.source,
      conversationId: preview.conversationId,
      browserId: "c0000000-0000-4000-8000-000000000005",
      question: "Keep this unfinished question. ",
      goal: "A chosen goal",
      mode: "explanation" as const,
      supportNeed: "prerequisite" as const,
    },
  };
  const invalidPreviews = [
    { label: "not an object", value: [] },
    {
      label: "conversation UUID",
      value: { ...preview, conversationId: "invalid" },
    },
    {
      label: "reply UUID version",
      value: { ...preview, replyId: "c0000000-0000-1000-8000-000000000002" },
    },
    { label: "student UUID", value: { ...preview, studentId: "invalid" } },
    {
      label: "source",
      value: {
        ...preview,
        source: { ...preview.source, url: "javascript:synthetic" },
      },
    },
    { label: "related UUID", value: { ...preview, relatedIds: ["invalid"] } },
    {
      label: "too many related IDs",
      value: { ...preview, relatedIds: Array(101).fill(preview.replyId) },
    },
    {
      label: "teaching length",
      value: { ...preview, teaching: "t".repeat(2001) },
    },
    {
      label: "student text length",
      value: { ...preview, studentText: "s".repeat(32_001) },
    },
    {
      label: "reply text length",
      value: { ...preview, replyText: "r".repeat(32_001) },
    },
    { label: "text type", value: { ...preview, studentText: 12 } },
    {
      label: "student selection type",
      value: { ...preview, includeStudent: "true" },
    },
    { label: "reply selection type", value: { ...preview, includeReply: 1 } },
    { label: "open type", value: { ...preview, open: "false" } },
  ];
  for (const { label, value } of invalidPreviews) {
    storage.write({ version: 1, ...state, notePreview: value });
    const original = storage.read();
    const restored = readNotebookSession();
    assert.equal(restored.notePreview, null, label);
    assert.deepEqual(restored.editor, state.editor, label);
    assert.deepEqual(restored.assistant, state.assistant, label);
    assert.equal(storage.read(), original, label);
  }
});

test("Notebook size preferences retain independent dimensions without invalidating unfinished writing", (t) => {
  const storage = mockSessionStorage(t);
  const source = previewSnapshot().source;
  const state = {
    ...readNotebookSession(),
    editor: {
      id: "",
      expected: "",
      kind: "scratch" as const,
      title: "Unfinished note ",
      body: "Keep my writing. ",
      relatedIds: [],
      source,
    },
    assistant: {
      source,
      conversationId: null,
      browserId: "c0000000-0000-4000-8000-000000000005",
      question: "Keep my question. ",
      goal: "",
      mode: "question" as const,
      supportNeed: "unspecified" as const,
    },
  };
  const cases = [
    { saved: undefined, expected: null },
    { saved: null, expected: null },
    {
      saved: { width: 384, height: 640 },
      expected: { width: 384, height: 640 },
    },
    {
      saved: { width: 512.5, height: null },
      expected: { width: 512.5, height: null },
    },
    {
      saved: { width: -1, height: 600 },
      expected: { width: null, height: 600 },
    },
    {
      saved: { width: 384, height: "600" },
      expected: { width: 384, height: null },
    },
    { saved: { width: 10001, height: 0 }, expected: null },
    { saved: [384, 600], expected: null },
    { saved: "wide", expected: null },
  ];
  for (const { saved, expected } of cases) {
    storage.write({ version: 1, ...state, notebookSize: saved });
    const original = storage.read();
    const restored = readNotebookSession();
    assert.deepEqual(restored.notebookSize, expected);
    assert.deepEqual(restored.editor, state.editor);
    assert.deepEqual(restored.assistant, state.assistant);
    assert.equal(storage.read(), original);
    saveNotebookSession(restored);
    assert.deepEqual(readNotebookSession().notebookSize, expected);
  }
});
