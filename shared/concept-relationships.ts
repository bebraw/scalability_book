import { bookConceptRelationships } from "./book-concept-relationships.ts";

export type ConceptRelationship = {
  source: string;
  target: string;
  direction: "directed" | "undirected";
  label: string;
  explanation: string;
};

// Direction specifies how to read the labelled proposition.
// It does not imply a prerequisite or a causal claim beyond its explanation.
export const conceptRelationships: ConceptRelationship[] = [
  {
    source: "measurement-boundary",
    target: "latency",
    direction: "directed",
    label: "defines timing scope of",
    explanation:
      "The measurement boundary defines which waiting and processing latency includes.",
  },
  {
    source: "little-law",
    target: "measurement-boundary",
    direction: "directed",
    label: "requires a shared",
    explanation:
      "Little's Law requires work in progress, rate, and average time to describe the same boundary.",
  },
  {
    source: "queue",
    target: "latency",
    direction: "directed",
    label: "can add waiting time to",
    explanation:
      "Waiting in a queue contributes to latency when the queue is inside the timing boundary.",
  },
  {
    source: "throughput",
    target: "queue",
    direction: "undirected",
    label: "arrivals and exits",
    explanation:
      "Compare admissions with all departures at the queue boundary to explain backlog growth. Useful throughput separately counts completions that meet the declared outcome criteria.",
  },
  {
    source: "saturation",
    target: "throughput",
    direction: "directed",
    label: "bounds sustainable",
    explanation:
      "The saturated stage bounds the sustainable completion rate for the declared workload.",
  },
  {
    source: "queue",
    target: "saturation",
    direction: "directed",
    label: "can signal",
    explanation:
      "A growing queue can expose pressure above completion capacity, even while acknowledgments remain fast.",
  },
  {
    source: "little-law",
    target: "queue",
    direction: "directed",
    label: "accounts for work in",
    explanation:
      "Little's Law connects stable work in progress, including queued and processing work, to rate and average time.",
  },
  {
    source: "little-law",
    target: "amdahl-law",
    direction: "undirected",
    label: "different questions",
    explanation:
      "Little's Law checks stable flow averages; Amdahl's Law bounds ideal fixed-workload parallel speedup.",
  },
  {
    source: "throughput",
    target: "amdahl-law",
    direction: "undirected",
    label: "ideal gain vs output",
    explanation:
      "An Amdahl speedup bound does not guarantee accepted-change throughput; review, coordination, and correctness still matter.",
  },
  {
    source: "little-law",
    target: "latency",
    direction: "directed",
    label: "uses average",
    explanation:
      "Little's Law uses average time inside the boundary, not a tail percentile such as p95.",
  },
  ...bookConceptRelationships,
];
