type ReadinessId = "high" | "medium" | "low";
type TaskId = "bottleneck" | "tests" | "refactor";
type RoleId = "scout" | "planner" | "implementer" | "reviewer";
type AgentModelId = "small" | "balanced" | "strong";
type PacketId = RoleId | "brief" | "submission";

type TaskConfig = {
  label: string;
  objective: string;
  evidence: string;
  nonGoal: string;
  validation: string;
  changeSize: number;
  projectContext: ProjectContext;
};

type ProjectContext = {
  module: string;
  validation: string;
  allowedFiles: string;
  branch: string;
  context: string;
};

type AgentModelConfig = {
  label: string;
  costPerUnit: number;
  latencyPerUnit: number;
  reviewModifier: number;
  riskModifier: number;
};

const readinessPenalty: Record<ReadinessId, number> = {
  high: 0,
  medium: 2,
  low: 5,
};

const taskConfigs: Record<TaskId, TaskConfig> = {
  bottleneck: {
    label: "Investigate a scaling bottleneck",
    objective:
      "Identify one likely bottleneck in the event tracking project and propose a measurement before changing code.",
    evidence:
      "Name the endpoint, query, data flow, or file that supports the claim.",
    nonGoal: "Do not redesign the system or apply speculative optimizations.",
    validation:
      "A benchmark, query plan, trace, or log signal that can confirm or reject the bottleneck.",
    changeSize: 2,
    projectContext: {
      module: "event-tracker API",
      validation: "npm test -- events",
      allowedFiles:
        "src/routes/events.ts\nsrc/db/events.ts\ntests/events.test.ts",
      branch: "agent-fleet/latest-events-bottleneck",
      context:
        "The app records project events and shows the latest 50 events per project. GET /events runs SELECT * FROM events WHERE project_id = ? ORDER BY created_at DESC LIMIT 50. The migration has indexes on project_id and event_type, but not created_at.",
    },
  },
  tests: {
    label: "Add regression tests for one workflow",
    objective:
      "Add focused tests for one event recording or querying workflow that currently lacks coverage.",
    evidence: "Name the workflow, existing behavior, and test file touched.",
    nonGoal: "Do not rewrite the application structure while adding tests.",
    validation:
      "The new test fails for the broken behavior and passes after the fix.",
    changeSize: 2,
    projectContext: {
      module: "event creation workflow",
      validation: "npm test -- create-event",
      allowedFiles:
        "src/routes/events.ts\nsrc/validation/events.ts\ntests/create-event.test.ts",
      branch: "agent-fleet/event-creation-regression",
      context:
        "The browser submits POST /events with type, entityId, and occurredAt. Recent bug reports say malformed events can reach storage when client-side validation is bypassed.",
    },
  },
  refactor: {
    label: "Refactor one bounded module",
    objective:
      "Improve one module boundary without changing user-visible behavior.",
    evidence:
      "Name the module boundary and the behavior that must stay stable.",
    nonGoal: "Do not change database schema, routes, or public API contracts.",
    validation:
      "Existing tests pass and one characterization test protects the refactor.",
    changeSize: 3,
    projectContext: {
      module: "event storage module",
      validation: "npm test -- event-storage",
      allowedFiles:
        "src/db/events.ts\nsrc/db/event-queries.ts\ntests/event-storage.test.ts",
      branch: "agent-fleet/event-storage-boundary",
      context:
        "Event storage mixes query construction, result mapping, and pagination defaults in one module. The API contract must stay stable while the storage boundary becomes easier to review.",
    },
  },
};

const roleOutput: Record<RoleId, string> = {
  scout: "Scout returns compressed findings with file references and unknowns.",
  planner:
    "Planner turns findings into scope, risks, allowed files, and acceptance criteria.",
  implementer: "Implementer makes one bounded change and reports commands run.",
  reviewer:
    "Reviewer inspects the diff, tests, regressions, and missing evidence.",
};

const roleWorkUnits: Record<RoleId, number> = {
  scout: 1,
  planner: 1.4,
  implementer: 2.4,
  reviewer: 1.6,
};

const roleRiskWeight: Record<RoleId, number> = {
  scout: 1,
  planner: 2,
  implementer: 3,
  reviewer: 2,
};

