// Canonical exercise text and deterministic checks, shared by browser and server.
// Increment version when a question or its accepted answer changes.
export type ExerciseField = {
  id: string;
  label: string;
  kind: "number" | "choice";
  options?: { value: string; label: string }[];
  correct: string;
  explanation: string;
};
export type Exercise = {
  version: number;
  demo?: { id: string; label: string };
  title: string;
  prompt: string;
  discussion: string;
  fields: ExerciseField[];
};
export const exercises: Record<string, Exercise> = {
  "measurement-transfer": {
    version: 1,
    title: "Follow work from events to review",
    prompt:
      "A stable event pipeline completes 20 events/s with average end-to-end time 0.5 s. A stable development workflow accepts four changes/hour with average time from submission to acceptance of three hours. Both times include waiting inside their respective boundaries. Calculate the average work in progress implied by Little's Law for each. Then suppose submissions rise to six changes/hour while acceptance stays at four, with no discarded changes. Can the earlier steady-state calculation describe this growing backlog indefinitely?",
    discussion:
      "The event calculation is 20 × 0.5 = 10 events. The development calculation is 4 × 3 = 12 changes. The same relationship applies to different work when boundaries, windows, and units agree. After the increase, unfinished changes accumulate at two/hour, so the earlier stable calculation cannot describe the backlog indefinitely. Check arrival/completion balance and waiting time again. Neither calculation identifies the cause of delay or proves the waiting time is acceptable.",
    fields: [
      {
        id: "events",
        label: "Average event work in progress (events)",
        kind: "number",
        correct: "10",
        explanation: "20 events/s × 0.5 s = 10 events inside the boundary.",
      },
      {
        id: "changes",
        label: "Average development work in progress (changes)",
        kind: "number",
        correct: "12",
        explanation:
          "4 changes/hour × 3 hours = 12 changes, including waiting and processing.",
      },
      {
        id: "balance",
        label:
          "Does the earlier stable calculation still describe the growing backlog?",
        kind: "choice",
        correct: "no",
        options: [
          { value: "yes", label: "Yes: acceptance is still four/hour" },
          {
            value: "no",
            label: "No: submissions and acceptance no longer balance",
          },
          {
            value: "capacity",
            label: "Yes: more submissions increase review capacity",
          },
        ],
        explanation:
          "Six submissions minus four accepted changes add two unfinished changes/hour. Recheck stability before using the earlier average time.",
      },
    ],
  },
  "scaling-model-choice": {
    version: 1,
    title: "Choose the question before the equation",
    prompt:
      "You have two questions. First, a stable event pipeline completes 40 events/s with average time 0.25 s inside one declared boundary: what average work in progress is consistent with those observations? Second, a fixed development task has an 80% parallelizable share and a 20% sequential share: what is the ideal speedup with four workers and no added coordination cost? Choose a law for each question, then calculate its result.",
    discussion:
      "Little's Law answers the flow-consistency question: 40 × 0.25 = 10 events. Amdahl's Law answers the fixed-workload speedup question: 1 / (0.2 + 0.8/4) = 2.5. Matching averages do not identify a bottleneck or prove acceptable latency. Ideal speedup does not guarantee accepted-change throughput: integration overhead, variable tasks, and correctness can change the result. Explain which measurement or assumption you would check before recommending more workers.",
    fields: [
      {
        id: "flow",
        label: "Which law answers the event work-in-progress question?",
        kind: "choice",
        correct: "little",
        options: [
          { value: "little", label: "Little's Law" },
          { value: "amdahl", label: "Amdahl's Law" },
        ],
        explanation:
          "Little's Law relates average work in progress, completion rate, and average time at one stable boundary.",
      },
      {
        id: "wip",
        label: "Calculated average work in progress (events)",
        kind: "number",
        correct: "10",
        explanation: "40 events/s × 0.25 s = 10 events.",
      },
      {
        id: "parallel",
        label: "Which law answers the ideal parallel-speedup question?",
        kind: "choice",
        correct: "amdahl",
        options: [
          { value: "little", label: "Little's Law" },
          { value: "amdahl", label: "Amdahl's Law" },
        ],
        explanation:
          "Amdahl's Law bounds ideal speedup with a fixed workload and sequential fraction.",
      },
      {
        id: "speedup",
        label: "Ideal speedup with four workers (times baseline)",
        kind: "number",
        correct: "2.5",
        explanation:
          "1 / (0.2 + 0.8/4) = 1 / 0.4 = 2.5. Actual coordination costs can reduce the gain.",
      },
    ],
  },
  "measurement-prediction": {
    demo: { id: "demo-tail-latency-simulator", label: "Benchmark" },
    version: 2,
    title: "Calculate the average and the tail",
    prompt:
      "A fixed sample contains 20 requests: 18 take 40 ms each and two take 240 ms each. Use the nearest-rank percentile: sort the values, then take rank ceil(0.95 × 20). The objective requires latency strictly below 120 ms. Calculate the mean and p95, then choose which meet the objective. This sample is separate from the adjustable simulation in Explore.",
    discussion:
      "The total is 18 × 40 + 2 × 240 = 1200 ms, so the mean is 60 ms. Rank 19 is 240 ms. The average meets the objective while p95 does not; an average can conceal a slow minority.",
    fields: [
      {
        id: "mean",
        label: "Mean latency (ms)",
        kind: "number",
        correct: "60",
        explanation: "Divide the total of 1200 ms by 20 requests: 60 ms.",
      },
      {
        id: "p95",
        label: "p95 latency (ms)",
        kind: "number",
        correct: "240",
        explanation:
          "The nearest rank is 19. Requests 19 and 20 in the sorted sample take 240 ms.",
      },
      {
        id: "objective",
        label: "Which measurements meet the objective?",
        kind: "choice",
        correct: "mean-only",
        options: [
          { value: "both", label: "Both mean and p95" },
          { value: "mean-only", label: "Mean only" },
          { value: "neither", label: "Neither" },
        ],
        explanation:
          "60 < 120, but 240 is not below 120. Only the mean passes.",
      },
    ],
  },
  "measurement-boundary": {
    version: 2,
    title: "Check whether the averages agree",
    prompt:
      "At one declared boundary you observe L = 25 operations, λ = 40 operations/s, and W = 0.25 s. Calculate λW, then select the conclusion supported by these three values alone.",
    discussion:
      "λW is 10, not 25. Check compatible boundaries, observation windows, units, omitted waiting, and whether arrivals and completions balance. The discrepancy alone does not locate a bottleneck or show that adding workers will help.",
    fields: [
      {
        id: "expected",
        label: "Calculated work in progress (operations)",
        kind: "number",
        correct: "10",
        explanation: "40 operations/s × 0.25 s = 10 operations.",
      },
      {
        id: "conclusion",
        label: "What follows from the mismatch?",
        kind: "choice",
        correct: "check",
        options: [
          {
            value: "database",
            label: "The database bottleneck is proven",
          },
          { value: "workers", label: "More workers must resolve it" },
          {
            value: "check",
            label: "Check boundaries and window",
          },
        ],
        explanation:
          "The mismatch warrants a consistency check. These numbers do not isolate a cause.",
      },
    ],
  },
  "measurement-experiment": {
    version: 2,
    title: "Choose a valid comparison",
    prompt:
      "You want to test whether batching improves useful write throughput while keeping p95 end-to-end latency below 100 ms and errors at or below 0.1%. Select the comparison that isolates batching. Then evaluate a run with higher throughput, p95 = 90 ms, and errors = 0.8% against those declared criteria.",
    discussion:
      "Keep the workload, dataset, environment, and acceptance criteria comparable while changing batching. A run with p95 = 90 ms passes the latency bound, but 0.8% errors violates the 0.1% error bound. Higher throughput does not compensate for failing a declared acceptance criterion.",
    fields: [
      {
        id: "comparison",
        label: "Which before-and-after comparison isolates batching?",
        kind: "choice",
        correct: "controlled",
        options: [
          {
            value: "controlled",
            label: "Change batching only",
          },
          {
            value: "hardware",
            label: "Change batching and hardware",
          },
          {
            value: "load",
            label: "Change batching and offered load",
          },
        ],
        explanation:
          "Changing hardware or load as well introduces another explanation for the result.",
      },
      {
        id: "verdict",
        label: "Does the reported run meet every declared criterion?",
        kind: "choice",
        correct: "reject",
        options: [
          {
            value: "accept",
            label: "Yes: throughput and latency pass",
          },
          { value: "reject", label: "No: errors exceed 0.1%" },
        ],
        explanation:
          "0.8% is greater than 0.1%, so this run fails the declared error criterion.",
      },
    ],
  },
  "scalability-contract": {
    version: 1,
    title: "Check a scaling contract",
    prompt:
      "A service must handle 200 requests/s while keeping p95 below 150 ms and errors at or below 1%. A run handles 220 requests/s with p95 = 180 ms and errors = 0.5%. Check the run against this contract.",
    discussion:
      "Throughput and errors pass, but latency fails. Handling more requests is insufficient when the declared quality bound is violated.",
    fields: [
      {
        id: "failed",
        label: "Which criterion fails?",
        kind: "choice",
        correct: "latency",
        options: [
          {
            value: "throughput",
            label: "Throughput",
          },
          {
            value: "latency",
            label: "p95 latency",
          },
          {
            value: "errors",
            label: "Error rate",
          },
        ],
        explanation: "180 ms is not below 150 ms.",
      },
      {
        id: "verdict",
        label: "Does the run meet the whole contract?",
        kind: "choice",
        correct: "no",
        options: [
          {
            value: "yes",
            label: "Yes",
          },
          {
            value: "no",
            label: "No",
          },
        ],
        explanation: "All three criteria must pass.",
      },
    ],
  },
  "development-gates": {
    version: 1,
    title: "Follow the release gates",
    prompt:
      "In this delivery statechart, release readiness requires both passing checks and an approved review. Checks have passed, but review has not started. Select the missing gate and the destination of REQUEST_CHANGES during review.",
    discussion:
      "Passing checks alone does not complete the parallel verification state. Review must also approve. REQUEST_CHANGES returns the patch to implementation.",
    fields: [
      {
        id: "gate",
        label: "What is still required?",
        kind: "choice",
        correct: "review",
        options: [
          {
            value: "release",
            label: "Release immediately",
          },
          {
            value: "review",
            label: "Approved review",
          },
          {
            value: "plan",
            label: "A second plan approval",
          },
        ],
        explanation:
          "Both verification regions must finish before the patch is ready.",
      },
      {
        id: "destination",
        label: "Where does REQUEST_CHANGES lead?",
        kind: "choice",
        correct: "implementing",
        options: [
          {
            value: "released",
            label: "Released",
          },
          {
            value: "implementing",
            label: "Implementing",
          },
          {
            value: "ready",
            label: "Ready",
          },
        ],
        explanation:
          "The transition returns to implementation so the patch can be revised.",
      },
    ],
    demo: {
      id: "demo-deterministic-boundary-lab",
      label: "Delivery gates",
    },
  },
  "architecture-outcome": {
    version: 1,
    title: "Separate response from outcome",
    prompt:
      "An API commits an event to storage, then the network loses its response. The browser times out. Use only these stated facts to classify the outcome.",
    discussion:
      "The storage commit happened even though the browser received no confirmation. A timeout describes what the caller observed; it does not undo or disprove the commit.",
    fields: [
      {
        id: "stored",
        label: "Was the event stored?",
        kind: "choice",
        correct: "yes",
        options: [
          {
            value: "yes",
            label: "Yes",
          },
          {
            value: "no",
            label: "No",
          },
          {
            value: "unknown",
            label: "Not specified",
          },
        ],
        explanation:
          "The scenario explicitly states that storage committed the event.",
      },
      {
        id: "timeout",
        label: "What does the timeout establish?",
        kind: "choice",
        correct: "response",
        options: [
          {
            value: "response",
            label: "No timely response reached the browser",
          },
          {
            value: "rollback",
            label: "Storage rolled back the event",
          },
          {
            value: "rejection",
            label: "The API rejected the request",
          },
        ],
        explanation:
          "The response was lost after the commit; neither rollback nor rejection follows.",
      },
    ],
    demo: {
      id: "demo-boundary-trace",
      label: "Request boundaries",
    },
  },
  "friction-cycle": {
    version: 1,
    title: "Calculate the whole change cycle",
    prompt:
      "A change passes through four sequential stages with no overlap: clarification 10 minutes, editing 10, checks 15, and review 25. A tool halves editing time; every other stage stays unchanged. Calculate the new total and the time saved.",
    discussion:
      "The original cycle takes 60 minutes. Editing falls from 10 to 5 minutes, so the new cycle takes 55 minutes and saves 5 minutes. A local speedup affects only its share of the full cycle.",
    fields: [
      {
        id: "total",
        label: "New cycle time (minutes)",
        kind: "number",
        correct: "55",
        explanation: "10 + 5 + 15 + 25 = 55 minutes.",
      },
      {
        id: "saved",
        label: "Time saved (minutes)",
        kind: "number",
        correct: "5",
        explanation: "60 − 55 = 5 minutes.",
      },
    ],
    demo: {
      id: "demo-friction-audit",
      label: "Observed change effort",
    },
  },
  "pressure-retries": {
    version: 2,
    title: "The status is unchanged. Is the operation idempotent?",
    prompt:
      "Before choosing, predict whether an unchanged final status is enough to make an operation idempotent. Write a brief reason naming the effects you would inspect.\n\nA work item starts in progress with no completion activity event. Its completion contract promises to set the status to Done and record exactly one activity event for that transition. The first attempt commits both, but its response is lost. A retry on another instance leaves the status at Done and appends a second completion activity event. Both commits are durable, and there is no deduplication.\n\nCount the stored completion activity events, assess the whole operation against its contract, and select the mechanism that would prevent the duplicate event for retries of this logical command.",
    discussion:
      "There are two completion activity events. The status assignment is idempotent in isolation, but the whole operation is not: its promised effect includes exactly one activity event for the transition. Idempotency is this property of the intended effect, rather than the name of a retry mechanism. One implementation reuses a stable command key and atomically enforces that key while recording the state change, activity event, and reusable result in authoritative storage. A retry then returns the recorded outcome without appending another event. A per-instance cache cannot coordinate retries routed elsewhere, and a longer timeout cannot guarantee that a response arrives. The caller's uncertainty does not change the stored facts given in this scenario. Explain why a transaction that commits both writes together still needs a rule for repeated commands.",
    fields: [
      {
        id: "effects",
        label: "Stored completion activity events after both commits",
        kind: "number",
        correct: "2",
        explanation:
          "The first attempt records one completion activity event and the retry records another: two events remain in the history.",
      },
      {
        id: "idempotent",
        label: "Is the whole operation idempotent under this contract?",
        kind: "choice",
        correct: "no",
        options: [
          { value: "yes", label: "Yes: the status is unchanged" },
          { value: "no", label: "No: the activity was duplicated" },
          { value: "unknown", label: "Unknown: the caller saw a timeout" },
        ],
        explanation:
          "The contract promises one activity event as well as the Done status. The duplicate domain activity event violates that promise even though the status is unchanged.",
      },
      {
        id: "mechanism",
        label: "Which mechanism prevents the duplicate event?",
        kind: "choice",
        correct: "atomic",
        options: [
          {
            value: "memory",
            label: "Cache responses in each instance",
          },
          {
            value: "atomic",
            label: "Enforce a shared key atomically",
          },
          {
            value: "timeout",
            label: "Increase the browser timeout",
          },
        ],
        explanation:
          "Reuse a stable command key and atomically enforce it with the state change, activity event, and reusable result at their shared authority.",
      },
    ],
    demo: {
      id: "demo-changed-assumptions-map",
      label: "Retry effects",
    },
  },
  "fleets-amdahl": {
    version: 2,
    title: "Does a faster feature mean more accepted work?",
    prompt:
      "Before calculating, predict whether doubling a fleet from four to eight agents will double accepted output, and explain your prediction.\n\nEach feature needs 80 minutes of implementation with one agent and 20 minutes of review by one person. The agents work together on one feature, divide implementation time perfectly, and start the next feature as soon as implementation ends. Review of earlier features can overlap that implementation. Assume no coordination cost, continuous work, every feature passes review, and no withdrawal.\n\nCalculate completion time for an isolated feature with no queue ahead, then production and review rates for the eight-agent fleet. Use ongoing rates, not counts in the first clock hour. Finally, calculate unfinished-work growth and assess the effect of doubling the fleet.",
    discussion:
      "With four agents, an isolated feature takes 80/4 + 20 = 40 minutes; with eight, it takes 80/8 + 20 = 30 minutes. These correspond to ideal Amdahl speedups of 100/40 = 2.5 and 100/30 ≈ 3.33 for the fixed task. During continuous work, four agents finish implementation every 20 minutes, producing three candidates/hour; eight finish every 10 minutes, producing six. One reviewer can accept at most 60/20 = three features/hour. With eight agents, unfinished work therefore grows by 6 − 3 = three features/hour. Doubling the fleet finishes an isolated feature sooner but leaves accepted throughput unchanged. Later features wait longer as the review backlog grows, so 30 minutes does not describe every feature in that stream. Explain which assumption you would investigate before recommending more agents, and what evidence would justify changing review capacity or admission.",
    fields: [
      {
        id: "four-time",
        label: "Isolated feature completion with four agents (minutes)",
        kind: "number",
        correct: "40",
        explanation: "80/4 + 20 = 40 minutes, including review.",
      },
      {
        id: "eight-time",
        label: "Isolated feature completion with eight agents (minutes)",
        kind: "number",
        correct: "30",
        explanation:
          "80/8 + 20 = 30 minutes when no earlier work is waiting for review.",
      },
      {
        id: "candidates",
        label: "Eight-agent candidate production rate (features/hour)",
        kind: "number",
        correct: "6",
        explanation:
          "Implementation takes 80/8 = 10 minutes, so the fleet can produce 60/10 = six candidates/hour while review overlaps.",
      },
      {
        id: "accepted",
        label: "Maximum accepted throughput with eight agents (features/hour)",
        kind: "number",
        correct: "3",
        explanation:
          "One reviewer takes 20 minutes per feature and can accept 60/20 = three/hour. Candidate production exceeds that limit.",
      },
      {
        id: "backlog",
        label: "Eight-agent unfinished-work growth (features/hour)",
        kind: "number",
        correct: "3",
        explanation:
          "Six candidates minus three accepted features add three unfinished features/hour, with no rejection or withdrawal.",
      },
      {
        id: "claim",
        label: "What changes when four agents become eight?",
        kind: "choice",
        correct: "faster-only",
        options: [
          {
            value: "both-double",
            label: "Faster task; twice the accepted rate",
          },
          {
            value: "faster-only",
            label: "Faster task; same accepted rate",
          },
          {
            value: "neither",
            label: "No change to either measure",
          },
        ],
        explanation:
          "The isolated feature takes less time, but both fleets are limited to three accepted features/hour by the same reviewer.",
      },
    ],
    demo: {
      id: "demo-sequential-work-bound",
      label: "Parallel speedup",
    },
  },
  "scaling-bottleneck": {
    version: 1,
    title: "Locate the next capacity limit",
    prompt:
      "Each request visits every stage once. Capacities are API 180, database 110, workers 150, and downstream 130 requests/s. Offered load is 150 requests/s, with no retries. Use the smallest stage capacity as the throughput ceiling. Then raise database capacity to 150 requests/s, leaving all other capacities unchanged.",
    discussion:
      "Initially the database limits throughput to 110 requests/s. Increasing its capacity moves the limit to the downstream stage at 130 requests/s. Offered load still exceeds capacity by 20 requests/s.",
    fields: [
      {
        id: "before",
        label: "Original throughput ceiling (requests/s)",
        kind: "number",
        correct: "110",
        explanation: "The smallest of 180, 110, 150, and 130 is 110.",
      },
      {
        id: "after",
        label: "New throughput ceiling (requests/s)",
        kind: "number",
        correct: "130",
        explanation:
          "After the change, the smallest capacity is downstream at 130.",
      },
      {
        id: "excess",
        label: "Offered load above the new ceiling (requests/s)",
        kind: "number",
        correct: "20",
        explanation: "150 − 130 = 20 requests/s above the new ceiling.",
      },
    ],
    demo: {
      id: "demo-saturation-boundary-lab",
      label: "Capacity limits",
    },
  },
  "judgment-evidence": {
    version: 1,
    title: "Classify evidence and next steps",
    prompt:
      "Use observation for a reported measurement, inference for an explanation drawn from evidence, and proposal for an action to try. Classify each statement by its role; you are not being asked whether the explanation is true.",
    discussion:
      "Measurements describe what was recorded. A causal explanation goes beyond that observation. A proposed experiment states what to do next and can test the explanation.",
    fields: [
      {
        id: "measured",
        label: "“Recorded p95 rose from 80 to 140 ms.”",
        kind: "choice",
        correct: "observation",
        options: [
          {
            value: "observation",
            label: "Observation",
          },
          {
            value: "inference",
            label: "Inference",
          },
          {
            value: "proposal",
            label: "Proposal",
          },
        ],
        explanation: "This reports a measurement.",
      },
      {
        id: "cause",
        label: "“Connection contention likely caused the rise.”",
        kind: "choice",
        correct: "inference",
        options: [
          {
            value: "observation",
            label: "Observation",
          },
          {
            value: "inference",
            label: "Inference",
          },
          {
            value: "proposal",
            label: "Proposal",
          },
        ],
        explanation: "This proposes an explanation for the measurement.",
      },
      {
        id: "next",
        label: "“Repeat the run with a larger connection pool.”",
        kind: "choice",
        correct: "proposal",
        options: [
          {
            value: "observation",
            label: "Observation",
          },
          {
            value: "inference",
            label: "Inference",
          },
          {
            value: "proposal",
            label: "Proposal",
          },
        ],
        explanation: "This states an action to try next.",
      },
    ],
  },
};
export type ExerciseId = keyof typeof exercises;
export function isExerciseId(id: string): boolean {
  return Object.hasOwn(exercises, id);
}
export type ExerciseResponse = Record<string, string>;
export function parseExerciseResponse(
  id: string,
  serialized: string,
): ExerciseResponse | null {
  const definition = exercises[id];
  if (!definition) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const response = value as Record<string, unknown>;
    if (Object.keys(response).length !== definition.fields.length) return null;
    for (const field of definition.fields) {
      const v = response[field.id];
      if (typeof v !== "string" || v.length > 80 || !v.trim()) return null;
      if (
        field.kind === "number" &&
        (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()) ||
          !Number.isFinite(Number(v)))
      )
        return null;
      if (field.kind === "choice" && !field.options?.some((o) => o.value === v))
        return null;
    }
    return response as ExerciseResponse;
  } catch {
    return null;
  }
}
export function checkExercise(id: string, response: ExerciseResponse) {
  const fields = exercises[id]!.fields.map((field) => ({
    id: field.id,
    correct:
      field.kind === "number"
        ? Number(response[field.id]) === Number(field.correct)
        : response[field.id] === field.correct,
    explanation: field.explanation,
  }));
  return { correct: fields.every((f) => f.correct), fields };
}

export type SavedAnswer = {
  version: number;
  answer: string;
  completed: boolean;
  revision: string;
  updatedAt: string;
  prompt: string;
};

export function safeReturnTo(value: string | null): string {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  const url = new URL(value, "https://book.invalid");
  return url.origin === "https://book.invalid"
    ? url.pathname + url.search + url.hash
    : "/";
}
