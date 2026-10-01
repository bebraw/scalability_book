import { bookConceptRelationships } from "./book-concept-relationships.ts";

// These are authored relationships, not inferred prerequisites or causal edges.
export const conceptRelationships = [
  {
    source: "measurement-boundary",
    target: "latency",
    label: "timing boundary",
    explanation:
      "The measurement boundary defines which waiting and processing latency includes.",
  },
  {
    source: "measurement-boundary",
    target: "little-law",
    label: "aligned quantities",
    explanation:
      "Little's Law requires work in progress, rate, and average time to describe the same boundary.",
  },
  {
    source: "latency",
    target: "queue",
    label: "waiting time",
    explanation:
      "Waiting in a queue contributes to latency when the queue is inside the timing boundary.",
  },
  {
    source: "throughput",
    target: "queue",
    label: "arrivals and exits",
    explanation:
      "Compare admissions with all departures at the queue boundary to explain backlog growth. Useful throughput separately counts completions that meet the declared outcome criteria.",
  },
  {
    source: "throughput",
    target: "saturation",
    label: "completion limit",
    explanation:
      "The saturated stage bounds the sustainable completion rate for the declared workload.",
  },
  {
    source: "queue",
    target: "saturation",
    label: "overload signal",
    explanation:
      "A growing queue can expose pressure above completion capacity, even while acknowledgments remain fast.",
  },
  {
    source: "queue",
    target: "little-law",
    label: "flow averages",
    explanation:
      "Little's Law connects stable work in progress, including queued and processing work, to rate and average time.",
  },
  {
    source: "little-law",
    target: "amdahl-law",
    label: "different questions",
    explanation:
      "Little's Law checks stable flow averages; Amdahl's Law bounds ideal fixed-workload parallel speedup.",
  },
  {
    source: "throughput",
    target: "amdahl-law",
    label: "ideal gain vs output",
    explanation:
      "An Amdahl speedup bound does not guarantee accepted-change throughput; review, coordination, and correctness still matter.",
  },
  {
    source: "latency",
    target: "little-law",
    label: "mean vs percentile",
    explanation:
      "Little's Law uses average time inside the boundary, not a tail percentile such as p95.",
  },
  ...bookConceptRelationships,
];
