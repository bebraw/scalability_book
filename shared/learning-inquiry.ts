import type { InquiryPost } from "./course-inquiry.ts";

export const inquiryReasoningPrompts = [
  { title: "Question", prompt: "What are we trying to explain or decide?" },
  {
    title: "Competing explanations",
    prompt:
      "What did each contributor predict, and why? Retain consequential disagreement.",
  },
  {
    title: "Evidence or check",
    prompt:
      "What did we actually check? State the boundary, assumptions and limits; distinguish a model from measured evidence.",
  },
  {
    title: "Current decision",
    prompt:
      "What can the contributors justify now? Name who supports a claim; do not infer consensus or speak for an absent member.",
  },
  {
    title: "Remaining uncertainty",
    prompt:
      "What is unresolved, and what help or different check would be useful?",
  },
];
export const inquiryRolePrompts = [
  "Operator: state the question and run the chosen check.",
  "Challenger: compare independent predictions and question an assumption or boundary.",
  "Validator: check the result and its evidence limits; ask someone other than the operator to explain why it should be accepted.",
  "For the next check, change responsibilities so another member explains, challenges or validates. In a pair, combine challenger and validator and rotate the operator. Follow the course's shared-session contract.",
  "Reply asynchronously without waiting for every member. An absent member has not endorsed a decision. Solo learners can continue the private guide and use the course's independent human review route.",
];
export function inquiryOutline() {
  return inquiryReasoningPrompts.map(({ title }) => `${title}:\n`).join("\n");
}

/** Only deliberately selected, visible posts. Never truncate disagreement/evidence. */
export function selectedInquiryText(posts: InquiryPost[], limit: number) {
  const text = posts
    .filter((post) => !post.removedAt)
    .map((post) =>
      [
        `${post.name} [${post.author}] · ${post.kind} · contribution ${post.id}`,
        post.editedAt
          ? `Revised: ${post.editedAt}`
          : `Contributed: ${post.createdAt}`,
        post.body,
        post.provenance
          ? `Tool/observation provenance: ${post.provenance}`
          : "",
        ...post.links.map((link) => `${link.caption}: ${link.url}`),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  if (text.length > limit)
    throw new Error(
      "Choose fewer contributions so their disagreement, evidence and provenance fit without being shortened.",
    );
  return text;
}
