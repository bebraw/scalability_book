import { concepts } from "./concepts.ts";
import { conceptRelationships } from "./concept-relationships.ts";
import { neighborhood } from "./concept-graph.ts";
import { demoCatalog } from "./demo-catalog.ts";

export type LearningResource = {
  id: string;
  kind: "graphic" | "demo";
  title: string;
  conceptIds: string[];
  url: string;
  caption: string;
  assumptions: string;
  images: { png: string; svg?: string; alt: string };
  controls?: string[];
  activityVersion?: number;
  experiment?: {
    predict: string;
    try: string;
    observe: string;
    reflect: string;
  };
};

export const demoId = (title: string) =>
  `demo-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
const imagePaths = (id: string, alt: string) => ({
  svg: `/concepts/visuals/${id}.svg`,
  png: `/concepts/visuals/${id}.png`,
  alt,
});
const graphAssumptions =
  "Authored teaching connections, not an exhaustive model. Read directed edges as source → label → target; direction alone does not establish causation or a prerequisite. Consult each connection's explanation in the graph data.";

export const graphResources: LearningResource[] = [
  {
    id: "graph-complete",
    kind: "graphic",
    title: "The complete concept graph",
    conceptIds: concepts.map(({ id }) => id),
    url: "/concepts/?view=all",
    caption:
      "All concepts and authored connections in the book, with relationship labels and directional arrows.",
    assumptions: graphAssumptions,
    images: imagePaths(
      "graph-complete",
      "The complete labelled concept graph. See graph.json or graph.md for the same connections as text.",
    ),
  },
  ...concepts.map(
    (concept): LearningResource => ({
      id: `graph-${concept.id}`,
      kind: "graphic",
      title: `${concept.title}: connections`,
      // Membership refers to the focal idea; neighboring IDs are in the graph data.
      conceptIds: [concept.id],
      url: `/concepts/?topic=${concept.id}`,
      caption: `${concept.title} and its ${neighborhood(concept.id, conceptRelationships).size - 1} neighboring concepts. Labels state the authored relationships.`,
      assumptions: graphAssumptions,
      images: imagePaths(
        `graph-${concept.id}`,
        `Labelled connections around ${concept.title}. Read their explanations in the concept graph data.`,
      ),
    }),
  ),
];

const figures = [
  {
    id: "course-progression",
    title: "One application, three development systems",
    conceptIds: [
      "agent",
      "agent-fleet",
      "benchmark",
      "trade-off",
      "acceptance-criteria",
    ],
    url: "/chapters/introduction/#course-progression-caption",
    caption:
      "The task stays comparatively stable while the development system changes. Learning accumulates; application code does not.",
    assumptions:
      "The course uses three fresh implementations of a shared specification. Domain knowledge and evidence carry forward; application code and implementation-specific tests do not.",
  },
  {
    id: "pressure-evidence",
    title: "From pressure to bounded evidence",
    conceptIds: [
      "scalability",
      "pressure",
      "saturation",
      "trade-off",
      "benchmark",
      "measurement-boundary",
    ],
    url: "/chapters/what-is-scalability/#figure-pressure-evidence",
    caption:
      "A scaling response remains a hypothesis until bounded evidence challenges the maintained goal, limit, and trade-off.",
    assumptions:
      "A named workload, maintained goal, measurement boundary, and conditions are needed to assess the response.",
  },
  {
    id: "dependency-failure",
    title: "An external quota becomes the availability boundary",
    conceptIds: [
      "saturation",
      "reliability",
      "cache",
      "contract",
      "pressure",
      "recovery",
    ],
    url: "/chapters/reality/#figure-dependency-failure",
    caption:
      "Production traffic was amplified into GitHub API traffic until one external quota became the availability boundary for the whole site.",
    assumptions:
      "This is the book's specific dependency-failure example. Its chain does not establish that all dependencies fail in the same way.",
  },
  {
    id: "shared-knowledge-boundary",
    title: "Knowledge and artifact ownership",
    conceptIds: [
      "contract",
      "authority",
      "harness",
      "decision-reversibility",
      "technical-debt",
    ],
    url: "/case-studies/kirjolab/#figure-shared-knowledge-boundary",
    caption:
      "Reusable source knowledge stays external; Slideotter and Kirjolab own their artifact-specific decisions.",
    assumptions:
      "Ownership boundaries describe these two products. Evaluate whether the same split fits another system rather than copying it automatically.",
  },
  {
    id: "three-connected-loops",
    title: "Three connected scalability loops",
    conceptIds: [
      "scalability",
      "loop-engineering",
      "pressure",
      "agent",
      "queue",
      "feedback-loop",
      "review-budget",
      "throughput",
    ],
    url: "/chapters/recap/#figure-three-connected-loops",
    caption:
      "Pressure becomes development work; accepted agent-assisted change alters the application and its next likely limit.",
    assumptions:
      "Application, development, and agentic work have distinct completion boundaries. Candidate output is not automatically accepted change.",
  },
];
export const bookGraphicResources: LearningResource[] = figures.map(
  (figure) => ({
    ...figure,
    kind: "graphic",
    images: imagePaths(figure.id, figure.caption),
  }),
);

type Activity = {
  activityVersion?: number;
  conceptIds: string[];
  caption: string;
  controls: string[];
  assumptions: string;
  predict: string;
  try: string;
  observe: string;
};

// Curated activities describe the actual gallery controls. They deliberately
// withhold a model answer so the learner can predict before operating the demo.
const activities: Record<string, Activity> = {
  "Implementation discovery lab": {
    conceptIds: [
      "contract",
      "trade-off",
      "change-probe",
      "reproducible-environment",
    ],
    caption:
      "Choose a product interpretation and implementation hypothesis while keeping the common behavior visible.",
    controls: [
      "Product interpretation",
      "Stack and persistence",
      "Run environment",
      "Implementation question and evidence",
    ],
    assumptions:
      "This is a planning aid, not a preferred stack or proof that an implementation meets the common contract.",
    predict:
      "Which boundary will your chosen stack make easiest to change, and which might create friction?",
    try: "Specify one user moment, a supported run environment, and one bounded implementation question.",
    observe:
      "Inspect the generated direction and identify the evidence still needed to test it.",
  },
  "Constraint feedback loop": {
    activityVersion: 2,
    conceptIds: [
      "agent",
      "loop-engineering",
      "harness",
      "acceptance-criteria",
      "feedback-loop",
    ],
    caption:
      "Generate an authored CSV candidate under explicit constraints, then inspect simulated validation feedback.",
    controls: [
      "Client-only constraint",
      "Local patch constraint",
      "CSV correctness constraint",
      "Generate and validate",
    ],
    assumptions:
      "Candidates and check results are scripted examples, not executed model output or tests. The separate CSV starter produces actual downloads and check records.",
    predict:
      "Which requirement could a plausible-looking CSV export still violate?",
    try: "Change one constraint, generate an authored candidate and inspect the simulated checks.",
    observe:
      "Separate candidate generation from evidence that the declared requirements hold.",
  },
  "Deterministic boundary lab": {
    conceptIds: ["invariant", "authority", "contract", "state-authority"],
    caption:
      "Follow accepted and rejected transitions through a delivery statechart.",
    controls: [
      "Scenario and transition actions",
      "Cancellation",
      "Statechart inspection",
    ],
    assumptions:
      "The statechart models a declared delivery protocol. It does not by itself authorize real operations or guarantee durable effects.",
    predict:
      "Which state or guard should prevent the next proposed action, and why?",
    try: "Follow two different routes toward the same goal, then attempt cancellation.",
    observe:
      "Compare state, enabled actions, and the shared parent cancellation rule.",
  },
  "Scalability dimensions lab": {
    conceptIds: ["scalability", "pressure", "trade-off"],
    caption:
      "Connect demand, data, contributors, and changing rules to different scaling pressures.",
    controls: [
      "Concurrent submissions",
      "History growth",
      "More contributors",
      "Changing event rules",
    ],
    assumptions:
      "The selections frame a scalability question; they do not measure capacity or rank architectures.",
    predict:
      "Which maintained goal would your selected pressure threaten first?",
    try: "Choose one pressure, inspect its dimension, then add a second pressure.",
    observe:
      "Identify the new obligations and the measurement needed to justify a response.",
  },
  "Boundary trace": {
    conceptIds: [
      "contract",
      "measurement-boundary",
      "state-authority",
      "retry",
      "latency",
    ],
    caption:
      "Trace a work-item transition across browser, network, application, and durable storage boundaries.",
    controls: [
      "Validation",
      "Dropped connection",
      "Duplicate tap",
      "Slow save",
      "Delayed summary",
    ],
    assumptions:
      "Illustrative route, identity, and retry policy. Success requires the state change and matching activity event to commit together; derived summaries may catch up later.",
    predict:
      "If the connection drops after submission, what can the browser actually know about the durable outcome?",
    try: "Trace a normal submission, then enable a dropped connection or duplicate tap.",
    observe:
      "Locate the state-and-event commit, the point where the outcome becomes ambiguous, and the retry-safety rule.",
  },
  "ACID transaction lab": {
    conceptIds: [
      "transaction",
      "invariant",
      "state-authority",
      "consistency",
      "recovery",
    ],
    caption:
      "Inspect lifecycle and ledger records under failed writes, concurrency, and restart.",
    controls: [
      "Disturbance",
      "Separate writes or transaction",
      "Read committed or serializable isolation",
    ],
    assumptions:
      "The lab models selected database guarantees. Actual transaction and isolation semantics must be checked for the deployed store.",
    predict:
      "Which invariant could fail between two application-managed writes?",
    try: "Run the same disturbance with separate writes and with a transaction; vary isolation for concurrency.",
    observe:
      "Inspect the lifecycle and activity ledger together rather than inferring correctness from a response.",
  },
  "Cache decision lab": {
    conceptIds: ["cache", "contract", "consistency", "trade-off"],
    caption:
      "Trace reuse, validation, and stale responses under different HTTP cache policies.",
    controls: [
      "Response policy",
      "Time since storage",
      "Changed origin representation",
    ],
    assumptions:
      "A compliant-cache teaching model. Real cache keys, authorization, request directives, and platform overrides need separate verification.",
    predict:
      "Which policy can reuse a response without contacting the origin, and what freshness promise does that make?",
    try: "Change policy and response age, then mark the origin representation as changed.",
    observe:
      "Distinguish stored data, validation, and what the caller actually receives.",
  },
  "Web architecture lens": {
    conceptIds: [
      "rendering",
      "contract",
      "state-authority",
      "latency",
      "trade-off",
    ],
    caption:
      "Compare page navigation, HTML fragments, and browser-built views for the same operation.",
    controls: [
      "MPA, HDA, or SPA",
      "SSR, ISR, or CSR first load",
      "Local draft and session actions",
    ],
    assumptions:
      "Representative flows and illustrative compressed responses; initial downloads and other excluded costs prevent a universal performance ranking.",
    predict:
      "Which local state might be lost when an action causes a full-page navigation?",
    try: "Create a local draft and perform the same action in two interaction modes.",
    observe:
      "Inspect the exchanged representation, state ownership, and preserved browser state.",
  },
  "Client activation lens": {
    conceptIds: ["rendering", "latency", "trade-off", "measurement-boundary"],
    caption:
      "Follow when browser behavior becomes available after useful server HTML arrives.",
    controls: [
      "Hydration",
      "Islands",
      "Resumability",
      "First interaction trace",
    ],
    assumptions:
      "Illustrative JavaScript values for one teaching model, not measurements or framework rankings. The hydration baseline puts all five regions in one client tree and hydrates them on page load; server-only content and hydrated regions can coexist, and islands can use hydration.",
    predict:
      "What work must occur before the first event-recording interaction can finish?",
    try: "Keep the server document fixed and compare two activation approaches.",
    observe:
      "Separate visible content, downloaded code, and available behavior along the user journey.",
  },
  "API contract lens": {
    conceptIds: [
      "contract",
      "authority",
      "decision-reversibility",
      "trade-off",
    ],
    caption:
      "Compare what clients must know and servers supply across API styles.",
    controls: [
      "Resource HTTP",
      "REST with hypermedia",
      "GraphQL",
      "RPC",
      "Additional requested field",
    ],
    assumptions:
      "A structural comparison, not a ranking. Authentication, authorization, retries, observability, and versioning still apply.",
    predict:
      "Which client assumption must change if the operation needs the assignee name too?",
    try: "Run the exchange in two API styles and add the extra field.",
    observe:
      "Identify coupled changes and where the operation's permission and contract are enforced.",
  },
  "Tail latency simulator": {
    conceptIds: [
      "latency",
      "tail-latency",
      "benchmark",
      "measurement-boundary",
    ],
    caption:
      "Compare average latency and p95 when a minority of requests take a slow path.",
    controls: [
      "Concurrent clients",
      "Slow-path fraction",
      "p95 objective",
      "Prediction and simulation",
    ],
    assumptions:
      "Simulated requests under a declared model; conclusions depend on the population and percentile convention.",
    predict:
      "Will the average and p95 cross the objective together when only a minority of requests become slow?",
    try: "Keep the objective fixed and increase the fraction of slow storage requests.",
    observe:
      "Compare the average, p95, and outcome population rather than only the average.",
  },
  "Goodhart pressure test": {
    conceptIds: [
      "goodhart-law",
      "acceptance-criteria",
      "throughput",
      "benchmark",
      "eval",
    ],
    caption:
      "Apply optimization pressure to a proxy and inspect the intended outcome separately.",
    controls: [
      "Proxy metric",
      "Prediction",
      "Target pressure",
      "Outcome checks",
      "Measurement contract",
    ],
    assumptions:
      "Authored scenarios expose proxy failure modes; a metric is not automatically invalid merely because it is a target.",
    predict:
      "How might the selected proxy improve while the intended outcome becomes worse?",
    try: "Apply pressure, then compare a selected-success audit with an independent outcome gate.",
    observe:
      "Inspect the excluded work and the evidence used to judge the actual outcome.",
  },
  "Browser performance workbench": {
    conceptIds: ["benchmark", "latency", "measurement-boundary", "rendering"],
    caption:
      "Measure total time and instrumented JavaScript slices while yielding or blocking the main thread.",
    controls: [
      "Rendered event count",
      "One task or yielded batches",
      "Repeated measurements",
    ],
    assumptions:
      "Measurements are browser- and workload-specific. Frame callbacks are a scheduling proxy; slices exclude later layout and rendering.",
    predict:
      "Which strategy will have the shorter total time, and which the shorter longest JavaScript slice?",
    try: "Run both strategies five times with the same event count.",
    observe:
      "Compare distributions and timer boundaries before claiming an improvement in user-visible response.",
  },
  "Queue balance lab": {
    conceptIds: [
      "little-law",
      "queue",
      "latency",
      "throughput",
      "measurement-boundary",
    ],
    caption:
      "Check whether observed work in progress agrees with rate and average time inside one boundary.",
    controls: [
      "Arrival rate, λ",
      "Average time in system, W",
      "Observed average work in progress, L",
    ],
    assumptions:
      "Little's Law applies to stable long-run averages within the same boundary and population. Use mean time, not a tail percentile. The controls are illustrative values.",
    predict:
      "Arrival rate stays at 20 events/s. Average time doubles from 0.5 to 1 second. What average work in progress would make the measurements agree?",
    try: "Set arrival rate to 20 and average time to 1, then adjust observed work in progress to your prediction.",
    observe:
      "Compare expected and observed L and the displayed gap. Explain what a disagreement could mean about the measurement assumptions.",
  },
  "Model evaluation lab": {
    conceptIds: [
      "eval",
      "acceptance-criteria",
      "review-budget",
      "benchmark",
      "reliability",
    ],
    caption:
      "Score two attempts against a task-specific rubric and inspect the limits of the comparison.",
    controls: [
      "Eval task",
      "Shared prompt",
      "Attempt outputs",
      "Rubric and comparability checks",
    ],
    assumptions:
      "Sample answers, preset scores, and displayed cost/latency are invented. Rubric scores and protocol confirmations are manual; real evaluations need separate acceptance checks, recorded usage and correction effort, and repeated comparable trials.",
    predict:
      "What evidence would distinguish a convincing example from a more reliable model on this task?",
    try: "Use samples or permitted outputs, inspect the complete shared prompt, and score both attempts against the selected task's rubric. Conceal identities when another person prepares the pair.",
    observe:
      "Identify the missed criteria and comparability limits. For real runs, record acceptance results, usage, and human corrections separately.",
  },
  "OpenTelemetry trace explorer": {
    conceptIds: ["observability", "latency", "measurement-boundary", "retry"],
    caption:
      "Inspect spans, timing, and retries within a simulated server request trace.",
    controls: ["Healthy, slow, or retried request", "Span selection"],
    assumptions:
      "The timeline covers server handling, excluding browser work and time outside the server span. No incoming parent context is modeled. Literal OTLP uses typed values and a more verbose envelope; a trace is not proof of every user-visible outcome.",
    predict:
      "Which span would account for the additional time in the slow or retried request?",
    try: "Compare the healthy request with a slow write or successful storage retry and inspect the relevant spans.",
    observe:
      "Relate span timing, parentage, and events to the declared request boundary.",
  },
  "Friction audit": {
    conceptIds: [
      "development-friction",
      "change-probe",
      "technical-debt",
      "benchmark",
      "decision-log",
    ],
    caption:
      "Compare active person-minutes and acceptance evidence for one bounded change.",
    controls: [
      "Task and intervention",
      "Stage effort",
      "One-off cost",
      "Acceptance checks",
      "Evidence and reversal condition",
    ],
    assumptions:
      "Assign each person's active effort once; unknown is not zero. One comparison cannot establish causation, future savings, or rework risk.",
    predict:
      "Which stage should your intervention improve, and where might it introduce new effort?",
    try: "Record comparable baseline and candidate observations, one-off cost, and acceptance evidence.",
    observe:
      "Separate task effort from intervention cost and keep conditions and unknown values visible.",
  },
  "Changed assumptions map": {
    conceptIds: [
      "pressure",
      "saturation",
      "scalability",
      "observability",
      "trade-off",
    ],
    caption:
      "Follow evidence from changed demand, retries, and a large import toward a bounded response.",
    controls: ["Evidence signals", "Response choices"],
    assumptions:
      "An authored scenario; the selected signal must justify the response under the declared goal.",
    predict:
      "Which signal identifies a binding limit rather than merely a busy component?",
    try: "Inspect one signal before choosing a response, then compare an alternative signal.",
    observe:
      "State the changed assumption, maintained goal, and evidence the response still needs.",
  },
  "Fleet trace debugger": {
    conceptIds: [
      "agent-fleet",
      "authority",
      "observability",
      "benchmark",
      "state-authority",
    ],
    caption:
      "Reconcile orchestration intent, gateway decisions, and the physical execution ledger.",
    controls: [
      "Trace inspection",
      "Run attribution",
      "Physical ledger accounting",
    ],
    assumptions:
      "Count each physical row once, including failed, cancelled, and unmatched work. Missing linking evidence must remain unmatched.",
    predict:
      "Which records prove execution, and which express only an intended or authorized action?",
    try: "Attribute records to R41, R42, or unmatched using the available linking evidence.",
    observe:
      "Compare the physical ledger with orchestration intent and identify unsupported attribution.",
  },
  "Agent fleet delegation": {
    activityVersion: 2,
    conceptIds: [
      "agent-fleet",
      "loop-engineering",
      "agent",
      "task-graph",
      "harness",
      "review-budget",
      "trade-off",
    ],
    caption:
      "Plan task-specific scope, roles, validation and completed handoffs before measuring an actual run.",
    controls: [
      "Delegation target",
      "Project readiness",
      "Roles",
      "Run packet sections",
    ],
    assumptions:
      "Invented repository examples prepare prompts, not measured outcomes. Investigations are read-only; tests and refactors permit bounded edits. Record actual configuration, effort and accounting gaps from execution.",
    predict:
      "Which handoff could lose a requirement, and what evidence should its recipient check?",
    try: "Keep the target fixed, change the selected roles and inspect their scope, validation and handoffs.",
    observe:
      "Inspect how the packet changes between an investigation and a code change; distinguish preparation from completed-run evidence.",
  },
  "Reliability chain lab": {
    conceptIds: [
      "lusser-law",
      "reliability",
      "contract",
      "measurement-boundary",
    ],
    caption:
      "Calculate a required-stage chain's reliability under explicit independence and repair assumptions.",
    controls: [
      "Initial correctness",
      "Error detection",
      "Repair success",
      "Critical step count",
    ],
    assumptions:
      "Identical independent required steps; the first terminal outcome decides the run. Correlated failures or optional stages require a different model.",
    predict:
      "How will doubling the required step count affect end-to-end success if per-step behavior stays fixed?",
    try: "Keep correctness, detection, and repair fixed; compare two critical step counts.",
    observe:
      "Separate per-step success from chain success and examine the independence assumption.",
  },
  "Sequential work bound": {
    conceptIds: ["amdahl-law", "agent-fleet", "review-budget", "throughput"],
    caption:
      "Inspect the ideal speedup bound when part of a fixed workload stays sequential.",
    controls: ["Parallelizable fraction", "Agent count"],
    assumptions:
      "Amdahl's ideal fixed-workload model excludes new coordination, contention, conflicts, retries, and review queues.",
    predict:
      "With 80% parallelizable work, will increasing from four to eight agents double speedup?",
    try: "Set parallelizable work to 80% and compare four and eight agents.",
    observe:
      "Inspect the unchanged sequential work and explain why accepted-change throughput is a separate claim.",
  },
  "Scaling pressure planner": {
    activityVersion: 2,
    conceptIds: [
      "pressure",
      "scalability",
      "trade-off",
      "cache",
      "backpressure",
      "partition",
    ],
    caption:
      "Choose responses to Work Activity Tracker pressure while preserving each accepted action's state-and-event commit.",
    controls: [
      "Scenario",
      "Pressures to investigate",
      "Index, queue, cache, replica, partition, or admission choices",
    ],
    assumptions:
      "Invented scenarios prepare a qualitative plan, not capacity or risk estimates. Queues defer only derived work after the authoritative commit; observations from an actual workload must test the proposed benefit.",
    predict:
      "Which single move addresses the declared pressure, and what new obligation does it create?",
    try: "Choose a scenario and one response, then inspect the cost of adding another move.",
    observe:
      "Connect each response to a signal; distinguish the state-and-event commit from deferred summaries and faster acknowledgment.",
  },
  "Saturation boundary lab": {
    conceptIds: [
      "saturation",
      "throughput",
      "queue",
      "retry",
      "backpressure",
      "pressure",
    ],
    caption:
      "Compare effective demand with stage capacities and move the binding limit.",
    controls: [
      "Scenario",
      "Offered load",
      "Retry amplification",
      "Stage capacities",
      "Ingress backpressure",
    ],
    assumptions:
      "A teaching model, not a benchmark; it compares one effective demand rate with declared stage limits.",
    predict:
      "If you raise only the database capacity, which stage will bind next and can retries change the conclusion?",
    try: "Inspect the current limit, raise its capacity, then vary retry amplification and admission control.",
    observe:
      "Track useful completions, backlog or explicit rejection, and the newly limiting stage.",
  },
  "Contention curve lab": {
    conceptIds: ["contention", "throughput", "saturation", "amdahl-law"],
    caption:
      "Explore a modeled capacity curve as contention and coherency costs change.",
    controls: [
      "Contention coefficient",
      "Coherency coefficient",
      "Worker concurrency",
    ],
    assumptions:
      "A parameterized Universal Scalability Law model. Coefficients require workload-specific evidence before predicting real capacity.",
    predict:
      "Will adding workers always increase capacity when coherency cost is nonzero?",
    try: "Hold coefficients fixed and move concurrency through and beyond the curve's peak.",
    observe:
      "Identify plateau or decline and distinguish this model from Amdahl's ideal bound.",
  },
  "Orchestration control loop": {
    conceptIds: [
      "feedback-loop",
      "recovery",
      "state-authority",
      "pressure",
      "contract",
    ],
    caption:
      "Follow controller actions that reconcile observed replicas with desired state.",
    controls: ["Desired replicas", "Controller and failure actions"],
    assumptions:
      "A simplified control loop; restoring replica count does not establish application correctness or recovery of durable effects.",
    predict:
      "After losing a replica, what discrepancy should the controller observe and what action should follow?",
    try: "Change desired replicas or introduce a failure, then run the controller.",
    observe:
      "Name desired state, observed state, and controller action separately.",
  },
  "Durable effect retry lab": {
    conceptIds: [
      "durable-workflow",
      "retry",
      "idempotency",
      "state-authority",
      "recovery",
    ],
    caption:
      "Stop a worker after an external effect but before its completion enters durable history.",
    controls: [
      "Retry policy",
      "Reused business key or fresh attempt key",
      "Receiver deduplication",
      "Prediction and failure window",
    ],
    assumptions:
      "The failure is outside the workflow history boundary. Retry safety depends on the receiver atomically preserving operation identity with the effect.",
    predict:
      "If the receiver applied the effect but completion was not recorded, what could make a retry apply it twice?",
    try: "Stop in the failure window, then compare key reuse and receiver deduplication choices.",
    observe:
      "Count external effects separately from attempts and preserved workflow progress.",
  },
  "CAP partition lab": {
    conceptIds: [
      "partition",
      "consistency",
      "invariant",
      "state-authority",
      "recovery",
    ],
    caption:
      "Compare conflicting writes across a network split under quorum and local-acceptance policies.",
    controls: [
      "Quorum or accept-in-every-region policy",
      "Partition, writes, and repair actions",
    ],
    assumptions:
      "An operation-specific consistency scenario. Repair cannot retract a success response already observed by a client.",
    predict:
      "Can both sides acknowledge a conflicting start operation while preserving the declared invariant?",
    try: "Partition Helsinki from the majority, submit both writes, and compare policies before repair.",
    observe:
      "Record acknowledgments, state divergence, and what reconciliation can and cannot fix.",
  },
  "Latency budget map": {
    conceptIds: [
      "latency",
      "measurement-boundary",
      "consistency",
      "trade-off",
      "cache",
    ],
    caption:
      "Estimate latency contributions from geography, round trips, and execution time.",
    controls: [
      "User and database placement",
      "Network multiplier",
      "Hardware profile",
      "Sequential query count",
      "Query and application work",
    ],
    assumptions:
      "Illustrative estimates, not measured deployment latency. Routing, queues, protocol setup, and consistency obligations can add work.",
    predict:
      "Which will matter more in your scenario: faster query execution or fewer sequential remote round trips?",
    try: "Keep placement fixed and vary query count; then keep work fixed and move the database.",
    observe:
      "Compare contributions within the declared response boundary and identify omitted costs.",
  },
};

export const demoResources: LearningResource[] = demoCatalog.map((demo) => {
  const activity = activities[demo.title];
  if (!activity) throw new Error(`Missing learning activity: ${demo.title}`);
  const { predict, try: action, observe, ...metadata } = activity;
  const id = demoId(demo.title);
  return {
    ...metadata,
    id,
    kind: "demo",
    title: demo.title,
    url: `/demos/#${id}`,
    images: {
      png: `/concepts/visuals/${id}.png`,
      alt: `${demo.title}: static preview of the default demo view. ${activity.caption}`,
    },
    experiment: {
      predict,
      try: action,
      observe,
      reflect:
        "Explain which assumption makes your prediction hold, where the model might fail, and what evidence you would need from your own system.",
    },
  };
});

export const learningResources: LearningResource[] = [
  ...graphResources,
  ...bookGraphicResources,
  ...demoResources,
];
