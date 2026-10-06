import type { Course, Phase } from "./course.ts";

export const requirementVersion = "2026-10-v2";
// Old runs without a stored edition retain this first edition when new ones are added.
export const legacyRequirementVersion = "2026-10-v1";
export type RequirementDocument = "introduction" | "common" | Phase | "grading";
export interface RequirementEntry {
  id: string;
  title: string;
  detail: string;
  document: RequirementDocument;
  anchor: string;
}
export interface EvidenceCheckpoint {
  id: string;
  status: "unindexed" | "located" | "missing";
  location: string;
}
export interface PhaseReference {
  phase: "establish" | "challenge";
  group: string;
  frozenRevision: string;
}
const entry = (
  id: string,
  title: string,
  detail: string,
  document: RequirementDocument,
  anchor: string,
): RequirementEntry => ({ id, title, detail, document, anchor });
const common = [
  entry(
    "behavior",
    "Application behavior and acceptance",
    "Workspaces, the three-stage work-item lifecycle and event recording, feed ordering and filters, summary, validation/errors, and restart persistence. Index the twelve acceptance-scenario results, tests and known defects.",
    "common",
    "4-common-acceptance-scenarios",
  ),
  entry(
    "source",
    "Minimal reproducible source",
    "Source, relevant tests, synthetic fixtures, manifests/lockfiles, migrations, setup scripts, example configuration and curated technical evidence. Exclude installed dependencies, .git, caches, reproducible output, weights, secrets and personal data; document necessary vendored/generated exceptions.",
    "common",
    "9-5-package-the-source",
  ),
  entry(
    "harness",
    "Supported setup and project harness",
    "Explain unpacking, prerequisites and pinned versions, dependency installation, configuration, fixture initialization, running and automated validation. Include AI instructions, the maintained event-workflow feature specification and architecture note.",
    "common",
    "6-minimum-project-harness",
  ),
  entry(
    "configuration",
    "Development setup and data paths",
    "Identify implementation/commit, stack/storage/deployment, model and inference route, agent/version, imported capabilities, orchestration, hardware/environment and fallback policy. Record exposed revisions, context and resource limits; mark unavailable fields.",
    "common",
    "9-1-development-setup",
  ),
  entry(
    "effort",
    "Effort and representative AI-assisted work",
    "Elapsed and active human time, usage/cost/resource observations and gaps, consequential failures and interventions. Index one task brief, configuration, compact trace/checks, correction and acceptance decision; do not use an uncurated transcript as the main evidence.",
    "common",
    "9-2-effort-and-execution",
  ),
  entry(
    "baseline",
    "Shared workload and resource baseline",
    "Index the fixed fixture, seeded operation mix, adapter/boundary, warm-up and both measured profiles with all repetitions. Record deadlines, valid latency/counts, expected rejections versus failures, censored/unfinished outcomes, reconciliation, correctness and the consistent resource proxy.",
    "common",
    "7-1-shared-baseline-workload",
  ),
  entry(
    "architecture",
    "Architecture and data flow",
    "Diagram and explanation of the core event workflow, state authority, request/data paths, contracts and ownership. Index the stack decision, assumptions and operational path.",
    "common",
    "9-4-engineering-explanation",
  ),
  entry(
    "pressure",
    "Cumulative pressure and bounded claims",
    "Index the primary-pressure transformation and relevant additional scenarios. State limits, first signal, candidate response, prepared recovery and new obligations; distinguish measurements from projections and explanations.",
    "common",
    "7-2-progressive-pressure-analysis",
  ),
  entry(
    "friction",
    "Friction and engineering reflection",
    "Cover setup, comprehension, change, testing, review, deployment, operations and coordination; identify the largest resistance, a follow-up decision, and observation versus interpretation.",
    "common",
    "9-4-engineering-explanation",
  ),
  entry(
    "shared-session",
    "Shared engineering session",
    "Index the existing session record: operator/challenger/validator, individual predictions, the phase question, check, non-operator acceptance decision and uncertainty. Rotate responsibilities across phases; this is part of ordinary project work.",
    "common",
    "shared-engineering-sessions",
  ),
  entry(
    "audit-response",
    "Bounded audit and author response",
    "The assigned audit identifies the frozen revision, setup and probe times, prior inspection/tools, checks, patch and findings. Complete technical evidence and respond without replacing the frozen implementation. Keep individual portfolios and peer reports private.",
    "common",
    "10-bounded-cross-team-audit",
  ),
];
const phaseEntries: Record<Phase, RequirementEntry[]> = {
  establish: [
    entry(
      "a-fresh-local",
      "Fresh A and approved local single agent",
      "Start cleanly under the transfer policy. Use only the approved local inference route, fail closed on other routes/fallbacks, and run one coding agent without delegation; disclose consequential manual work.",
      "establish",
      "2-development-system-constraint",
    ),
    entry(
      "a-scope",
      "Closed product loop and starter decisions",
      "Describe the first closed loop and deferred scope. If using a starter, identify its source/revision and keep/replace/remove/decide choices; review the exact removal set.",
      "establish",
      "3-1-implement-the-common-core",
    ),
    entry(
      "a-stack",
      "Stack hypothesis and revisit condition",
      "Explain suitability, learning question, local-model understanding and setup/operation/change risks; identify reversible choices, hardening dependencies and evidence for review.",
      "establish",
      "3-3-record-the-stack-hypothesis",
    ),
    entry(
      "a-claims",
      "Runtime and contributor claims",
      "Give two bounded claims with goal, pressure, range, boundary, constraints, first limit/signal, response, trade-off, evidence and one excluded dimension. Define the repeatable primary pressure; label projections.",
      "establish",
      "3-4-analyze-initial-scalability",
    ),
    entry(
      "a-ownership",
      "Capability ownership card",
      "Index the ownership card for the main event workflow.",
      "establish",
      "4-deliverables",
    ),
    entry(
      "a-reflection",
      "Local-workflow reflection",
      "What worked, what needed smaller tasks/context/correction/manual work, and which limits belong to model, harness, hardware/environment or project? Tie interpretations to evidence.",
      "establish",
      "4-deliverables",
    ),
  ],
  challenge: [
    entry(
      "b-fresh-model",
      "Fresh B and approved comparison single agent",
      "Start cleanly; do not copy A source, implementation tests or configuration. Declare the different approved model, one-agent boundary, substantial manual work, stable stack or approved change and its confounding effect.",
      "challenge",
      "2-starting-conditions",
    ),
    entry(
      "b-architecture",
      "Architecture hypothesis and ownership",
      "Index B's architecture hypothesis and updated ownership card for the event workflow.",
      "challenge",
      "5-deliverables",
    ),
    entry(
      "b-pressure",
      "Repeat primary and add secondary pressure",
      "Repeat the baseline and A's primary transformation. Select a secondary pressure exposed by an architectural difference; analyze both A and B, measure when practical, and preserve projections and limitations.",
      "challenge",
      "4-4-apply-runtime-pressure",
    ),
    entry(
      "b-little-law",
      "Little's Law over one conserved window",
      "Identify a queue/pool/path in A or B; report L, completion rate and W for the same window, balance assumptions and approximate coherence. Interpret the boundary without claiming an unobserved cause or stability.",
      "challenge",
      "4-4-apply-runtime-pressure",
    ),
    entry(
      "b-response",
      "Justified response and new obligations",
      "Connect a failed assumption or limit to a response pattern; name its correctness, failure, operational or recovery obligation even when the response remains a hypothesis.",
      "challenge",
      "4-4-apply-runtime-pressure",
    ),
    entry(
      "b-case",
      "Documented-case transfer and pressure map",
      "Link the source and separate reported facts, interpretation and project transfer. Trace boundaries, assumption, amplification, user effect, first signal, recovery and evidence of completion.",
      "challenge",
      "4-4-apply-runtime-pressure",
    ),
    entry(
      "b-comparison",
      "A–B case comparison",
      "Compare behavior, architecture, tests/defects, audit friction, human/model effort, intervention and scope. Separate observations, possible and alternative explanations, practice/configuration effects and what the evidence cannot establish.",
      "challenge",
      "4-3-compare-the-two-single-agent-workflows",
    ),
  ],
  compare: [
    entry(
      "c-fresh-fleet",
      "Fresh C with real delegated work",
      "At least two independent instances/delegated executions, responsibilities and outputs, a handoff/integration/parallel branch, and review before acceptance. Keep B's model/stack where practical and declare differences; fictional perspectives do not count.",
      "compare",
      "3-what-counts-as-a-fleet",
    ),
    entry(
      "c-plan",
      "Fleet plan, authority and coordination",
      "Task graph, tools/files, shared-state writers/readers/lifetime, identity and policy/budget/trace handoffs, validation, dependencies, integration owner, approvals and stop conditions. Record parallel work, duplication, blocked time, failures, total usage and human review/correction.",
      "compare",
      "4-fleet-plan",
    ),
    entry(
      "c-trace",
      "Curated trace, loader and debugging findings",
      "A documented machine-readable transformation of the actual run mapped to application entities/events, a repeatable loader into C, redaction and application views answering at least two debugging questions. Preserve consequential validation, integration, failure and intervention.",
      "compare",
      "5-3-turn-the-fleet-trace-into-debugging-data",
    ),
    entry(
      "c-pair",
      "Bounded single-agent/fleet contrast",
      "Index B–C case analysis and a paired task or supplied traces with provenance. Same accepted revision, brief/checks, model/harness/permissions, fresh copies/sessions, intervention policy, predeclared ≤20-minute limit per attempt and aggregate resource limit; preserve failures and accounting gaps. One pair does not establish a general effect.",
      "compare",
      "5-4-compare-one-agent-with-the-fleet",
    ),
    entry(
      "c-workflow-model",
      "Workflow model",
      "Apply a relevant scalability law/formal model to coordination, sequential work, review capacity or accepted throughput; name assumptions and limits.",
      "compare",
      "5-4-compare-one-agent-with-the-fleet",
    ),
    entry(
      "c-application-model",
      "Separate application model",
      "Apply a law/model to an architecture decision under the selected pressure; variables, assumptions, calculation/reasoning, runtime evidence and what the model misses. This is separate from the workflow model.",
      "compare",
      "5-5-analyze-the-three-applications",
    ),
    entry(
      "c-response",
      "Implemented scaling response",
      "Preserve the accepted revision/baseline, implement the smallest justified response in A, B or C, hold workload/fixture/checks constant, rerun acceptance and pressure with all repetitions, compare outcomes/resources, and exercise the new failure/recovery obligation. Preserve unsuccessful results.",
      "compare",
      "5-6-implement-and-evaluate-one-scaling-response",
    ),
    entry(
      "c-deployment",
      "Realistic deployment and workload",
      "Deploy the chosen post-experiment revision outside the author's development process in an approved environment; rerun the shared baseline and report configuration, operation, local/deployed differences, first constraint and limits.",
      "compare",
      "5-7-validate-one-realistic-deployment",
    ),
    entry(
      "c-index",
      "Four indexed bundles with A/B record links",
      "Use sections for C/common implementation, fleet evidence, scaling/deployment and final decision. Link earlier A and B submissions and their evidence; one artifact can satisfy several requirements without duplicate archives.",
      "compare",
      "6-deliverables",
    ),
    entry(
      "c-decision",
      "Conditional A–B–C engineering decision",
      "Evidence matrix, target architecture and scaling trade-offs; observation versus inference/proposal, optional scope and confounders, chosen architecture/workflow under stated constraints, rejected alternatives, remaining human/operational ownership and next saturation signal/revisit measurement.",
      "compare",
      "7-final-comparison",
    ),
  ],
};
export const requirementEditions = {
  "2026-10-v1": {
    common,
    phases: phaseEntries,
    rubric: "2026-10-individual-minima-v1",
  },
  "2026-10-v2": {
    common: common.map((item) =>
      item.id === "shared-session"
        ? {
            ...item,
            title: "Engineering session and independent challenge",
            detail:
              "Group route: rotating operator/challenger/validator and non-operator acceptance. Approved solo route: prediction before agent use, explicit operator/challenger/validator passes and an instructor discussion per phase. Index checks, acceptance and remaining uncertainty in the existing evidence.",
          }
        : item.id === "audit-response"
          ? {
              ...item,
              detail:
                "Retain the incoming independent audit and author response. Solo students also audit an instructor-supplied frozen reference or assigned group, with separate setup/probe times, prior exposure, tools, checks and findings. Keep private assessment material outside the technical bundle.",
            }
          : item,
    ),
    phases: Object.fromEntries(
      Object.entries(phaseEntries).map(([phase, entries]) => [
        phase,
        [
          ...entries,
          entry(
            `${phase}-solo`,
            "Approved solo route (when allocated)",
            "If the instructor allocated the solo route, index the phase-specific solo work, instructor check-in, incoming independent audit, outgoing reference audit and portfolio under the published solo equivalents. Group-route students mark this entry as not applicable with their allocation reference.",
            phase as Phase,
            "solo-route",
          ),
        ],
      ]),
    ) as Record<Phase, RequirementEntry[]>,
    rubric: "2026-10-solo-equivalence-v2",
  },
} as const;
export function requirementsFor(course: Pick<Course, "requirements">) {
  const version = course.requirements ?? legacyRequirementVersion;
  const edition =
    requirementEditions[version as keyof typeof requirementEditions];
  if (!edition) throw new Error(`Unsupported requirement edition: ${version}`);
  return { version, ...edition };
}
export function checklistEntries(
  course: Pick<Course, "requirements">,
  phase: Phase,
) {
  const edition = requirementsFor(course);
  return [...edition.common, ...edition.phases[phase]];
}
export const emptyChecklist = (
  course: Pick<Course, "requirements">,
  phase: Phase,
): EvidenceCheckpoint[] =>
  checklistEntries(course, phase).map((r) => ({
    id: r.id,
    status: "unindexed",
    location: "",
  }));
export const requirementUrl = (
  version: string,
  document: RequirementDocument,
  anchor = "",
) =>
  `/project/requirements/${version}/${document}/${anchor ? `#${anchor}` : ""}`;
