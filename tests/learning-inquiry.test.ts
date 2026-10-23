import assert from "node:assert/strict";
import test from "node:test";
import type { InquiryPost } from "../shared/course-inquiry.ts";
import { selectedInquiryText } from "../shared/learning-inquiry.ts";

const post: InquiryPost = {
  id: "synthetic-check",
  author: "synthetic:alice",
  name: "Synthetic Alice",
  kind: "check",
  body: "The modeled response needed validation. This is not a measured project result.",
  provenance: "Reviewed agent suggestion; Alice ran the model check.",
  links: [
    {
      caption: "Declared model",
      url: "https://book.test/demos/#demo-cache-decision-lab",
    },
  ],
  createdAt: "2026-10-07T08:00:00.000Z",
  editedAt: null,
  removedAt: null,
  reason: "",
};
test("chosen inquiry material retains identity, disagreement, evidence and tool provenance without inferring consensus", () => {
  const disagreement = {
    ...post,
    id: "synthetic-disagreement",
    author: "synthetic:bob",
    name: "Synthetic Bob",
    kind: "disagreement" as const,
    body: "I still need help choosing a stable window.",
    provenance: "",
    links: [],
  };
  const text = selectedInquiryText([post, disagreement], 6000);
  assert.match(
    text,
    /Synthetic Alice \[synthetic:alice\].*contribution synthetic-check/,
  );
  assert.match(text, /not a measured project result/);
  assert.match(text, /Reviewed agent suggestion/);
  assert.match(text, /Declared model: https:\/\/book.test/);
  assert.match(text, /Synthetic Bob \[synthetic:bob\] · disagreement/);
  assert.match(text, /still need help/);
  assert.doesNotMatch(text, /agreed|consensus|absent member/);
  assert.equal(selectedInquiryText([], 6000), "");
  assert.equal(
    selectedInquiryText(
      [{ ...post, removedAt: "2026-10-07T09:00:00.000Z" }],
      6000,
    ),
    "",
  );
  assert.throws(
    () => selectedInquiryText([post, disagreement], 50),
    /without being shortened/,
  );
});
