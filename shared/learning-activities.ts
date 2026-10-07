import { exercises } from "./exercises.ts";
import type { LearningSource } from "./learning-workspace.ts";

/** Authored optional tasks. Bump version when question/assumptions/check change. */
export interface LearningFollowUp {
  id: string;
  version: number;
  title: string;
  question: string;
  assumptions: string;
  selfCheck: string;
  exerciseUrl?: string;
}

const queueDrain: LearningFollowUp = {
  id: "queue-drain",
  version: 1,
  title: "Can the queue recover?",
  question:
    "There are 300 waiting events. New events arrive at 80/s and processing can complete 100/s while work is waiting. Predict when the waiting backlog will clear. What changes if arrivals become 120/s? Explain why a steady-state average from the earlier demo may not describe either transient interval.",
  assumptions:
    "Rates stay constant in each case; one event enters and completes once; there are no drops, retries or additional bottlenecks. We count waiting events, not all work in service. This is a thought experiment, not a recorded browser run.",
  selfCheck:
    "Compare arrivals with completions before dividing the backlog by their difference. Explain the units, whether the backlog shrinks or grows, and why stability matters. A real system would need evidence for the stated rates and boundary.",
  exerciseUrl: "/chapters/benchmarking/#exercise-measurement-transfer",
};

const readingApplication: LearningFollowUp = {
  id: "reading-application",
  version: 1,
  title: "Use the idea in a different situation",
  question:
    "Choose one claim from this reading. Apply it to a different system or your project, then change one assumption or boundary. Explain whether the claim still holds, why, and what evidence could challenge your explanation.",
  assumptions:
    "State the claim and conditions you are using. Your example can be hypothetical; identify it as such and do not invent measurements or an experience you did not have.",
  selfCheck:
    "Is the situation meaningfully different? Name the changed condition, connect it to the explanation, and distinguish a justified conclusion from an open question. Continuing uncertainty is a useful result.",
};

export function followUpForSource(source: LearningSource): LearningFollowUp {
  if (source.kind === "demo" && source.anchor === "demo-queue-balance-lab")
    return queueDrain;
  const pathname = new URL(source.url).pathname;
  const canonical =
    pathname === "/chapters/benchmarking/"
      ? "measurement-transfer"
      : pathname === "/chapters/scaling/"
        ? "scaling-model-choice"
        : null;
  if (canonical) {
    const exercise = exercises[canonical]!;
    return {
      id: `exercise-${canonical}`,
      version: exercise.version,
      title: exercise.title,
      question: exercise.prompt,
      assumptions:
        "Use the stated boundaries, units and stability or fixed-work assumptions. This reuses the reading's formative exercise; saving an explanation here does not submit or check its answers.",
      selfCheck: exercise.discussion,
      exerciseUrl: `${pathname}#exercise-${canonical}`,
    };
  }
  return readingApplication;
}

/** Snapshot in the existing portable source, never resolve an old task by today's ID. */
export function followUpSource(
  source: LearningSource,
  activity: LearningFollowUp,
  ownQuestion = "",
): LearningSource {
  return {
    ...source,
    excerpt: [
      source.excerpt.slice(0, 6000),
      `Independent application: ${activity.id} (version ${activity.version})`,
      `Question: ${activity.question}`,
      `Assumptions: ${activity.assumptions}`,
      `Self-check: ${activity.selfCheck}`,
      ownQuestion.trim() ? `Student-chosen case: ${ownQuestion.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
