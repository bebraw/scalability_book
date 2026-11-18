import {
  learningAssert,
  learningObject,
  learningText,
  learningId,
  learningList,
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
export interface NotebookDraftPreview {
  conversationId: string;
  replyId: string;
  studentId: string | null;
  source: LearningSource;
  relatedIds: string[];
  teaching: string;
  studentText: string;
  replyText: string;
  includeStudent: boolean;
  includeReply: boolean;
  open: boolean;
}
export type NotebookSection = "write" | "notes" | "concepts" | "prepare";
export type AssistantSection = "agent" | "guide" | "peers";
export interface NotebookSize {
  width: number | null;
  height: number | null;
}
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
export interface SessionState {
  open: boolean;
  view: NotebookView;
  experience: LearningExperience;
  notebookView: NotebookSection;
  assistantView: AssistantSection;
  assistant: AssistantDraft | null;
  notebookOpen: boolean;
  assistantOpen: boolean;
  notebookPaneView: NotebookSection | "connect";
  assistantPaneView: AssistantSection | "connect";
  assistantSelected: string[];
  notebookSize: NotebookSize | null;
  editor: NotebookEditor | null;
  notePreview: NotebookDraftPreview | null;
  assistance: string | null;
  preparation: string;
  selected: string[];
}
const key = "book-learning-workspace";
function parseNotebookDraftPreview(value: unknown): NotebookDraftPreview {
  const saved = learningObject(value);
  const text = (value: unknown, maximum: number): string => {
    learningAssert(
      typeof value === "string" && value.length <= maximum,
      `Preview text must fit within ${maximum} characters.`,
    );
    // Preserve editable text verbatim, including unfinished whitespace.
    return value;
  };
  learningAssert(
    typeof saved.includeStudent === "boolean" &&
      typeof saved.includeReply === "boolean" &&
      typeof saved.open === "boolean",
    "Preview choices must be boolean values.",
  );
  return {
    conversationId: learningId(saved.conversationId),
    replyId: learningId(saved.replyId),
    studentId: saved.studentId === null ? null : learningId(saved.studentId),
    source: parseLearningSource(saved.source),
    relatedIds: learningList(saved.relatedIds, 100).map(learningId),
    teaching: text(saved.teaching, 2000),
    studentText: text(saved.studentText, 32_000),
    replyText: text(saved.replyText, 32_000),
    includeStudent: saved.includeStudent,
    includeReply: saved.includeReply,
    open: saved.open,
  };
}
export function readNotebookSession(): SessionState {
  const fallback: SessionState = {
    open: false,
    view: "write",
    experience: "notebook",
    notebookView: "write",
    assistantView: "agent",
    assistant: null,
    notebookOpen: false,
    assistantOpen: false,
    notebookPaneView: "write",
    assistantPaneView: "agent",
    assistantSelected: [],
    notebookSize: null,
    editor: null,
    notePreview: null,
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
    let notePreview: NotebookDraftPreview | null = null;
    try {
      if (value.notePreview != null)
        notePreview = parseNotebookDraftPreview(value.notePreview);
    } catch {
      /* An unusable preview does not discard either independent draft. */
    }
    const experience =
      value.experience === "assistant" || value.experience === "notebook"
        ? value.experience
        : (experienceForView(view) ?? "notebook");
    const notebookView = notebookSections.includes(
      value.notebookView as NotebookSection,
    )
      ? (value.notebookView as NotebookSection)
      : notebookSections.includes(view as NotebookSection)
        ? (view as NotebookSection)
        : "write";
    const assistantView = assistantSections.includes(
      value.assistantView as AssistantSection,
    )
      ? (value.assistantView as AssistantSection)
      : assistantSections.includes(view as AssistantSection)
        ? (view as AssistantSection)
        : "agent";
    const selectedIds = (ids: unknown) =>
      Array.isArray(ids)
        ? ids
            .filter((id): id is string => typeof id === "string")
            .slice(0, 5000)
        : [];
    // Presentation preferences must never invalidate either unfinished draft.
    let notebookSize: NotebookSize | null = null;
    if (
      value.notebookSize &&
      typeof value.notebookSize === "object" &&
      !Array.isArray(value.notebookSize)
    ) {
      const saved = value.notebookSize as Record<string, unknown>;
      const dimension = (size: unknown) =>
        typeof size === "number" &&
        Number.isFinite(size) &&
        size > 0 &&
        size <= 10_000
          ? size
          : null;
      const width = dimension(saved.width);
      const height = dimension(saved.height);
      if (width !== null || height !== null) notebookSize = { width, height };
    }
    return {
      open: value.open === true,
      view,
      experience,
      notebookView,
      assistantView,
      notebookOpen:
        typeof value.notebookOpen === "boolean"
          ? value.notebookOpen
          : value.open === true && experience === "notebook",
      assistantOpen:
        typeof value.assistantOpen === "boolean"
          ? value.assistantOpen
          : value.open === true && experience === "assistant",
      notebookPaneView:
        value.notebookPaneView === "connect" ||
        notebookSections.includes(value.notebookPaneView as NotebookSection)
          ? (value.notebookPaneView as NotebookSection | "connect")
          : view === "connect" && experience === "notebook"
            ? "connect"
            : notebookView,
      assistantPaneView:
        value.assistantPaneView === "connect" ||
        assistantSections.includes(value.assistantPaneView as AssistantSection)
          ? (value.assistantPaneView as AssistantSection | "connect")
          : view === "connect" && experience === "assistant"
            ? "connect"
            : assistantView,
      assistantSelected: selectedIds(
        value.assistantSelected ?? (assistant ? value.selected : []),
      ),
      notebookSize,
      assistant,
      editor,
      notePreview,
      assistance:
        typeof value.assistance === "string"
          ? value.assistance.slice(0, 2000)
          : null,
      preparation:
        typeof value.preparation === "string" ? value.preparation : "",
      selected: selectedIds(value.selected),
    };
  } catch {
    return fallback;
  }
}
export function saveNotebookSession(
  state: Omit<
    SessionState,
    | "experience"
    | "notebookView"
    | "assistantView"
    | "assistant"
    | "notebookOpen"
    | "assistantOpen"
    | "notebookPaneView"
    | "assistantPaneView"
    | "assistantSelected"
    | "notePreview"
    | "notebookSize"
  > &
    Partial<
      Pick<
        SessionState,
        | "experience"
        | "notebookView"
        | "assistantView"
        | "assistant"
        | "notebookOpen"
        | "assistantOpen"
        | "notebookPaneView"
        | "assistantPaneView"
        | "assistantSelected"
        | "notePreview"
        | "notebookSize"
      >
    >,
) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, ...state }));
  } catch {
    /* The notebook still works with memory-only tab state. */
  }
}
