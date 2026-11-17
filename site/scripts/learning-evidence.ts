import type { AgentMessage } from "../../shared/learning-agent.ts";

interface MessageGroup {
  message: AgentMessage | null;
  observations: AgentMessage[];
}

// Observations belong only to the following reply in the same response.
// Preserve completed observations even if a response stops before its reply.
export function groupLearningMessages(messages: readonly AgentMessage[]) {
  const groups: MessageGroup[] = [];
  let observations: AgentMessage[] = [];
  for (const message of messages) {
    if (message.role === "observation") {
      observations.push(message);
      continue;
    }
    if (message.role === "student" && observations.length) {
      groups.push({ message: null, observations });
      observations = [];
    }
    groups.push({ message, observations });
    observations = [];
  }
  if (observations.length) groups.push({ message: null, observations });
  return groups;
}

interface EvidenceState {
  expanded: Set<string>;
  focused: string | null;
}

export function captureLearningEvidence(container: HTMLElement): EvidenceState {
  const expanded = new Set<string>();
  let focused: string | null = null;
  for (const details of container.querySelectorAll<HTMLDetailsElement>(
    "details.learning-evidence",
  )) {
    const id = details.dataset.observationId!;
    if (details.open) expanded.add(id);
    if (details.firstElementChild === document.activeElement) focused = id;
  }
  return { expanded, focused };
}

export function renderLearningEvidence(
  observations: readonly AgentMessage[],
  state: EvidenceState,
) {
  const details = document.createElement("details");
  details.className = "learning-evidence";
  // The first record stays stable as a pending response gains more records
  // and eventually a reply. Counts and the complete ID list do not.
  const id = observations[0]!.id;
  details.dataset.observationId = id;
  details.open = state.expanded.has(id);
  const summary = document.createElement("summary");
  summary.textContent = `View browser evidence (${observations.length} ${observations.length === 1 ? "observation" : "observations"})`;
  const explanation = document.createElement("p");
  explanation.className = "learning-hint";
  explanation.textContent =
    "Recorded browser output, separate from the assistant’s interpretation.";
  details.append(summary, explanation);
  for (const [index, observation] of observations.entries()) {
    const section = document.createElement("section");
    section.className = "learning-evidence-observation";
    const heading = document.createElement("h4");
    heading.textContent = `Browser observation ${index + 1}`;
    const output = document.createElement("p");
    output.className = "learning-evidence-output";
    output.textContent = observation.text;
    section.append(heading, output);
    details.append(section);
  }
  return details;
}

export function restoreLearningEvidenceFocus(
  container: HTMLElement,
  state: EvidenceState,
) {
  if (!state.focused) return;
  const details = Array.from(
    container.querySelectorAll<HTMLDetailsElement>("details.learning-evidence"),
  ).find((item) => item.dataset.observationId === state.focused);
  details?.querySelector("summary")?.focus({ preventScroll: true });
}
