import type {
  AssistantHandoff,
  LearningExperience,
} from "../../shared/learning-workspace.ts";
import type { CockpitRequest } from "./learning-cockpit.ts";
import type { NotebookView } from "./learning-session.ts";

export type LearningAction =
  | { kind: "navigate"; experience: LearningExperience; view: NotebookView }
  | ({ kind: "investigate" } & CockpitRequest)
  | { kind: "discuss"; draft: AssistantHandoff };

/** Loading or preparing a draft never sends a model message or saves a note. */
export function requestLearning(action: LearningAction) {
  document.dispatchEvent(
    new CustomEvent("book-learning-request", { detail: action }),
  );
}
