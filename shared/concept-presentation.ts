import type { ConceptGroup } from "./concepts.ts";

export type ConceptSubgroup = {
  id: string;
  group: ConceptGroup;
  title: string;
  conceptIds: readonly string[];
};

// Subgroups provide reading homes within a topic, not exclusive definitions
// or new relationships. Editorial roles remain a separate dimension.
export const conceptSubgroups: readonly ConceptSubgroup[] = [
  {
    id: "behavior-correctness",
    group: "Architecture",
    title: "Behavior & correctness",
    conceptIds: ["contract", "invariant", "idempotency"],
  },
  {
    id: "state-coordination",
    group: "Architecture",
    title: "State & coordination",
    conceptIds: ["state-authority", "transaction", "consistency"],
  },
  {
    id: "delivery-trade-offs",
    group: "Architecture",
    title: "Delivery & trade-offs",
    conceptIds: ["rendering", "cache", "trade-off"],
  },
  {
    id: "change-decisions",
    group: "Development",
    title: "Change & decisions",
    conceptIds: [
      "development-friction",
      "technical-debt",
      "decision-reversibility",
      "decision-log",
    ],
  },
  {
    id: "project-foundations",
    group: "Development",
    title: "Project foundations",
    conceptIds: [
      "harness",
      "reproducible-environment",
      "acceptance-criteria",
      "authority",
    ],
  },
  {
    id: "agent-feedback",
    group: "Development",
    title: "Agent feedback",
    conceptIds: ["agent", "loop-engineering", "feedback-loop"],
  },
  {
    id: "parallel-work-review",
    group: "Development",
    title: "Parallel work & review",
    conceptIds: ["agent-fleet", "task-graph", "review-budget", "amdahl-law"],
  },
  {
    id: "pressure-capacity",
    group: "Operations",
    title: "Pressure & capacity",
    conceptIds: ["scalability", "pressure", "saturation", "contention"],
  },
  {
    id: "flow-control",
    group: "Operations",
    title: "Flow control",
    conceptIds: ["queue", "backpressure"],
  },
  {
    id: "failure-recovery",
    group: "Operations",
    title: "Failure & recovery",
    conceptIds: ["retry", "recovery", "partition", "durable-workflow"],
  },
  {
    id: "measurement-flow",
    group: "Evidence",
    title: "Measurement & flow",
    conceptIds: [
      "measurement-boundary",
      "throughput",
      "latency",
      "little-law",
      "observability",
    ],
  },
  {
    id: "evaluation-proxies",
    group: "Evidence",
    title: "Evaluation & proxies",
    conceptIds: ["benchmark", "eval", "change-probe", "goodhart-law"],
  },
  {
    id: "reliability",
    group: "Evidence",
    title: "Reliability",
    conceptIds: ["reliability", "lusser-law"],
  },
];

// Editorial roles describe how an idea is used in the map, not a prerequisite
// hierarchy or a claim that every concept has one absolute abstraction level.
export const conceptRoles = {
  organizing: { label: "Organizing idea", short: "Idea" },
  property: { label: "Property or phenomenon", short: "Property" },
  mechanism: { label: "Mechanism or response", short: "Mechanism" },
  practice: { label: "Practice or artifact", short: "Practice" },
  model: { label: "Explanatory model", short: "Model" },
} as const;

export type ConceptRole = keyof typeof conceptRoles;

export const conceptRoleById: Record<string, ConceptRole> = {
  "measurement-boundary": "practice",
  throughput: "property",
  latency: "property",
  queue: "mechanism",
  saturation: "property",
  "little-law": "model",
  "amdahl-law": "model",
  "development-friction": "property",
  scalability: "organizing",
  pressure: "property",
  "trade-off": "organizing",
  benchmark: "practice",
  observability: "practice",
  "goodhart-law": "model",
  eval: "practice",
  "change-probe": "practice",
  agent: "mechanism",
  "loop-engineering": "practice",
  harness: "practice",
  "acceptance-criteria": "practice",
  authority: "organizing",
  "feedback-loop": "organizing",
  "decision-log": "practice",
  "decision-reversibility": "property",
  "technical-debt": "property",
  "reproducible-environment": "practice",
  "agent-fleet": "mechanism",
  "task-graph": "practice",
  "review-budget": "property",
  contract: "organizing",
  rendering: "mechanism",
  "state-authority": "organizing",
  transaction: "mechanism",
  invariant: "property",
  cache: "mechanism",
  idempotency: "property",
  retry: "mechanism",
  backpressure: "mechanism",
  recovery: "practice",
  partition: "property",
  consistency: "property",
  "durable-workflow": "mechanism",
  contention: "property",
  "lusser-law": "model",
  reliability: "property",
};