const agentModels: Record<AgentModelId, AgentModelConfig> = {
  small: {
    label: "Profile P",
    costPerUnit: 0.03,
    latencyPerUnit: 1.5,
    reviewModifier: 1.35,
    riskModifier: 1.2,
  },
  balanced: {
    label: "Profile Q",
    costPerUnit: 0.12,
    latencyPerUnit: 3.5,
    reviewModifier: 1,
    riskModifier: 0,
  },
  strong: {
    label: "Profile R",
    costPerUnit: 0.38,
    latencyPerUnit: 7,
    reviewModifier: 0.72,
    riskModifier: -0.8,
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-agent-fleet]",
)) {
  initializeAgentFleetDemo(root);
}

function initializeAgentFleetDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-agent-fleet-form]");
  const readiness = root.querySelector<HTMLSelectElement>(
    "[data-agent-fleet-readiness]",
  );
  const task = root.querySelector<HTMLSelectElement>("[data-agent-fleet-task]");
  const roles = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-agent-fleet-role]"),
  );
  const modelSelects = Array.from(
    root.querySelectorAll<HTMLSelectElement>("[data-agent-fleet-model]"),
  );
  const modelRows = Array.from(
    root.querySelectorAll<HTMLElement>("[data-agent-fleet-model-row]"),
  );
  const verdict = root.querySelector<HTMLElement>("[data-agent-fleet-verdict]");
  const workflowSteps = root.querySelector<HTMLElement>(
    "[data-agent-fleet-steps]",
  );
  const coordination = root.querySelector<HTMLElement>(
    "[data-agent-fleet-coordination]",
  );
  const risk = root.querySelector<HTMLElement>("[data-agent-fleet-risk]");
  const pattern = root.querySelector<HTMLElement>("[data-agent-fleet-pattern]");
  const modelCost = root.querySelector<HTMLElement>(
    "[data-agent-fleet-model-cost]",
  );
  const modelLatency = root.querySelector<HTMLElement>(
    "[data-agent-fleet-model-latency]",
  );
  const reviewTime = root.querySelector<HTMLElement>(
    "[data-agent-fleet-review-time]",
  );
  const rework = root.querySelector<HTMLElement>("[data-agent-fleet-rework]");
  const modelImpact = root.querySelector<HTMLElement>(
    "[data-agent-fleet-model-impact]",
  );
  const brief = root.querySelector<HTMLTextAreaElement>(
    "[data-agent-fleet-brief]",
  );
  const packetTabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-agent-fleet-packet-tab]"),
  );
  const copy = root.querySelector<HTMLButtonElement>("[data-agent-fleet-copy]");

  if (
    !form ||
    !readiness ||
    !task ||
    !verdict ||
    !workflowSteps ||
    !coordination ||
    !risk ||
    !pattern ||
    !modelCost ||
    !modelLatency ||
    !reviewTime ||
    !rework ||
    !modelImpact ||
    !brief ||
    packetTabs.length === 0 ||
    !copy
  ) {
    return;
  }

  let currentPacket: PacketId = "brief";
  const render = () => {
    const selectedTask =
      taskConfigs[task.value as TaskId] ?? taskConfigs.bottleneck;
    const selectedReadiness = readiness.value as ReadinessId;
    const selectedRoles = getSelectedRoles(roles);
    const selectedModels = getSelectedModels(modelSelects);
    const projectContext = selectedTask.projectContext;
    const changeSize = selectedTask.changeSize;
    const score = getCoordinationScore(
      selectedReadiness,
      selectedRoles.length,
      changeSize,
    );
    const modelResult = getModelImpact(
      selectedRoles,
      selectedModels,
      selectedReadiness,
      changeSize,
    );
    const riskLabel = getRiskLabel(score + modelResult.riskPenalty);
    const patternLabel = getPatternLabel(
      selectedRoles,
      selectedReadiness,
      score + modelResult.riskPenalty,
    );
    const packets = buildRunPackets({
      selectedTask,
      selectedReadiness,
      selectedRoles,
      selectedModels,
      projectContext,
      changeSize,
      riskLabel,
      patternLabel,
      modelResult,
    });

    updateModelRows(selectedRoles, modelRows, modelSelects);
    coordination.textContent = `${score}/10`;
    risk.textContent = riskLabel;
    pattern.textContent = patternLabel;
    modelCost.textContent = `${modelResult.cost.toFixed(2)} EUR`;
    modelLatency.textContent = `${Math.round(modelResult.latency)} min`;
    reviewTime.textContent = `${Math.round(modelResult.reviewMinutes)} min`;
    rework.textContent = getRiskLabel(modelResult.reworkScore);
    modelImpact.textContent = buildModelImpactSummary(modelResult);
    verdict.textContent =
      selectedRoles.length > 1
        ? `${selectedRoles.length} roles, ${riskLabel.toLowerCase()} modeled risk`
        : "Use one careful agent";
    workflowSteps.innerHTML = buildSteps(selectedRoles)
      .map((item) => `<li>${escapeAgentFleetHtml(item)}</li>`)
      .join("");
    currentPacket = getAvailablePacket(currentPacket, selectedRoles);
    updatePacketTabs(packetTabs, currentPacket, selectedRoles);
    brief.value = packets[currentPacket];
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  packetTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const packet = tab.dataset.agentFleetPacketTab as PacketId | undefined;

      if (!packet || tab.disabled) {
        return;
      }

      currentPacket = packet;
      render();
      brief.focus({ preventScroll: true });
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const availableTabs = packetTabs.filter(
        (candidate) => !candidate.disabled,
      );
      const currentIndex = availableTabs.indexOf(tab);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? availableTabs.length - 1
            : (currentIndex +
                (event.key === "ArrowRight" ? 1 : -1) +
                availableTabs.length) %
              availableTabs.length;
      const nextTab = availableTabs[nextIndex];

      if (!nextTab) {
        return;
      }

      currentPacket = nextTab.dataset.agentFleetPacketTab as PacketId;
      render();
      nextTab.focus();
    });
  });
  copy.addEventListener("click", async () => {
    brief.select();

    try {
      await navigator.clipboard?.writeText(brief.value);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy packet";
      }, 1400);
    } catch {
      copy.textContent = "Select text";
    }
  });

  render();
}

