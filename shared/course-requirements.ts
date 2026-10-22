import type { Course, Phase } from "./course.ts";

export const requirementVersion = "2026-10-v2";
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
    "Explain unpacking, prerequisites and pinned versions, dependency installation, configuration, fixture initialization, running and automated validation. Include AI instructions, readable maintained-specification and evolving decision-log snapshots, their use in the representative task, and the architecture note.",
    "common",
    "6-minimum-project-harness",
  ),
  entry(
    "configuration",
    "Development setup and data paths",
    "Identify implementation/commit and stack/storage/deployment. Link the exact course-configuration version or snapshot, confirm actual models, assignments, routes and environment, and record deviations. Refer to unchanged tool, capability, orchestration, resource and data-path details; add material exposed settings and mark unavailable fields honestly.",
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
    "Diagram and explanation of the core event workflow plus the standard six-field ownership card in the phase index: entry points, state authority, public contracts, dependency direction, excluded responsibilities, and validation/acceptance. Link maintained intent, evolving decisions, phase-specific status and the operational path.",
    "common",
    "9-4-engineering-explanation",
  ),
  entry(
    "pressure",
    "Cumulative pressure and bounded claims",
    "Index the same primary-pressure procedure across A/B/C, the bounded B correctness/recovery case and C scaling response. State conditions, procedure, evidence, limits, signal, response and recovery; preserve repetitions and failures. Further scenarios are optional; retain the arrival-controlled procedure for applicable claims.",
    "common",
    "7-2-progressive-pressure-analysis",
  ),
  entry(
    "friction",
    "Friction and engineering reflection",
    "Index one concrete development bottleneck per phase, supporting observations, response/rationale, and a checked improvement or justified follow-up. The eight categories are prompts; no exhaustive commentary is required. Preserve both audits and distinguish observed outcomes from proposed improvements.",
    "common",
    "9-4-engineering-explanation",
  ),
  entry(
    "shared-session",
    "Engineering session and independent challenge",
    "Group route: rotating operator/challenger/validator and non-operator acceptance. Approved solo route: prediction before agent use, explicit operator/challenger/validator passes and an instructor discussion per phase. Index checks, acceptance and remaining uncertainty in the existing evidence.",
    "common",
    "shared-engineering-sessions",
  ),
  entry(
    "audit-response",
    "Bounded audit and author response",
    "Retain the incoming independent audit and author response. Solo students also audit an instructor-supplied frozen reference or assigned group, with separate setup/probe times, prior exposure, tools, checks and findings. Keep private assessment material outside the technical bundle.",
    "common",
    "10-bounded-cross-team-audit",
  ),
];
const phaseEntries: Record<Phase, RequirementEntry[]> = {
  establish: [
    entry(
      "a-fresh-model",
      "Fresh A and approved large-model single agent",
      "Start cleanly under the transfer policy. Use only the approved large-model inference route, fail closed on other routes/fallbacks, and run one coding agent without delegation; disclose consequential manual work.",
      "establish",
      "development-system-constraint",
    ),
    entry(
      "a-scope",
      "Closed product loop and starter decisions",
      "Describe the first closed loop and deferred scope. If using a starter, identify source/revision, material changes and inherited assumptions, with consequential choices in the decision log; review removals. The detailed keep/replace/remove/decide inventory is optional.",
      "establish",
      "implement-the-common-core",
    ),
    entry(
      "a-stack",
      "Stack hypothesis and revisit condition",
      "Explain suitability, learning question, assigned-model understanding and setup/operation/change risks; identify reversible choices, hardening dependencies and evidence for review.",
      "establish",
      "record-the-stack-hypothesis",
    ),
    entry(
      "a-claims",
      "Runtime and contributor claims",
      "Give two bounded claims with goal, pressure, range, boundary, constraints, first limit/signal, response, trade-off, evidence and one excluded dimension. Define the repeatable primary pressure; label projections.",
      "establish",
      "analyze-initial-scalability",
    ),
    entry(
      "a-ownership",
      "Capability ownership card",
      "Index the ownership card for the main event workflow.",
      "establish",
      "what-to-do-and-submit",
    ),
    entry(
      "a-reflection",
      "Large-model workflow reflection",
      "What worked, what needed smaller tasks/context/correction/manual work, and which limits belong to model, harness, hardware/environment or project? Tie interpretations to evidence.",
      "establish",
      "what-to-do-and-submit",
    ),
  ],
  challenge: [
    entry(
      "b-fresh-model",
      "Fresh B and approved small-model single agent",
      "Start cleanly; do not copy A source, implementation tests or configuration. Declare the approved small model and inference route, one-agent boundary, substantial manual work, stable stack or approved change and its confounding effect.",
      "challenge",
      "starting-conditions",
    ),
    entry(
      "b-architecture",
      "Architecture hypothesis and ownership",
      "Index B's architecture hypothesis and updated ownership card for the event workflow.",
      "challenge",
      "what-to-do-and-submit",
    ),
    entry(
      "b-pressure",
      "Repeat primary and investigate correctness or recovery",
      "Repeat the baseline and A's primary transformation. Investigate one bounded correctness or recovery case, reusing the engineering session: prediction, challenged assumption, checked outcome and acceptance. Further scenarios are optional; preserve projections and limitations.",
      "challenge",
      "apply-runtime-pressure",
    ),
    entry(
      "b-little-law",
      "Little's Law over one conserved window",
      "Identify a queue/pool/path in A or B; report L, completion rate and W for the same window, balance assumptions and approximate coherence. Interpret the boundary without claiming an unobserved cause or stability.",
      "challenge",
      "apply-runtime-pressure",
    ),
    entry(
      "b-response",
      "Justified response and new obligations",
      "Connect a failed assumption or limit to a response pattern; name its correctness, failure, operational or recovery obligation even when the response remains a hypothesis.",
      "challenge",
      "apply-runtime-pressure",
    ),
    entry(
      "b-case",
      "Incident-transfer activity reference",
      "Link the chapter 6 activity entry with its source, failed assumption, signal, response and recovery lesson relevant to B. Assess it through existing activity/diary criteria; no additional detailed project incident pressure map or reproduction is required.",
      "challenge",
      "apply-runtime-pressure",
    ),
    entry(
      "b-comparison",
      "A–B case comparison",
      "Compare behavior, architecture, tests/defects, audit friction, human/model effort, intervention and scope. Separate observations, possible and alternative explanations, practice/configuration effects and what the evidence cannot establish.",
      "challenge",
      "compare-the-two-single-agent-workflows",
    ),
  ],
  compare: [
    entry(
      "c-fresh-fleet",
      "Fresh C with real delegated work",
      "At least two independent instances/delegated executions, responsibilities and outputs, a handoff/integration/parallel branch, and review before acceptance. Use B's small model as the reference; declare permitted small/large models, role/task assignments and routing/fallback. Keep the primary stack where practical; fictional perspectives do not count.",
      "compare",
      "what-counts-as-a-fleet",
    ),
    entry(
      "c-plan",
      "Fleet plan, authority and coordination",
      "Task graph, model assignments and quality/time/cost hypothesis, tools/files, shared-state writers/readers/lifetime, identity and policy/budget/trace handoffs, validation, dependencies, integration owner, approvals and stop conditions. Record parallel work, duplication, blocked time, failures, actual model/route per attempt, aggregate usage/cost and its declared basis, and human review/correction.",
      "compare",
      "fleet-plan",
    ),
    entry(
      "c-trace",
      "Actual fleet-run evidence and debugging findings",
      "A compact redacted record of the actual fleet run, with relevant tasks/actors, handoffs, validation, integration, failure, correction and human intervention supporting at least two debugging findings and their limits. Curated logs or a table suffice; trace transformation, import and application views are optional.",
      "compare",
      "analyze-the-actual-fleet-run",
    ),
    entry(
      "c-pair",
      "Supplied matched single-agent/fleet analysis",
      "Index B–C case analysis and the activity analysis of supplied matched traces: provenance, brief, configurations, checks/outcomes, controls, time, human effort, resources, corrections and gaps. Label synthetic data and limits; supplied observations are not your own results or general effects. Your own matched pair is optional under the published frozen-revision, small-model, equal time/resource and intervention controls.",
      "compare",
      "supplied-matched-single-agent-fleet-analysis",
    ),
    entry(
      "c-workflow-model",
      "Workflow model",
      "Apply a relevant scalability law/formal model to coordination, sequential work, review capacity or accepted throughput; name assumptions and limits.",
      "compare",
      "compare-one-agent-with-the-fleet",
    ),
    entry(
      "c-application-model",
      "Separate application model",
      "Apply a law/model to an architecture decision under the selected pressure; variables, assumptions, calculation/reasoning, runtime evidence and what the model misses. This is separate from the workflow model.",
      "compare",
      "analyze-the-three-applications",
    ),
    entry(
      "c-response",
      "Implemented scaling response",
      "Preserve the accepted revision/baseline, implement the smallest justified response in A, B or C, hold workload/fixture/checks constant, rerun acceptance and pressure with all repetitions, compare outcomes/resources, and exercise the new failure/recovery obligation. Preserve unsuccessful results.",
      "compare",
      "implement-and-evaluate-one-scaling-response",
    ),
    entry(
      "c-deployment",
      "Realistic deployment and workload",
      "Deploy the chosen post-experiment revision outside the author's development process in an approved environment; rerun the shared baseline and report configuration, operation, local/deployed differences, first constraint and limits.",
      "compare",
      "validate-one-realistic-deployment",
    ),
    entry(
      "c-index",
      "Four indexed bundles with A/B record links",
      "Use sections for C/common implementation, fleet evidence, scaling/deployment and final decision. Link earlier A and B submissions and their evidence; one artifact can satisfy several requirements without duplicate archives.",
      "compare",
      "what-to-do-and-submit",
    ),
    entry(
      "c-decision",
      "Conditional A–B–C engineering decision",
      "Evidence matrix, target architecture and scaling trade-offs; observation versus inference/proposal, optional scope and confounders, chosen architecture/workflow under stated constraints, rejected alternatives, remaining human/operational ownership and next saturation signal/revisit measurement.",
      "compare",
      "final-comparison",
    ),
  ],
};
export const requirementEditions = {
  "2026-10-v2": {
    common,
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
  const version = course.requirements ?? requirementVersion;
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
