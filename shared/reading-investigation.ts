import {
  learningAssert,
  learningObject,
  learningList,
  learningText,
  type LearningSource,
} from "./learning-workspace.ts";
import { demoResources } from "./learning-resources.ts";

/** Authored activity semantics; rendering, browser state and providers are adapters. */
export const queueInvestigation = {
  id: "queue-balance",
  version: 2,
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
export interface ReadingActivity {
  id: string;
  version: number;
  demoId?: string;
  title: string;
  reading: string;
  conceptIds: readonly string[];
  phases: readonly { id: InvestigationPhase; prompt: string }[];
  guidance: string;
  observation: {
    kind: string;
    fields: readonly string[];
    units?: Record<string, string>;
    authority: string;
  };
}

/** The same loop works for a passage, a project decision, an attempt or selected peer context. */
export const learningLoop: ReadingActivity = {
  id: "learning-loop",
  version: 1,
  title: "Make sense of this idea",
  reading: "",
  conceptIds: [],
  phases: [
    {
      id: "predict",
      prompt:
        "What do you think so far? Start with an explanation, a prediction or an uncertainty.",
    },
    {
      id: "experiment",
      prompt:
        "Try one check: revisit the passage, compare a case or test an assumption. What did you find, and where does that evidence come from?",
    },
    {
      id: "reflect",
      prompt:
        "What can you explain now? What remains uncertain, and what will you check next?",
    },
  ],
  guidance:
    "Adapt one explanation and one next check to the selected source, student's initial thinking and evidence. Cite the source. Distinguish authored claims, student reports, direct browser observations and hypothetical examples. Respect direct explanation requests. Support reflection in the student's own words and a next independent check without judging mastery, grading work or submitting anything. Only deliberately supplied context is available; no other notebook, peer or course records are implied.",
  observation: {
    kind: "student-report",
    fields: ["evidence", "nextCheck"],
    authority:
      "The student describes a check and its evidence. This is a report, not proof of execution. Public MCP supplies the authored loop, never private learning state.",
  },
};
export const readingActivities: ReadingActivity[] = [
  learningLoop,
  queueInvestigation,
  ...demoResources
    .filter(({ id }) => id !== queueInvestigation.demoId)
    .map(
      (demo): ReadingActivity => ({
        id: `investigate-${demo.id}`,
        version: demo.activityVersion ?? 1,
        demoId: demo.id,
        title: demo.title,
        reading: demo.url,
        conceptIds: demo.conceptIds,
        phases: [
          { id: "predict", prompt: demo.experiment!.predict },
          {
            id: "experiment",
            prompt: `${demo.experiment!.try} ${demo.experiment!.observe}`,
          },
          { id: "reflect", prompt: demo.experiment!.reflect },
        ],
        guidance: `${learningLoop.guidance} The student operates the demo controls. Treat the actual controls and displayed text as a bounded browser snapshot; do not infer canvas pixels, hidden results or later changes. Preserve these authored assumptions: ${demo.assumptions}`,
        observation: {
          kind: "browser-demo-snapshot",
          fields: ["demoId", "observedAt", "controls", "visibleText"],
          authority:
            "The active browser supplies this demo's actual visible controls and text on explicit send and can service observations during that reply. Canvas pixels are excluded. A snapshot is not project evidence. Public MCP publishes the contract without live state or execution.",
        },
      }),
    ),
];
export const activityById = (id: string) =>
  readingActivities.find((activity) => activity.id === id);
export const activityForSource = (source: LearningSource) =>
  (source.kind === "demo" &&
  !source.excerpt.includes("Independent application:")
    ? readingActivities.find(({ demoId }) => demoId === source.anchor)
    : undefined) ?? learningLoop;

export interface DemoObservation {
  kind: "browser-demo-snapshot";
  demoId: string;
  observedAt: string;
  controls: { label: string; type: string; value: string | boolean | number }[];
  visibleText: string;
}
export type InvestigationObservation = QueueObservation | DemoObservation;
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
  activityId: string;
  version: number;
  phase: InvestigationPhase;
  system: string;
  prediction: string;
  evidence?: string;
  nextCheck?: string;
  observation?: InvestigationObservation;
}

/** Validate at the companion boundary; observations are browser reports, not attested measurements. */
export function parseInvestigationTurn(
  input: unknown,
  source: LearningSource,
): InvestigationTurn {
  const value = learningObject(input);
  const activity = activityById(String(value.activityId));
  learningAssert(
    activity && value.version === activity.version,
    "Unknown reading activity version.",
  );
  learningAssert(
    !activity.demoId ||
      (source.kind === "demo" &&
        source.anchor === activity.demoId &&
        activity.conceptIds.every((id) => source.conceptIds.includes(id))),
    "This activity needs its declared demo source and concepts.",
  );
  learningAssert(
    queueInvestigation.phases.some(({ id }) => id === value.phase),
    "Choose an activity phase.",
  );
  const result: InvestigationTurn = {
    activityId: activity.id,
    version: activity.version,
    phase: value.phase as InvestigationPhase,
    system: learningText(value.system ?? "", "Your system", 1000),
    prediction: learningText(value.prediction ?? "", "Your prediction", 2000),
  };
  if (value.evidence !== undefined)
    result.evidence = learningText(value.evidence, "Your evidence", 4000);
  if (value.nextCheck !== undefined)
    result.nextCheck = learningText(value.nextCheck, "Your next check", 2000);
  if (value.observation !== undefined) {
    const observation = learningObject(value.observation);
    learningAssert(
      activity.demoId &&
        observation.kind === activity.observation.kind &&
        typeof observation.observedAt === "string" &&
        Number.isFinite(Date.parse(observation.observedAt)) &&
        observation.observedAt.length <= 40,
      "Use a dated browser observation.",
    );
    if (observation.kind === "browser-demo-snapshot") {
      learningAssert(
        observation.demoId === activity.demoId,
        "Observe only the selected demo.",
      );
      result.observation = {
        kind: "browser-demo-snapshot",
        demoId: activity.demoId,
        observedAt: observation.observedAt as string,
        controls: learningList(observation.controls, 60).map((input) => {
          const control = learningObject(input);
          learningAssert(
            typeof control.value === "boolean" ||
              (typeof control.value === "number" &&
                Number.isFinite(control.value)) ||
              (typeof control.value === "string" &&
                control.value.length <= 1024),
            "Use a bounded control value.",
          );
          return {
            label: learningText(control.label, "Control label", 300),
            type: learningText(control.type, "Control type", 30, true),
            value: control.value as string | boolean | number,
          };
        }),
        visibleText: learningText(
          observation.visibleText,
          "Displayed demo text",
          8000,
        ),
      };
      return result;
    }
    for (const [key, min, max] of [
      ["arrival", 2, 40],
      ["time", 0.1, 2],
      ["observed", 0, 80],
      ["expected", 0.2, 80],
      ["gap", -80, 79.8],
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