function getSelectedRoles(roleInputs: HTMLInputElement[]) {
  return roleInputs
    .filter((role) => role.checked)
    .map((role) => role.value as RoleId);
}

function getSelectedModels(modelInputs: HTMLSelectElement[]) {
  return modelInputs.reduce(
    (selected, input) => {
      const role = input.dataset.agentFleetModel as RoleId | undefined;
      const model = input.value as AgentModelId;

      if (role && agentModels[model]) {
        selected[role] = model;
      }

      return selected;
    },
    {} as Record<RoleId, AgentModelId>,
  );
}

function updateModelRows(
  selectedRoles: RoleId[],
  rows: HTMLElement[],
  modelInputs: HTMLSelectElement[],
) {
  const selected = new Set(selectedRoles);

  rows.forEach((row) => {
    const role = row.dataset.agentFleetModelRow as RoleId | undefined;
    const active = role ? selected.has(role) : false;

    row.classList.toggle("is-disabled", !active);
  });
  modelInputs.forEach((input) => {
    const role = input.dataset.agentFleetModel as RoleId | undefined;

    input.disabled = role ? !selected.has(role) : true;
  });
}

function getCoordinationScore(
  readiness: ReadinessId,
  roleCount: number,
  changeSize: number,
) {
  const base = Math.max(0, roleCount - 1) * 2;
  const sizePenalty = Math.max(0, changeSize - 2);

  return Math.min(10, base + sizePenalty + readinessPenalty[readiness]);
}

function getRiskLabel(score: number) {
  if (score >= 8) {
    return "High";
  }

  if (score >= 5) {
    return "Medium";
  }

  return "Low";
}

function getModelImpact(
  roles: RoleId[],
  models: Record<RoleId, AgentModelId>,
  readiness: ReadinessId,
  changeSize: number,
) {
  if (roles.length === 0) {
    return {
      cost: 0,
      latency: 0,
      reviewMinutes: 0,
      riskPenalty: 0,
      reworkScore: 0,
      strongestRole: null as RoleId | null,
      weakestRole: null as RoleId | null,
    };
  }

  const readinessReviewPenalty = readinessPenalty[readiness] * 4;
  const baseReview = 10 + roles.length * 5 + changeSize * 4;
  let cost = 0;
  let latency = 0;
  let reviewMultiplierTotal = 0;
  let riskPenalty = 0;
  let strongestRole: RoleId | null = null;
  let weakestRole: RoleId | null = null;

  roles.forEach((role) => {
    const modelId = models[role] ?? "balanced";
    const model = agentModels[modelId];
    const work = roleWorkUnits[role];

    cost += model.costPerUnit * work * changeSize;
    latency += model.latencyPerUnit * work;
    reviewMultiplierTotal += model.reviewModifier * roleRiskWeight[role];
    riskPenalty += model.riskModifier * roleRiskWeight[role];

    if (modelId === "strong") {
      strongestRole = role;
    }

    if (modelId === "small") {
      weakestRole = role;
    }
  });

  const riskWeightTotal = roles.reduce(
    (total, role) => total + roleRiskWeight[role],
    0,
  );
  const reviewMinutes =
    (baseReview + readinessReviewPenalty) *
    (reviewMultiplierTotal / Math.max(1, riskWeightTotal));
  const reworkScore =
    readinessPenalty[readiness] + changeSize + Math.max(0, riskPenalty);

  return {
    cost,
    latency,
    reviewMinutes,
    riskPenalty,
    reworkScore,
    strongestRole,
    weakestRole,
  };
}

