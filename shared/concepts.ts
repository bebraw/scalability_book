import { bookConcepts } from "./book-concepts.ts";

export const conceptGroups = [
  "Evidence",
  "Development",
  "Architecture",
  "Operations",
  "Models",
] as const;
export type ConceptGroup = (typeof conceptGroups)[number];

export type Concept = {
  group: ConceptGroup;
  id: string;
  title: string;
  definition: string;
  assumptions: string;
  example: string;
  misconception: string;
  contexts: { label: string; href: string; description: string }[];
  usage?: {
    note: string;
    sources?: { label: string; href: string }[];
  };
};

// Curated teaching passages, shared by the reference page and chapter panes.
const pilotConcepts: Concept[] = [
  {
    id: "measurement-boundary",
    group: "Evidence",
    title: "Measurement boundary",
    definition:
      "The declared start, end, population, and observation window of a measurement. A boundary determines which work and waiting the result includes.",
    assumptions:
      "Comparisons and equations must describe compatible work, units, and windows. Record failed, rejected, and unfinished work alongside successful completions.",
    example:
      "An event takes 20 ms inside the database but 200 ms from submission to visible activity. The database timer leaves out network, application, queue, and rendering time; it cannot establish the end-to-end latency.",
    misconception:
      "A faster component proves a faster user journey. Work outside the measured component can dominate or become slower.",
    usage: {
      note: "Measurement boundary is the book's descriptive label for a measurement's scope and timing convention, rather than a separate formal model.",
    },
    contexts: [
      {
        label: "Measurement: declare the protocol",
        href: "/chapters/benchmarking/#benchmark-to-test-a-claim",
        description: "Specify what starts and ends each observation.",
      },
      {
        label: "Scaling: test where the cost moved",
        href: "/chapters/scaling/#implement-the-smallest-justified-response",
        description:
          "Keep the original outcome visible after changing a component.",
      },
    ],
  },
  {
    id: "throughput",
    group: "Evidence",
    title: "Throughput",
    definition:
      "The rate of completed work at a declared boundary. Useful throughput counts completions that meet the stated correctness and quality criteria.",
    assumptions:
      "Name the completion event, units, and window. Offered, admitted, and completed work are different rates, especially during overload or asynchronous processing.",
    example:
      "A service acknowledges 150 events/s while its worker makes 100 events/s visible. Acknowledgment throughput is 150/s; visible-event throughput is 100/s. If all admitted events remain pending until processed, backlog grows by 50 events/s.",
    misconception:
      "More acknowledgments or generated changes mean more useful output. Pending events and unreviewed changes have not yet crossed their completion boundary.",
    contexts: [
      {
        label: "Measurement: count outcomes separately",
        href: "/chapters/benchmarking/#check-whether-the-generator-hides-overload",
        description:
          "Separate offered, admitted, completed, and timed-out work.",
      },
      {
        label: "Fleets: sequential review limits speedup",
        href: "/chapters/agent-fleets/#amdahl-s-law-and-the-sequential-bottleneck",
        description:
          "Measure accepted changes rather than generation activity.",
      },
    ],
  },
  {
    id: "latency",
    group: "Evidence",
    title: "Latency",
    definition:
      "Elapsed time between a declared start and completion event. End-to-end latency can include waiting, processing, network transfer, and rendering. Tail latency describes the slow end of its distribution, often summarized as p95 or p99.",
    assumptions:
      "State the timing boundary, population, sample size, percentile convention, and treatment of failed or unfinished requests. Averages and percentiles answer different questions; Little's Law uses an average, not p95. A timeout is a deadline lower bound, not an observed completion time.",
    example:
      "Of 20 requests, 18 take 40 ms and two take 240 ms. Mean latency is 60 ms; nearest-rank p95 is 240 ms. A goal below 120 ms passes for the mean and fails for p95.",
    misconception:
      "A lower average guarantees a better experience for everyone. A slow minority, failures, or work omitted from the timer can be hidden by that average. Small samples cannot precisely characterize rare slow outcomes.",
    contexts: [
      {
        label: "Measurement: calculate the average and tail",
        href: "/chapters/benchmarking/#exercise-measurement-prediction",
        description: "Compare a mean with a declared percentile convention.",
      },
      {
        label: "Scaling: latency and geography",
        href: "/chapters/scaling/#latency-and-geography",
        description: "Follow time across network and consistency boundaries.",
      },
      {
        label: "Scaling: budget latency",
        href: "/chapters/scaling/#latency-budget-lab",
        description: "Account for the journey across stages.",
      },
    ],
  },
  {
    id: "queue",
    group: "Operations",
    title: "Queue",
    definition:
      "Work waiting for a resource or a next stage. A queue may contain events awaiting a worker or changes awaiting review; work in progress also includes work currently being processed.",
    assumptions:
      "Name what enters, what leaves, capacity, and the policy for full or abandoned work. A sustained arrival rate above completion capacity cannot produce a stable backlog.",
    example:
      "Admitting 120 events/s to a worker completing 100 events/s adds 20 pending events/s under a constant-rate model without loss or retries. Six changes arriving per hour with four accepted per hour add two unfinished changes per hour if none leave through rejection or withdrawal. These illustrative rates are not measured capacity.",
    misconception:
      "Adding a queue creates processing capacity. It can absorb a bounded burst or decouple stages, but it also creates waiting, recovery, and admission obligations.",
    contexts: [
      {
        label: "Measurement: transfer the boundary to review work",
        href: "/chapters/benchmarking/#exercise-measurement-transfer",
        description:
          "Apply the same relationship with different work and units.",
      },
      {
        label: "Recap: a queue changes three loops",
        href: "/chapters/recap/#how-the-loops-affect-one-another",
        description:
          "Connect application backlog to implementation and review work.",
      },
    ],
  },
  {
    id: "saturation",
    group: "Operations",
    title: "Saturation",
    definition:
      "The point at which a limiting resource or capability can no longer absorb more pressure while maintaining the declared goal. In this book, the limit can be a physical resource, quota, dependency, or human review capacity.",
    assumptions:
      "Identify the workload, maintained goal, and limiting resource. Expanding one limit can expose another; rejection or retries can change the observed rates.",
    example:
      "A request visits stages with capacities of 180, 110, 150, and 130 requests/s. With one visit per stage and no retries, the ceiling is 110/s. Raising that stage to 150/s moves the limit to the 130/s stage.",
    misconception:
      "Adding capacity to one component removes the system's limit. Another stage can bind first, and a quicker acknowledgment can conceal a growing backlog.",
    usage: {
      note: "The book uses saturation across technical and human limits, drawing on resilience engineering's treatment of finite adaptive capacity. Name the limiting capacity in each example; resource utilization alone does not describe every limit.",
      sources: [
        {
          label: "Woods: the theory of graceful extensibility",
          href: "https://link.springer.com/article/10.1007/s10669-018-9708-3",
        },
      ],
    },
    contexts: [
      {
        label: "Pressure: name the binding limit",
        href: "/chapters/reality/#from-failed-assumptions-to-useful-signals",
        description: "Connect a disturbance to the limit and its signals.",
      },
      {
        label: "Scaling: move the saturation boundary",
        href: "/chapters/scaling/#name-the-saturation-boundary",
        description: "Test which constraint appears after an intervention.",
      },
    ],
  },
  {
    id: "little-law",
    group: "Models",
    title: "Little's Law",
    definition:
      "For a stable conserved-work boundary, average work in progress L equals completion rate λ multiplied by average time in the boundary W: L = λW.",
    assumptions:
      "Use the same work, boundary, compatible windows, and units. Arrivals and completions must approximately balance over a suitable observation period. Include waiting when it is inside the boundary.",
    example:
      "At 20 completed events/s and 0.5 s per event, expected average work in progress is 10 events. At four accepted changes/hour and three hours per change, it is 12 changes. These are illustrative steady-state calculations, not measured capacity.",
    misconception:
      "A mismatch proves the database is the bottleneck, or matching values prove the system is healthy. The relationship checks consistency; it does not isolate a cause or establish an acceptable waiting time.",
    contexts: [
      {
        label: "Measurement: check compatible averages",
        href: "/chapters/benchmarking/#check-measurements-against-a-model",
        description:
          "Calculate the relationship and inspect what a mismatch means.",
      },
      {
        label: "Scaling: choose the question before the equation",
        href: "/chapters/scaling/#exercise-scaling-model-choice",
        description:
          "Distinguish consistency of flow from a bound on parallel speedup.",
      },
    ],
  },
  {
    id: "amdahl-law",
    group: "Models",
    title: "Amdahl's Law",
    definition:
      "For a fixed workload with parallelizable fraction p and n workers, ideal speedup is S(n) = 1 / ((1 − p) + p/n). The sequential fraction bounds the gain.",
    assumptions:
      "Hold the workload and sequential fraction fixed. Assume ideal division of parallel work with no added coordination cost. The result is an upper bound under those assumptions.",
    example:
      "If 80% of baseline work can run in parallel and 20% remains sequential, four workers give ideal speedup 1 / (0.2 + 0.8/4) = 2.5. Even infinitely many workers cannot exceed 5× in this model.",
    misconception:
      "Four agents guarantee four times the accepted output. Review or integration that must remain sequential limits fixed-task speedup; added coordination cost can reduce the gain further. Ongoing accepted-change throughput requires its own measurements.",
    contexts: [
      {
        label: "Fleets: calculate the sequential bound",
        href: "/chapters/agent-fleets/#amdahl-s-law-and-the-sequential-bottleneck",
        description: "Account for integration and review in the workload.",
      },
      {
        label: "Scaling: choose between the two laws",
        href: "/chapters/scaling/#exercise-scaling-model-choice",
        description: "Choose a model by the question it can answer.",
      },
    ],
  },
];

export const concepts: Concept[] = [...pilotConcepts, ...bookConcepts];
