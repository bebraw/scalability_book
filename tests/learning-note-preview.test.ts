import test from "node:test";
import assert from "node:assert/strict";
import { buildNotebookDraft } from "../site/scripts/learning-note-preview.ts";
import {
  readNotebookSession,
  type NotebookDraftPreview,
} from "../site/scripts/learning-session.ts";
import { parseEntry } from "../shared/learning-workspace.ts";

function preview(): NotebookDraftPreview {
  return {
    conversationId: "c0000000-0000-4000-8000-000000000001",
    replyId: "c0000000-0000-4000-8000-000000000002",
    studentId: "c0000000-0000-4000-8000-000000000003",
    source: {
      url: "https://book.example/chapters/example/",
      title: "Synthetic chapter",
      kind: "page",
      anchor: "",
      excerpt: "",
      revision: "synthetic-revision",
      conceptIds: ["queue"],
    },
    relatedIds: ["c0000000-0000-4000-8000-000000000004"],
    teaching:
      "; policy study-assistant v1; Synthetic provider 2; model synthetic",
    studentText: "  My <b>literal</b> question.\n ",
    replyText:
      "\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
    includeStudent: true,
    includeReply: true,
    open: true,
  };
}

const fullIdentity =
  "Reviewed discussion draft; conversation c0000000-0000-4000-8000-000000000001; student message c0000000-0000-4000-8000-000000000003; assistant message c0000000-0000-4000-8000-000000000002; reply context c0000000-0000-4000-8000-000000000002";
const review = "; selected and reviewed by student before saving";
const shortened =
  "; teaching metadata shortened; see the original reply for full metadata";

function notebookEntry(body: string, assistance: string) {
  const revision = "d0000000-0000-4000-8000-000000000002";
  const at = "2026-11-17T10:00:00.000Z";
  return parseEntry({
    id: "d0000000-0000-4000-8000-000000000001",
    kind: "reflection",
    title: "Reviewed synthetic exchange",
    body,
    source: preview().source,
    relatedIds: preview().relatedIds,
    revision,
    createdAt: at,
    updatedAt: at,
    history: [{ revision, body, at, assistance }],
  });
}

test("the draft retains selected literal text, speaker labels and complete ordinary provenance", () => {
  const snapshot = preview();
  const original = structuredClone(snapshot);
  const draft = buildNotebookDraft(snapshot);
  assert.equal(
    draft.body,
    "Your question or response:\n\n  My <b>literal</b> question.\n \n\nTeaching assistant suggestion:\n\n\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
  );
  assert.equal(
    draft.assistance,
    fullIdentity +
      "; policy study-assistant v1; Synthetic provider 2; model synthetic" +
      review,
  );
  assert.equal(draft.metadataShortened, false);
  assert.deepEqual(snapshot, original);
});

test("only chosen nonempty speakers enter the body and selected-message provenance", () => {
  const snapshot = preview();
  const studentOnly = buildNotebookDraft({ ...snapshot, includeReply: false });
  assert.equal(
    studentOnly.body,
    "Your question or response:\n\n  My <b>literal</b> question.\n ",
  );
  assert.match(
    studentOnly.assistance,
    /student message c0000000-0000-4000-8000-000000000003/,
  );
  assert.doesNotMatch(studentOnly.assistance, /assistant message/);
  assert.match(
    studentOnly.assistance,
    /reply context c0000000-0000-4000-8000-000000000002/,
  );

  const replyOnly = buildNotebookDraft({ ...snapshot, includeStudent: false });
  assert.equal(
    replyOnly.body,
    "Teaching assistant suggestion:\n\n\n<script>literal text</script>\n**A suggestion**, not my claim.  ",
  );
  assert.doesNotMatch(replyOnly.assistance, /student message/);
  assert.match(
    replyOnly.assistance,
    /assistant message c0000000-0000-4000-8000-000000000002/,
  );

  assert.equal(
    buildNotebookDraft({
      ...snapshot,
      includeStudent: false,
      includeReply: false,
    }).body,
    "",
  );
  const blank = buildNotebookDraft({
    ...snapshot,
    studentText: " \n ",
    replyText: "\t",
  });
  assert.equal(blank.body, "");
  assert.doesNotMatch(blank.assistance, /student message|assistant message/);
});

test("a legacy reply preserves unknown teaching provenance without inventing a student turn", () => {
  const draft = buildNotebookDraft({
    ...preview(),
    studentId: null,
    teaching: "; teaching policy not recorded",
    replyText: "Recorded earlier reply.",
  });
  assert.equal(
    draft.body,
    "Teaching assistant suggestion:\n\nRecorded earlier reply.",
  );
  assert.equal(
    draft.assistance,
    "Reviewed discussion draft; conversation c0000000-0000-4000-8000-000000000001; assistant message c0000000-0000-4000-8000-000000000002; reply context c0000000-0000-4000-8000-000000000002; teaching policy not recorded; selected and reviewed by student before saving",
  );
  assert.equal(draft.metadataShortened, false);
});

test("over-limit note text remains complete for the UI to reject or the learner to edit", () => {
  const snapshot = {
    ...preview(),
    studentText: " " + "s".repeat(31_998) + "\n",
    replyText: "\n" + "r".repeat(31_998) + " ",
  };
  const draft = buildNotebookDraft(snapshot);
  assert.ok(draft.body.length > 64_000);
  assert.equal(
    draft.body,
    `Your question or response:\n\n${snapshot.studentText}\n\nTeaching assistant suggestion:\n\n${snapshot.replyText}`,
  );
  assert.throws(
    () => notebookEntry(draft.body, draft.assistance),
    /16[,_]?000 characters/,
  );
});

test("a restored preview with 2,000 teaching characters yields accepted provenance with all identities and an explicit shortening marker", (t) => {
  const snapshot = { ...preview(), teaching: "; model " + "m".repeat(1992) };
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: () => JSON.stringify({ version: 1, notePreview: snapshot }),
    },
  });
  t.after(() => {
    if (descriptor)
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  });
  const restored = readNotebookSession().notePreview;
  assert.deepEqual(restored, snapshot);
  const draft = buildNotebookDraft(restored!);
  assert.equal(draft.assistance.length, 2000);
  assert.ok(draft.assistance.startsWith(fullIdentity));
  assert.ok(draft.assistance.endsWith(shortened + review));
  assert.equal(draft.metadataShortened, true);
  assert.equal(restored!.teaching, snapshot.teaching);
  const saved = notebookEntry(draft.body, draft.assistance);
  assert.equal(saved.history[0]!.assistance, draft.assistance);
});

test("exactly 2,000 provenance characters are kept, while one additional character is explicitly shortened", () => {
  const teaching =
    "; policy " + "p".repeat(2000 - fullIdentity.length - review.length - 9);
  const complete = fullIdentity + teaching + review;
  assert.equal(complete.length, 2000);
  const exact = buildNotebookDraft({ ...preview(), teaching });
  assert.equal(exact.assistance, complete);
  assert.equal(exact.metadataShortened, false);
  assert.equal(
    notebookEntry(exact.body, exact.assistance).history[0]!.assistance,
    complete,
  );

  const over = buildNotebookDraft({ ...preview(), teaching: teaching + "!" });
  assert.equal(over.assistance.length, 2000);
  assert.equal(over.metadataShortened, true);
  assert.ok(over.assistance.startsWith(fullIdentity));
  assert.ok(over.assistance.endsWith(shortened + review));
  assert.equal(
    notebookEntry(over.body, over.assistance).history[0]!.assistance,
    over.assistance,
  );
});