function buildModelImpactSummary(
  modelResult: ReturnType<typeof getModelImpact>,
) {
  if (!modelResult.weakestRole && !modelResult.strongestRole) {
    return "Profile Q uses the middle cost, latency, and review assumptions in this simulation.";
  }

  if (modelResult.weakestRole) {
    return `${capitalizeRole(modelResult.weakestRole)} uses profile P. This simulation assumes lower direct cost and latency but more review and rework for that role; verify that trade-off with actual tasks.`;
  }

  return `${capitalizeRole(modelResult.strongestRole)} uses profile R. This simulation assumes higher direct cost and latency but less review and rework for that role; higher spending does not establish that outcome.`;
}

function getPatternLabel(
  roles: RoleId[],
  readiness: ReadinessId,
  score: number,
) {
  if (readiness === "low") {
    return "Harden first";
  }

  if (roles.length <= 1 || score >= 8) {
    return "Single agent";
  }

  if (
    roles.includes("scout") &&
    roles.includes("planner") &&
    roles.length <= 2
  ) {
    return "Scout then plan";
  }

  if (roles.includes("implementer") && roles.includes("reviewer")) {
    return "Implement then review";
  }

  return "Sequential delegation";
}

function buildSteps(roles: RoleId[]) {
  if (roles.length === 0) {
    return [
      "No delegation yet. Assign at least one role or do the task manually.",
      "Keep a human-owned integration checklist either way.",
    ];
  }

  return roles.map((role) => roleOutput[role]);
}

function buildRunPackets(context: {
  selectedTask: TaskConfig;
  selectedReadiness: ReadinessId;
  selectedRoles: RoleId[];
  selectedModels: Record<RoleId, AgentModelId>;
  projectContext: ProjectContext;
  changeSize: number;
  riskLabel: string;
  patternLabel: string;
  modelResult: ReturnType<typeof getModelImpact>;
}) {
  return {
    brief: buildAgentFleetBrief(context),
    scout: buildRolePrompt("scout", context),
    planner: buildRolePrompt("planner", context),
    implementer: buildRolePrompt("implementer", context),
    reviewer: buildRolePrompt("reviewer", context),
    submission: buildSubmissionNote(context),
  } satisfies Record<PacketId, string>;
}

function buildAgentFleetBrief({
  selectedTask,
  selectedReadiness,
  selectedRoles,
  selectedModels,
  projectContext,
  changeSize,
  riskLabel,
  patternLabel,
  modelResult,
}: {
  selectedTask: TaskConfig;
  selectedReadiness: ReadinessId;
  selectedRoles: RoleId[];
  selectedModels: Record<RoleId, AgentModelId>;
  projectContext: ProjectContext;
  changeSize: number;
  riskLabel: string;
  patternLabel: string;
  modelResult: ReturnType<typeof getModelImpact>;
}) {
  const roles =
    selectedRoles.length > 0
      ? selectedRoles
          .map(
            (role) =>
              `- ${role} (${agentModels[selectedModels[role] ?? "balanced"].label}): ${roleOutput[role]}`,
          )
          .join("\n")
      : "- No role selected.";

  return `Example packet: replace model profiles and repository fields with your assigned configuration.

Objective:
${selectedTask.objective}

Project readiness:
${selectedReadiness}

Repository or module:
${projectContext.module}

Allowed files or directories:
${projectContext.allowedFiles}

Validation command:
${projectContext.validation}

Branch or working area:
${projectContext.branch}

Concrete project context:
${projectContext.context}

Change size:
${changeSize}/5

Recommended pattern:
${patternLabel}

Modeled integration risk:
${riskLabel}

Estimated model impact:
- Direct model cost: ${modelResult.cost.toFixed(2)} EUR
- Model latency: ${Math.round(modelResult.latency)} min
- Human review time: ${Math.round(modelResult.reviewMinutes)} min
- Modeled rework risk: ${getRiskLabel(modelResult.reworkScore)}

Roles and expected outputs:
${roles}

Allowed scope:
One bounded workflow or module. Keep file ownership explicit before editing.

Required evidence:
${selectedTask.evidence}

Validation:
${selectedTask.validation}

Non-goal:
${selectedTask.nonGoal}

Human review checkpoint:
Accept only outputs that name concrete files, commands, assumptions, and remaining risks.`;
}

