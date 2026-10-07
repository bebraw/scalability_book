import {
  learningObject,
  learningText,
  learningId,
  noteKinds,
  parseLearningSource,
  type LearningSource,
  type LearningExperience,
  type NoteKind,
} from "../../shared/learning-workspace.ts";
import {
  helpModes,
  supportNeeds,
  type HelpMode,
  type SupportNeed,
} from "../../shared/learning-agent.ts";

export type NotebookView =
  | "write"
  | "notes"
  | "guide"
  | "concepts"
  | "agent"
  | "peers"
  | "prepare"
  | "connect";
export interface NotebookEditor {
  id: string;
  expected: string;
  kind: NoteKind;
  title: string;
  body: string;
  relatedIds: string[];
  source: LearningSource;
}
export interface AssistantDraft {
  source: LearningSource;
  conversationId: string | null;
  browserId: string;
  question: string;
  goal: string;
  mode: HelpMode;
  supportNeed: SupportNeed;
}
export type NotebookSection = "write" | "notes" | "concepts" | "prepare";
export type AssistantSection = "agent" | "guide" | "peers";
export const notebookSections: NotebookSection[] = [
  "write",
  "notes",
  "concepts",
  "prepare",
];
export const assistantSections: AssistantSection[] = [
  "agent",
  "guide",
  "peers",
];
export function experienceForView(
  view: NotebookView,
): LearningExperience | null {
  if (notebookSections.includes(view as NotebookSection)) return "notebook";
  if (assistantSections.includes(view as AssistantSection)) return "assistant";
  return null;
}
interface SessionState {
  open: boolean;
  view: NotebookView;
  experience: LearningExperience;
  notebookView: NotebookSection;
  assistantView: AssistantSection;
  assistant: AssistantDraft | null;
  editor: NotebookEditor | null;
  assistance: string | null;
  preparation: string;
  selected: string[];
}
const key = "book-learning-workspace";
export function readNotebookSession(): SessionState {
  const fallback: SessionState = {
    open: false,
    view: "write",
    experience: "notebook",
    notebookView: "write",
    assistantView: "agent",
    assistant: null,
    editor: null,
    assistance: null,
    preparation: "",
    selected: [],
  };
  try {
    const value = learningObject(
      JSON.parse(sessionStorage.getItem(key) ?? "null"),
    );
    if (value.version !== 1) return fallback;
    const views: NotebookView[] = [
      "write",
      "notes",
      "guide",
      "concepts",
      "agent",
      "peers",
      "prepare",
      "connect",
    ];
    const draft = value.editor ? learningObject(value.editor) : null;
    const editor: NotebookEditor | null =
      draft &&
      noteKinds.includes(draft.kind as NoteKind) &&
      Array.isArray(draft.relatedIds)
        ? {
            id: learningText(draft.id, "Draft identity", 36),
            expected: learningText(draft.expected, "Draft revision", 128),
            kind: draft.kind as NoteKind,
            title:
              typeof draft.title === "string" && draft.title.length <= 300
                ? draft.title
                : "",
            body:
              typeof draft.body === "string" && draft.body.length <= 16_000
                ? draft.body
                : "",
            relatedIds: draft.relatedIds
              .filter((id): id is string => typeof id === "string")
              .slice(0, 100),
            source: parseLearningSource(draft.source),
          }
        : null;
    const view = views.includes(value.view as NotebookView)
      ? (value.view as NotebookView)
      : "write";
    let assistant: AssistantDraft | null = null;
    try {
      const saved = value.assistant ? learningObject(value.assistant) : null;
      if (saved)
        assistant = {
          source: parseLearningSource(saved.source),
          conversationId:
            typeof saved.conversationId === "string" &&
            /^[a-f0-9-]{36}$/.test(saved.conversationId)
              ? saved.conversationId
              : null,
          browserId: learningId(saved.browserId),
          question:
            typeof saved.question === "string"
              ? saved.question.slice(0, 8000)
              : "",
          goal: typeof saved.goal === "string" ? saved.goal.slice(0, 1000) : "",
          mode: helpModes.includes(saved.mode as HelpMode)
            ? (saved.mode as HelpMode)
            : "question",
          supportNeed: supportNeeds.includes(saved.supportNeed as SupportNeed)
            ? (saved.supportNeed as SupportNeed)
            : "unspecified",
        };
    } catch {
      /* An unusable assistant draft does not discard notebook writing. */
    }
    return {
      open: value.open === true,
      view,
      experience:
        value.experience === "assistant" || value.experience === "notebook"
          ? value.experience
          : (experienceForView(view) ?? "notebook"),
      notebookView: notebookSections.includes(
        value.notebookView as NotebookSection,
      )
        ? (value.notebookView as NotebookSection)
        : notebookSections.includes(view as NotebookSection)
          ? (view as NotebookSection)
          : "write",
      assistantView: assistantSections.includes(
        value.assistantView as AssistantSection,
      )
        ? (value.assistantView as AssistantSection)
        : assistantSections.includes(view as AssistantSection)
          ? (view as AssistantSection)
          : "agent",
      assistant,
      editor,
      assistance:
        typeof value.assistance === "string"
          ? value.assistance.slice(0, 2000)
          : null,
      preparation:
        typeof value.preparation === "string" ? value.preparation : "",
      selected: Array.isArray(value.selected)
        ? value.selected
            .filter((id): id is string => typeof id === "string")
            .slice(0, 5000)
        : [],
    };
  } catch {
    return fallback;
  }
}
export function saveNotebookSession(
  state: Omit<
    SessionState,
    "experience" | "notebookView" | "assistantView" | "assistant"
  > &
    Partial<
      Pick<
        SessionState,
        "experience" | "notebookView" | "assistantView" | "assistant"
      >
    >,
) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, ...state }));
  } catch {
    /* The notebook still works with memory-only tab state. */
  }
}
