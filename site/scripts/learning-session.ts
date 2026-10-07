import {
  learningObject,
  learningText,
  noteKinds,
  parseLearningSource,
  type LearningSource,
  type NoteKind,
} from "../../shared/learning-workspace.ts";

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
interface SessionState {
  open: boolean;
  view: NotebookView;
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
    return {
      open: value.open === true,
      view: views.includes(value.view as NotebookView)
        ? (value.view as NotebookView)
        : "write",
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
export function saveNotebookSession(state: SessionState) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, ...state }));
  } catch {
    /* The notebook still works with memory-only tab state. */
  }
}