function buildRolePrompt(
  role: RoleId,
  {
    selectedTask,
    selectedReadiness,
    selectedRoles,
    selectedModels,
    projectContext,
    changeSize,
    patternLabel,
  }: {
    selectedTask: TaskConfig;
    selectedReadiness: ReadinessId;
    selectedRoles: RoleId[];
    selectedModels: Record<RoleId, AgentModelId>;
    projectContext: ProjectContext;
    changeSize: number;
    riskLabel: string;
    patternLabel: string;
    modelResult: ReturnType<typeof getModelImpact>;
  },
) {
  const model = agentModels[selectedModels[role] ?? "balanced"];
  const previous = getPreviousRole(role, selectedRoles);
  const next = getNextRole(role, selectedRoles);

  if (!selectedRoles.includes(role)) {
    return `${capitalizeRole(role)} is not selected for this run.`;
  }

  return `Role:
${capitalizeRole(role)}

Hypothetical model profile:
${model.label} — replace with the approved model identifier before use

Objective:
${selectedTask.objective}

Repository or module:
${projectContext.module}

Allowed files or directories:
${projectContext.allowedFiles}

Validation command:
${projectContext.validation}

Branch or working area:
${projectContext.branch}

Concrete project context:
${projectContext.context}

Relevant prior output:
Paste the previous role output here before running this role.

Project readiness:
${selectedReadiness}

Change size:
${changeSize}/5

Overall workflow pattern:
${patternLabel}

Your allowed scope:
${getRoleScope(role)}

Forbidden changes:
${selectedTask.nonGoal}

Required evidence:
${getRoleEvidence(role, selectedTask)}

Expected output format:
${getRoleOutputFormat(role)}

Handoff:
${getRoleHandoff(role, previous, next)}`;
}

function buildSubmissionNote({
  selectedTask,
  selectedReadiness,
  selectedRoles,
  selectedModels,
  projectContext,
  changeSize,
  riskLabel,
  patternLabel,
  modelResult,
}: {
  selectedTask: TaskConfig;
  selectedReadiness: ReadinessId;
  selectedRoles: RoleId[];
  selectedModels: Record<RoleId, AgentModelId>;
  projectContext: ProjectContext;
  changeSize: number;
  riskLabel: string;
  patternLabel: string;
  modelResult: ReturnType<typeof getModelImpact>;
}) {
  const roleList =
    selectedRoles.length > 0
      ? selectedRoles
          .map(
            (role) =>
              `- ${role}: ${agentModels[selectedModels[role] ?? "balanced"].label}`,
          )
          .join("\n")
      : "- No roles selected.";

  return `# Agent Fleet Submission Note

## Task
${selectedTask.objective}

## Project context
${projectContext.context}

## Setup
- Repository or module: ${projectContext.module}
- Branch or working area: ${projectContext.branch}
- Allowed files or directories: ${projectContext.allowedFiles.replace(/\n/g, ", ")}
- Validation command: ${projectContext.validation}
- Project readiness: ${selectedReadiness}
- Change size: ${changeSize}/5
- Workflow pattern: ${patternLabel}
- Modeled integration risk: ${riskLabel}

## Roles and models
${roleList}

## Estimated impact
- Direct model cost: ${modelResult.cost.toFixed(2)} EUR
- Model latency: ${Math.round(modelResult.latency)} min
- Human review time: ${Math.round(modelResult.reviewMinutes)} min
- Modeled rework risk: ${getRiskLabel(modelResult.reworkScore)}

## Evidence checklist
- Each role named concrete files, commands, assumptions, and risks:
- Scout findings used by planner:
- Planner boundaries followed by implementer:
- Implementer reported commands run:
- Reviewer inspected the diff and validation output:
- Human changed or rejected:

## Result
- What changed:
- Validation command and result:
- What the fleet missed:
- What you would do differently next time:`;
}

