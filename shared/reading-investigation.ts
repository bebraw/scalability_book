import {
  learningAssert,
  learningObject,
  learningText,
  type LearningSource,
} from "./learning-workspace.ts";

/** Authored activity semantics; rendering, browser state and providers are adapters. */
export const queueInvestigation = {
  id: "queue-balance",
  version: 1,
  demoId: "demo-queue-balance-lab",
  title: "Explore the queue in your system",
  reading: "/chapters/benchmarking/#check-measurements-against-a-model",
  conceptIds: ["little-law", "queue", "measurement-boundary"],
  phases: [
    {
      id: "predict",
      prompt:
        "Before changing a control, what do you expect to happen to unfinished work? An uncertainty is enough to start.",
    },
    {
      id: "experiment",
      prompt:
        "Change one queue control above. Compare the actual result with your prediction.",
    },
    {
      id: "reflect",
      prompt:
        "What would you check before applying this relationship to your own system?",
    },
  ],
  guidance:
    "Adapt the explanation and one next experiment to the student's system, prediction and supplied observation. Cite the source. Keep the supplied units and model assumptions; label any adapted example. The student operates the controls. Offer one useful next step, not a complete lesson. A browser snapshot is an illustration, not a production measurement. Respect requests for a direct explanation without requiring a prediction. Do not infer later control changes or notebook access.",
  observation: {
    kind: "browser-queue-snapshot",
    fields: ["arrival", "time", "observed", "expected", "gap", "observedAt"],
    units: {
      arrival: "events/s",
      time: "s",
      observed: "events",
      expected: "events",
      gap: "events",
    },
    authority:
      "The active browser supplies displayed values on explicit send and can service queue observations during that reply. Public MCP supplies this contract, never a live snapshot.",
  },
} as const;

export type InvestigationPhase =
  (typeof queueInvestigation.phases)[number]["id"];
export interface QueueObservation {
  kind: "browser-queue-snapshot";
  observedAt: string;
  arrival: number;
  time: number;
  observed: number;
  expected: number;
  gap: number;
}
export interface InvestigationTurn {
  activityId: typeof queueInvestigation.id;
  version: 1;
  phase: InvestigationPhase;
  system: string;
  prediction: string;
  observation?: QueueObservation;
}

/** Validate at the companion boundary; observations are browser reports, not attested measurements. */
export function parseInvestigationTurn(
  input: unknown,
  source: LearningSource,
): InvestigationTurn {
  const value = learningObject(input);
  learningAssert(
    value.activityId === queueInvestigation.id && value.version === 1,
    "Unknown reading activity version.",
  );
  learningAssert(
    source.kind === "demo" &&
      source.anchor === queueInvestigation.demoId &&
      source.conceptIds.includes("little-law"),
    "This activity needs the queue lab source.",
  );
  learningAssert(
    queueInvestigation.phases.some(({ id }) => id === value.phase),
    "Choose an activity phase.",
  );
  const result: InvestigationTurn = {
    activityId: queueInvestigation.id,
    version: 1,
    phase: value.phase as InvestigationPhase,
    system: learningText(value.system ?? "", "Your system", 1000),
    prediction: learningText(value.prediction ?? "", "Your prediction", 2000),
  };
  if (value.observation !== undefined) {
    const observation = learningObject(value.observation);
    learningAssert(
      observation.kind === "browser-queue-snapshot" &&
        typeof observation.observedAt === "string" &&
        Number.isFinite(Date.parse(observation.observedAt)) &&
        observation.observedAt.length <= 40,
      "Use a dated browser observation.",
    );
    for (const [key, min, max] of [
      ["arrival", 2, 40],
      ["time", 0.1, 2],
      ["observed", 1, 40],
      ["expected", 0.2, 80],
      ["gap", -79, 39.8],
    ] as const)
      learningAssert(
        typeof observation[key] === "number" &&
          Number.isFinite(observation[key]) &&
          observation[key] >= min &&
          observation[key] <= max,
        "Use the queue's declared numeric bounds.",
      );
    const snapshot = observation as unknown as QueueObservation;
    learningAssert(
      Math.abs(snapshot.expected - snapshot.arrival * snapshot.time) < 0.051 &&
        Math.abs(snapshot.gap - (snapshot.observed - snapshot.expected)) <
          0.051,
      "The displayed queue values are inconsistent. Observe again.",
    );
    result.observation = {
      kind: "browser-queue-snapshot",
      observedAt: snapshot.observedAt,
      arrival: snapshot.arrival,
      time: snapshot.time,
      observed: snapshot.observed,
      expected: snapshot.expected,
      gap: snapshot.gap,
    };
  }
  return result;
}
