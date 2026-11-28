import {
  learningAssert,
  learningObject,
  learningId,
  parseLearningSource,
  type LearningSource,
} from "../../shared/learning-workspace.ts";
import {
  helpModes,
  supportNeeds,
  type HelpMode,
  type SupportNeed,
} from "../../shared/learning-agent.ts";

export interface AssistantDraft {
  source: LearningSource;
  conversationId: string | null;
  browserId: string;
  question: string;
  goal: string;
  mode: HelpMode;
  supportNeed: SupportNeed;
}
export interface DiaryExchangePreview {
  conversationId: string;
  replyId: string;
  studentId: string | null;
  source: LearningSource;
  teaching: string;
  studentText: string;
  replyText: string;
  includeStudent: boolean;
  includeReply: boolean;
  open: boolean;
}
export type AssistantSection = "agent" | "peers";
export type AssistantView = AssistantSection | "connect";

export interface SessionState {
  assistantOpen: boolean;
  assistantView: AssistantSection;
  assistantPaneView: AssistantView;
  assistant: AssistantDraft | null;
  notePreview: DiaryExchangePreview | null;
}
const key = "book-learning-workspace";
function parseDiaryExchangePreview(value: unknown): DiaryExchangePreview {
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
    teaching: text(saved.teaching, 2000),
    studentText: text(saved.studentText, 32_000),
    replyText: text(saved.replyText, 32_000),
    includeStudent: saved.includeStudent,
    includeReply: saved.includeReply,
    open: saved.open,
  };
}
export function readLearningSession(): SessionState {
  const fallback: SessionState = {
    assistantOpen: false,
    assistantView: "agent",
    assistantPaneView: "agent",
    assistant: null,
    notePreview: null,
  };
  try {
    const value = learningObject(
      JSON.parse(sessionStorage.getItem(key) ?? "null"),
    );
    if (value.version !== 1) return fallback;
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
      /* An unusable assistant draft does not discard a reviewed exchange. */
    }
    let notePreview: DiaryExchangePreview | null = null;
    try {
      if (value.notePreview != null)
        notePreview = parseDiaryExchangePreview(value.notePreview);
    } catch {
      /* An unusable review does not discard the assistant draft. */
    }
    const assistantView = value.assistantView === "peers" ? "peers" : "agent";
    return {
      assistantOpen: value.assistantOpen === true,
      assistantView,
      assistantPaneView:
        value.assistantPaneView === "connect" ? "connect" : assistantView,
      assistant,
      notePreview,
    };
  } catch {
    return fallback;
  }
}
export function saveLearningSession(state: SessionState) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, ...state }));
  } catch {
    /* The assistant still works with memory-only tab state. */
  }
}