function updatePacketTabs(
  tabs: HTMLButtonElement[],
  currentPacket: PacketId,
  selectedRoles: RoleId[],
) {
  const activeRoles = new Set(selectedRoles);

  tabs.forEach((tab) => {
    const packet = tab.dataset.agentFleetPacketTab as PacketId | undefined;
    const isRolePacket = isRoleId(packet);
    const disabled = Boolean(isRolePacket && !activeRoles.has(packet));
    const active = packet === currentPacket;

    tab.disabled = disabled;
    tab.tabIndex = active ? 0 : -1;
    tab.classList.toggle("is-active", active);

    if (active) {
      tab.setAttribute("aria-selected", "true");
    } else {
      tab.setAttribute("aria-selected", "false");
    }
  });
}

function getAvailablePacket(packet: PacketId, selectedRoles: RoleId[]) {
  if (isRoleId(packet) && !selectedRoles.includes(packet)) {
    return "brief";
  }

  return packet;
}

function isRoleId(value: string | undefined): value is RoleId {
  return (
    value === "scout" ||
    value === "planner" ||
    value === "implementer" ||
    value === "reviewer"
  );
}

function getPreviousRole(role: RoleId, selectedRoles: RoleId[]): RoleId | null {
  const index = selectedRoles.indexOf(role);

  return index > 0 ? (selectedRoles[index - 1] ?? null) : null;
}

function getNextRole(role: RoleId, selectedRoles: RoleId[]): RoleId | null {
  const index = selectedRoles.indexOf(role);

  return index >= 0 && index < selectedRoles.length - 1
    ? (selectedRoles[index + 1] ?? null)
    : null;
}

function getRoleScope(role: RoleId) {
  switch (role) {
    case "scout":
      return "Read-only inspection. Do not edit files. Compress findings into concrete file references and unknowns.";
    case "planner":
      return "Use scout findings to define scope, risks, allowed files, non-goals, and acceptance criteria. Do not edit files.";
    case "implementer":
      return "Make one bounded change inside the allowed files. Keep behavior outside the task stable.";
    case "reviewer":
      return "Review the diff, validation output, regressions, missing tests, and whether the change respects the plan.";
  }
}

function getRoleEvidence(role: RoleId, task: TaskConfig) {
  switch (role) {
    case "scout":
      return `${task.evidence} Also list what cannot be known from the available context.`;
    case "planner":
      return "A scoped plan with allowed files, forbidden changes, risks, acceptance criteria, and validation command.";
    case "implementer":
      return `${task.validation} Report files changed and commands run.`;
    case "reviewer":
      return "Findings ordered by severity, with file references, test gaps, and a clear accept/revise recommendation.";
  }
}

function getRoleOutputFormat(role: RoleId) {
  switch (role) {
    case "scout":
      return "- Findings:\n- Relevant files:\n- Unknowns:\n- Suggested next role input:";
    case "planner":
      return "- Plan:\n- Allowed files:\n- Non-goals:\n- Risks:\n- Acceptance criteria:\n- Validation command:";
    case "implementer":
      return "- Changes made:\n- Files changed:\n- Commands run:\n- Evidence:\n- Follow-up risks:";
    case "reviewer":
      return "- Findings:\n- Missing evidence:\n- Regression risk:\n- Recommendation:\n- Human decision needed:";
  }
}

function getRoleHandoff(
  role: RoleId,
  previous: RoleId | null,
  next: RoleId | null,
) {
  const previousText = previous
    ? `Start from the ${previous} output pasted into "Relevant prior output".`
    : "Start from the project instructions and the task description.";
  const nextText = next
    ? `Write your output so it can be pasted into the ${next} prompt.`
    : "Write your output so the human integrator can make the final decision.";

  if (role === "reviewer") {
    return `${previousText} Inspect the final diff and validation evidence before recommending accept or revise.`;
  }

  return `${previousText} ${nextText}`;
}

function escapeAgentFleetHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capitalizeRole(role: RoleId | null) {
  if (!role) {
    return "A role";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
