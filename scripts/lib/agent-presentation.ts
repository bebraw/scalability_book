import { agentPresentation } from "../../shared/agent-presentation.ts";

export function renderInteractiveLearningGuidance(
  siteUrl: string,
  includeExamples = true,
): string {
  const absolute = (href: string) => new URL(href, siteUrl).href;
  return `## Interactive explanations when supported

Follow ${agentPresentation.sequence.join(" → ")}. Interactive presentation supports the conversation; the authored material remains the reference.

${Object.values(agentPresentation.inline).join("\n\n")}

${agentPresentation.fallback}

${
  includeExamples
    ? `Possible aids, selected after the student's attempt:

- For caching, use the [cache decision lab](${absolute("/demos/#demo-cache-decision-lab")}) and its catalog assumptions to investigate response age and origin validation.
- For retries, use [the recorder fixture](${absolute("/explore/challenge-an-explanation/agent.md")}) to trace local and durable state across a restart.
- For confidence, use [the classification fixture](${absolute("/explore/confidence-before-routing/agent.md")}) to compare a reported score with reference agreement after the student predicts it.

`
    : ""
}These suggestions do not add tasks or authorize external actions. Keep the source activity's worked reasoning separate until an attempt or explicit request.

`;
}
