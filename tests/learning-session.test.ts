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
  const invalid = JSON.parse(record!);
  invalid.editor.source.url = "javascript:synthetic";
  record = JSON.stringify(invalid);
  const unchanged = record;
  assert.equal(readNotebookSession().open, false);
  assert.equal(readNotebookSession().editor, null);
  assert.equal(record, unchanged);
});
