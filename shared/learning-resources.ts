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
  "Deterministic boundary lab": {
    activityVersion: 2,
    conceptIds: ["invariant", "authority", "contract", "state-authority"],
    caption:
      "Follow accepted and rejected transitions through a delivery statechart.",
    controls: [
      "Scenario and transition actions",
      "Premature RELEASE proposal",
      "Cancellation",
      "Statechart inspection",
    ],
    assumptions:
      "TESTS_PASS is a supplied event, not an executed application test. The statechart models a declared delivery protocol. It does not by itself authorize real operations or guarantee durable effects.",
    predict:
      "Which state or guard should prevent the next proposed action, and why?",
    try: "Propose RELEASE before checks pass; inspect the rejected event and unchanged state. Then follow a valid route or cancel.",
    observe:
      "Compare state, enabled actions, and the shared parent cancellation rule.",
  },
  "ACID transaction lab": {
    activityVersion: 3,
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
      "Reply before or after durable commit on restart",
    ],
    assumptions:
      "These are authored ledger traces, not database execution. The restart case holds the transaction fixed and varies acknowledgement timing. The concurrency case assumes a stale application check followed by an unconditional write; the displayed conditional-write alternative is pseudocode, not executed SQL. Check the deployed store's guarantees.",
    predict:
      "Which invariant could fail between two application-managed writes?",
    try: "For failure compare separate writes and a transaction; for concurrency inspect the stale-check program before varying isolation. For restart keep the durable transaction fixed and vary reply timing.",
    observe:
      "Inspect the lifecycle and activity ledger together rather than inferring correctness from a response.",
  },
  "Cache decision lab": {
    activityVersion: 2,
    conceptIds: ["cache", "contract", "consistency", "trade-off"],
    caption:
      "Trace reuse, validation, and stale responses under different HTTP cache policies.",
    controls: [
      "Response policy",
      "Time since storage",
      "Changed origin representation",
    ],
    assumptions:
      "Warm browser and shared entries of the same age; a stale browser entry is forwarded and only the shared cache uses the stale window. Request overrides and browser SWR behavior need separate verification.",
    predict:
      "Which policy can reuse a response without contacting the origin, and what freshness promise does that make?",
    try: "Change policy and response age, then mark the origin representation as changed.",
    observe:
      "Distinguish stored data, validation, and what the caller actually receives.",
  },
  "Web architecture lens": {
    activityVersion: 2,
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
      "Document, HTML fragment, or JSON update",
      "Unsaved note",
      "Explicit draft restoration",
      "Reveal modeled update",
    ],
    assumptions:
      "Three representative modeled exchanges, with no network calls or payload estimates. Draft restoration is an explicit application choice, not a guarantee of an architecture.",
    predict:
      "Which local state might be lost when an action causes a full-page navigation?",
    try: "Create a local draft and perform the same action in two interaction modes.",
    observe:
      "Inspect the exchanged representation, state ownership, and preserved browser state.",
  },
  "Tail latency simulator": {
    activityVersion: 2,
    conceptIds: [
      "latency",
      "tail-latency",
      "benchmark",
      "measurement-boundary",
    ],
    caption:
      "Compare average latency and p95 when a minority of requests take a slow path.",
    controls: [
      "Slow-path fraction",
      "Average and p95 objective",
      "Prediction and simulation",
    ],
    assumptions:
      "A constructed population of 60 records, nearest-rank p95 at rank 57. No queueing or capacity model; a passing p95 can leave three slower requests outside it.",
    predict:
      "Will the average and p95 cross the objective together when only a minority of requests become slow?",
    try: "Keep the objective fixed and compare 5% with 10% slow paths.",
    observe:
      "Inspect ordered records, rank 57 and the count missing the objective alongside average and p95.",
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
  "OpenTelemetry trace explorer": {
    activityVersion: 2,
    conceptIds: ["observability", "latency", "measurement-boundary", "retry"],
    caption:
      "Inspect spans, timing, and retries within a simulated server request trace.",
    controls: [
      "Request A, B, or C",
      "Span selection",
      "Reveal authored interpretation",
    ],
    assumptions:
      "The timeline covers server handling, excluding browser work and time outside the server span. No incoming parent context is modeled. Literal OTLP uses typed values and a more verbose envelope; a trace is not proof of every user-visible outcome.",
    predict:
      "Which span would account for the additional time in the slow or retried request?",
    try: "Compare unlabeled request cases, select a child span as evidence, then reveal the authored interpretation. Instrument one operation in your own project for actual trace evidence.",
    observe:
      "Relate span timing, parentage, and events to the declared request boundary.",
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
  "Reliability chain lab": {
    activityVersion: 2,
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
      "Separate per-step success, chain success and wrong results; distinguish an already-met target from absent detection or required repair.",
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
  "Saturation boundary lab": {
    activityVersion: 3,
    conceptIds: [
      "saturation",
      "throughput",
      "queue",
      "backpressure",
      "pressure",
    ],
    caption:
      "Compare offered, admitted and completed event rates and move the binding limit.",
    controls: [
      "Offered load",
      "Stage capacities",
      "Limit admission to bottleneck rate",
    ],
    assumptions:
      "Steady rates, one visit per stage, successful work, and a buffer before the pipeline. Completion is the minimum admitted rate and stage capacity. Bars compare admitted rates to limits, not measured utilization.",
    predict:
      "If you raise only the database capacity, which stage will limit completion next?",
    try: "Predict the next limit, expand the current one and compare the recorded before/after. Enable admission limiting and compare admitted, completed, queued and rejected work.",
    observe:
      "Distinguish spare capacity, zero headroom at the limit and excess demand; inspect backlog or explicit rejection and the newly limiting stage.",
  },
  "Contention curve lab": {
    activityVersion: 2,
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
    try: "Vary concurrency with fixed costs; then set both costs to zero and distinguish an interior peak from the largest displayed value.",
    observe:
      "Identify plateau or decline where shown; a rising chart endpoint is not an optimum. Distinguish this model from Amdahl's ideal bound.",
  },
  "Orchestration control loop": {
    activityVersion: 2,
    conceptIds: [
      "feedback-loop",
      "recovery",
      "state-authority",
      "pressure",
      "contract",
    ],
    caption:
      "Follow controller actions that reconcile observed replicas with desired state.",
    controls: [
      "Desired replicas",
      "Controller and failure actions",
      "Send simulated request",
      "Roll back to v1",
    ],
    assumptions:
      "A simplified control loop; restoring replica count does not establish application correctness or recovery of durable effects.",
    predict:
      "After losing a replica, what discrepancy should the controller observe and what action should follow?",
    try: "Deploy running-but-broken v2, send a simulated request and reconcile replicas. Compare HTTP 500 with the response after rollback to v1.",
    observe:
      "Separate replica convergence from useful HTTP responses; retain failed responses in the request log.",
  },
  "Durable effect retry lab": {
    activityVersion: 2,
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
      "All counts and history here are an in-memory model; the persisted-retry workspace exercise supplies real SQLite/process evidence. The failure is outside the workflow history boundary. Retry safety depends on the receiver atomically preserving operation identity with the effect.",
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
    activityVersion: 3,
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
      "User–application and application–database distances",
      "Network multiplier",
      "Sequential query count",
      "Query and application work",
    ],
    assumptions:
      "Hypothetical timings and a propagation floor, not hardware classes or deployment advice. Batching requires identical query results, unchanged execution cost and dependencies fitting into at most two trips.",
    predict:
      "Which will matter more in your scenario: faster query execution or fewer sequential remote round trips?",
    try: "Keep placement fixed and vary query count; then keep work fixed and move the database.",
    observe:
      "Compare sequential and batched response budgets side by side, explain when batching is possible and identify omitted costs.",
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
