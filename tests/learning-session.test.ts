import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  readLearningSession,
  saveLearningSession,
  type DiaryExchangePreview,
} from "../site/scripts/learning-session.ts";

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

function previewSnapshot(): DiaryExchangePreview {
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
  saveLearningSession({ ...readLearningSession(), notePreview: preview });
  const restored = readLearningSession();
  assert.deepEqual(restored.notePreview, preview);
  saveLearningSession({
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
  assert.deepEqual(readLearningSession().notePreview, preview);
  const closed = {
    ...preview,
    studentId: null,
    includeStudent: true,
    includeReply: false,
    open: false,
  };
  saveLearningSession({ ...readLearningSession(), notePreview: closed });
  assert.deepEqual(readLearningSession().notePreview, closed);
});

test("unusable note previews do not discard the assistant draft", (t) => {
  const storage = mockSessionStorage(t);
  const preview = previewSnapshot();
  const state = {
    ...readLearningSession(),
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
    const restored = readLearningSession();
    assert.equal(restored.notePreview, null, label);
    assert.deepEqual(restored.assistant, state.assistant, label);
    assert.equal(storage.read(), original, label);
  }
});

test("restoring assistant settings ignores retired notebook state", (t) => {
  const storage = mockSessionStorage(t);
  const draft = {
    source: previewSnapshot().source,
    browserId: "c0000000-0000-4000-8000-000000000005",
    conversationId: null,
    question: "Keep my unfinished question. ",
    goal: "",
    mode: "question",
    supportNeed: "unspecified",
  };
  storage.write({
    version: 1,
    notebookOpen: true,
    editor: { source: "retired" },
    assistantOpen: false,
    assistantView: "peers",
    assistantPaneView: "connect",
    assistant: draft,
  });
  const restored = readLearningSession();
  assert.deepEqual(restored, {
    assistantOpen: false,
    assistantView: "peers",
    assistantPaneView: "connect",
    assistant: draft,
    notePreview: null,
  });
  saveLearningSession({ ...restored, assistantOpen: true });
  assert.equal(readLearningSession().assistantOpen, true);
  assert.ok(!Object.hasOwn(JSON.parse(storage.read()!), "editor"));
});
