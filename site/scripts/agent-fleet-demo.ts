type ReadinessId = "high" | "medium" | "low";
type TaskId = "bottleneck" | "tests" | "refactor";
type RoleId = "scout" | "planner" | "implementer" | "reviewer";
type PacketId = RoleId | "brief" | "submission";

type TaskConfig = {
  kind: "investigation" | "change";
  label: string;
  objective: string;
  evidence: string;
  nonGoal: string;
  validation: string;
  projectContext: ProjectContext;
};

type ProjectContext = {
  module: string;
  validation: string;
  allowedFiles: string;
  branch: string;
  context: string;
};

const taskConfigs: Record<TaskId, TaskConfig> = {
  bottleneck: {
    kind: "investigation",
    label: "Investigate a scaling bottleneck",
    objective:
      "Identify one likely bottleneck in the Work Activity Tracker and propose a measurement. This investigation is read-only; do not edit files.",
    evidence:
      "Name the endpoint, query, data flow, or file that supports the claim.",
    nonGoal:
      "Do not edit files, apply optimizations, or redesign the system. Return the claim and measurement plan for human review.",
    validation:
      "A benchmark, query plan, trace, or log signal that can confirm or reject the bottleneck.",
    projectContext: {
      module: "Work Activity Tracker API",
      validation: "npm test -- activity-feed",
      allowedFiles:
        "src/routes/events.ts\nsrc/db/activity-events.ts\ntests/activity-feed.test.ts",
      branch: "agent-fleet/latest-events-bottleneck",
      context:
        "Invented repository: users create work items in workspaces and advance open -> in_progress -> done. Each accepted action commits its state change and matching activity event together. GET /events?workspace=<id> reads SELECT * FROM activity_events WHERE workspace_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 50. Separate indexes on workspace_id and event_type do not match the full filter and ordering. The query plan and runtime measurements are not supplied.",
    },
  },
  tests: {
    kind: "change",
    label: "Add regression tests for one workflow",
    objective:
      "Add regression coverage for a rejected work-item transition and make a bounded fix if the test exposes a defect.",
    evidence: "Name the workflow, existing behavior, and test file touched.",
    nonGoal: "Do not rewrite the application structure while adding tests.",
    validation:
      "An unsupported transition is rejected without changing item state or successful-event history. The regression fails for the defect and passes after the fix.",
    projectContext: {
      module: "work-item transition workflow",
      validation: "npm test -- transitions",
      allowedFiles:
        "src/routes/work-items.ts\nsrc/db/work-items.ts\ntests/transitions.test.ts",
      branch: "agent-fleet/transition-regression",
      context:
        "Invented defect report: POST /work-items/item-42/transitions requests to=done for an open item. The API returns a rejection, but the activity feed contains a work_completed event. The required lifecycle is open -> in_progress -> done; a rejected action must change neither state nor successful-event history. Check both records at the real persistence boundary, including when client-side checks are bypassed.",
    },
  },
  refactor: {
    kind: "change",
    label: "Refactor one bounded module",
    objective:
      "Improve one module boundary without changing user-visible behavior.",
    evidence:
      "Name the module boundary and the behavior that must stay stable.",
    nonGoal: "Do not change database schema, routes, or public API contracts.",
    validation:
      "Existing tests pass and one characterization test protects the refactor.",
    projectContext: {
      module: "activity storage module",
      validation: "npm test -- activity-storage",
      allowedFiles:
        "src/db/activity-events.ts\nsrc/db/activity-queries.ts\ntests/activity-storage.test.ts",
      branch: "agent-fleet/activity-storage-boundary",
      context:
        "Invented repository: activity storage mixes workspace and event-type filtering, result mapping, and pagination defaults in one module. Preserve the documented occurred_at DESC, id DESC ordering, cursor behavior, and event fields identifying workspace, work item, actor, and time. Refactoring must also preserve the transaction boundary that commits each work-item state change and matching activity event together.",
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

type FleetContext = {
  selectedTask: TaskConfig;
  selectedReadiness: ReadinessId;
  selectedRoles: RoleId[];
  projectContext: ProjectContext;
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
  const taskScope = root.querySelector<HTMLElement>(
    "[data-agent-fleet-task-scope]",
  );
  const roles = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-agent-fleet-role]"),
  );
  const verdict = root.querySelector<HTMLElement>("[data-agent-fleet-verdict]");
  const workflowSteps = root.querySelector<HTMLElement>(
    "[data-agent-fleet-steps]",
  );
  const guidance = root.querySelector<HTMLElement>(
    "[data-agent-fleet-guidance]",
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
    !taskScope ||
    !verdict ||
    !workflowSteps ||
    !guidance ||
    !brief ||
    !copy ||
    !packetTabs.length
  )
    return;
  let currentPacket: PacketId = "brief";
  const render = () => {
    const selectedTask =
      taskConfigs[task.value as TaskId] ?? taskConfigs.bottleneck;
    updateRoleAvailability(selectedTask, roles);
    taskScope.textContent = getTaskScope(selectedTask);
    const selectedRoles = getSelectedRoles(roles);
    const selectedReadiness = readiness.value as ReadinessId;
    const packets = buildRunPackets({
      selectedTask,
      selectedReadiness,
      selectedRoles,
      projectContext: selectedTask.projectContext,
    });
    verdict.textContent = selectedRoles.length
      ? `${selectedRoles.length} roles selected`
      : "No roles selected";
    guidance.textContent =
      selectedReadiness === "low"
        ? "Resolve setup and validation gaps before execution. Record the model, tools and limits; use actual runs to assess effort and integration."
        : "Check each handoff against the task and acceptance criteria. Record actual model use, failed attempts and human review before comparing workflows.";
    workflowSteps.innerHTML = buildSteps(selectedRoles, selectedTask)
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
    .filter((role) => role.checked && !role.disabled)
    .map((role) => role.value as RoleId);
}

function updateRoleAvailability(task: TaskConfig, inputs: HTMLInputElement[]) {
  for (const input of inputs) {
    input.disabled =
      task.kind === "investigation" && input.value === "implementer";
    if (input.disabled) input.checked = false;
    input.closest("label")?.classList.toggle("is-disabled", input.disabled);
  }
}

function getTaskScope(task: TaskConfig) {
  return task.kind === "investigation"
    ? "Read-only investigation. Return a bottleneck claim and measurement plan; do not edit files. The Implementer is unavailable for this task."
    : "One bounded code change inside the allowed files. Select an Implementer when the workflow needs an edit.";
}

function getRoleOutput(role: RoleId, task: TaskConfig) {
  if (task.kind === "investigation") {
    if (role === "planner")
      return "Planner proposes a measurement with a falsifiable claim, risks, and limits; no file edits.";
    if (role === "reviewer")
      return "Reviewer challenges the bottleneck claim and measurement plan against repository evidence; no file edits.";
  }
  return roleOutput[role];
}

function buildSteps(roles: RoleId[], task: TaskConfig) {
  if (roles.length === 0) {
    return [
      "No delegation yet. Assign at least one role or do the task manually.",
      "Keep a human-owned integration checklist either way.",
    ];
  }

  return roles.map((role) => getRoleOutput(role, task));
}

function buildRunPackets(context: FleetContext) {
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
  projectContext,
}: FleetContext) {
  return `Example packet: replace the invented repository fields and record the actual model, harness and limits before execution.

Objective:
${selectedTask.objective}

Project readiness:
${selectedReadiness}

Repository or module:
${projectContext.module}

${selectedTask.kind === "investigation" ? "Files to inspect (read-only)" : "Allowed files or directories"}:
${projectContext.allowedFiles}

Validation command:
${projectContext.validation}

Branch or working area:
${projectContext.branch}

Concrete project context:
${projectContext.context}

Roles and expected outputs:
${selectedRoles.map((role) => `- ${role}: ${getRoleOutput(role, selectedTask)}`).join("\n") || "- No roles selected."}

Allowed scope:
${getTaskScope(selectedTask)}

Required evidence:
${selectedTask.evidence}

Validation:
${selectedTask.validation}

Non-goal:
${selectedTask.nonGoal}

Human review checkpoint:
Check concrete files, commands, assumptions and remaining risks. Confirm each worker's completed handoff, not only the presence of its files.

Measurements to collect from execution:
Model and harness; elapsed time; aggregate requests and available usage; failed attempts; active human review; missing accounting. Keep unmeasured values unknown.`;
}

function buildRolePrompt(
  role: RoleId,
  {
    selectedTask,
    selectedReadiness,
    selectedRoles,
    projectContext,
  }: FleetContext,
) {
  if (!selectedRoles.includes(role))
    return `${capitalizeRole(role)} is not selected for this run.`;
  return `Role:
${capitalizeRole(role)}

Model and harness:
Record the actual assigned configuration before use.

Objective:
${selectedTask.objective}

Repository or module:
${projectContext.module}

${selectedTask.kind === "investigation" ? "Files to inspect (read-only)" : "Allowed files or directories"}:
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

Your allowed scope:
${getRoleScope(role, selectedTask)}

Forbidden changes:
${selectedTask.nonGoal}

Required evidence:
${getRoleEvidence(role, selectedTask)}

Expected output format:
${getRoleOutputFormat(role, selectedTask)}

Handoff:
${getRoleHandoff(role, getPreviousRole(role, selectedRoles), getNextRole(role, selectedRoles), selectedTask)}
Report whether work is complete, unfinished or blocked, and retain failed checks.`;
}

function buildSubmissionNote({
  selectedTask,
  selectedReadiness,
  selectedRoles,
  projectContext,
}: FleetContext) {
  return `# Agent Fleet Submission Note

## Task
${selectedTask.objective}

## Project context
${projectContext.context}

## Setup
- Repository or module: ${projectContext.module}
- Branch or working area: ${projectContext.branch}
- ${selectedTask.kind === "investigation" ? "Files to inspect (read-only)" : "Allowed files or directories"}: ${projectContext.allowedFiles.replace(/\n/g, ", ")}
- Validation command: ${projectContext.validation}
- Project readiness: ${selectedReadiness}
- Scope: ${getTaskScope(selectedTask)}

## Roles and actual configurations
${selectedRoles.map((role) => `- ${role}: record model, harness and limits`).join("\n") || "- No roles selected."}

## Observed execution
- Source revision and task:
- Elapsed time and observation boundary:
- Aggregate requests, usage and missing records:
- Failed or unfinished work:
- Active human review and intervention:
- Each worker's completion and handoff:

## Evidence to inspect
${selectedRoles.map((role) => `- ${getRoleOutput(role, selectedTask)}`).join("\n")}
- Human changed or rejected:

## Result
- Findings or changes:
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

function getRoleScope(role: RoleId, task: TaskConfig) {
  switch (role) {
    case "scout":
      return "Read-only inspection. Do not edit files. Compress findings into concrete file references and unknowns.";
    case "planner":
      return task.kind === "investigation"
        ? "Use prior findings, or inspect the named files if no scout is selected. Propose one measurement that could confirm or reject the claim. Do not edit files."
        : "Use prior findings, or inspect the named files if no scout is selected, to define scope, risks, allowed files, non-goals, and acceptance criteria. Do not edit files.";
    case "implementer":
      return "Make one bounded change inside the allowed files. Keep behavior outside the task stable.";
    case "reviewer":
      return task.kind === "investigation"
        ? "Review the bottleneck claim, cited repository evidence, proposed measurement, and remaining unknowns. Do not edit files."
        : "Review the diff, validation output, regressions, missing tests, and whether the change respects the plan. Do not edit files.";
  }
}

function getRoleEvidence(role: RoleId, task: TaskConfig) {
  switch (role) {
    case "scout":
      return `${task.evidence} Also list what cannot be known from the available context.`;
    case "planner":
      return task.kind === "investigation"
        ? "A falsifiable bottleneck claim, cited evidence, proposed measurement boundary and workload, alternative explanations, and limits. Distinguish planned checks from checks actually run."
        : "A scoped plan with allowed files, forbidden changes, risks, acceptance criteria, and validation command.";
    case "implementer":
      return `${task.validation} Report files changed and commands run.`;
    case "reviewer":
      return task.kind === "investigation"
        ? "Evidence-backed findings about the claim and measurement, missing evidence, and an accept/revise recommendation for human review. No code change or diff is expected."
        : "Findings ordered by severity, with file references, test gaps, and a clear accept/revise recommendation.";
  }
}

function getRoleOutputFormat(role: RoleId, task: TaskConfig) {
  switch (role) {
    case "scout":
      return "- Findings:\n- Relevant files:\n- Unknowns:\n- Suggested next role input:";
    case "planner":
      return task.kind === "investigation"
        ? "- Bottleneck claim:\n- Repository evidence:\n- Proposed measurement:\n- Alternative explanations:\n- Checks actually run:\n- Limits:"
        : "- Plan:\n- Allowed files:\n- Non-goals:\n- Risks:\n- Acceptance criteria:\n- Validation command:";
    case "implementer":
      return "- Changes made:\n- Files changed:\n- Commands run:\n- Evidence:\n- Follow-up risks:";
    case "reviewer":
      return task.kind === "investigation"
        ? "- Claim and measurement findings:\n- Missing evidence:\n- Recommendation:\n- Human decision needed:"
        : "- Findings:\n- Missing evidence:\n- Regression risk:\n- Recommendation:\n- Human decision needed:";
  }
}

function getRoleHandoff(
  role: RoleId,
  previous: RoleId | null,
  next: RoleId | null,
  task: TaskConfig,
) {
  const previousText = previous
    ? `Start from the ${previous} output pasted into "Relevant prior output".`
    : "Start from the project instructions and the task description.";
  const nextText = next
    ? `Write your output so it can be pasted into the ${next} prompt.`
    : "Write your output so the human integrator can make the final decision.";

  if (role === "reviewer") {
    return task.kind === "investigation"
      ? `${previousText} Check the claim and measurement plan against the repository evidence before recommending accept or revise to the human owner.`
      : `${previousText} Inspect the final diff and validation evidence before recommending accept or revise.`;
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
