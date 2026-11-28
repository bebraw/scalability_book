import { learningId } from "../../shared/learning-workspace.ts";
import { isInquiryReadingPath } from "../../shared/concept-pages.ts";

export interface DiaryAttempt {
  path: string;
  anchor: string;
  noteId: string;
  noteRevision: string;
  owner: { course: string; member: string } | null;
}

const tabKey = "book-inquiry-diary-attempt";
export const diaryAttemptMarker = "&diaryAttempt=";

function remember(attempt: DiaryAttempt | null) {
  try {
    if (attempt) sessionStorage.setItem(tabKey, JSON.stringify(attempt));
    else sessionStorage.removeItem(tabKey);
  } catch {
    // The current page can use the declaration without tab storage.
  }
}

export function bindDiaryAttempt(
  attempt: DiaryAttempt,
  course: string,
  member: string,
) {
  attempt.owner = { course, member };
  try {
    const current = JSON.parse(sessionStorage.getItem(tabKey) ?? "null");
    if (
      current?.noteId === attempt.noteId &&
      current.noteRevision === attempt.noteRevision
    )
      remember(attempt);
  } catch {
    // The in-memory handoff is already bound to this account.
  }
}

/** Consume the plugin's two opaque identifiers. Only a separately confirmed
 * course request may use them; sign-in return URLs retain the public passage.
 */
export function readDiaryAttempt(): DiaryAttempt | null {
  const url = new URL(location.href);
  const split = url.hash.indexOf(diaryAttemptMarker);
  const supplied =
    split === -1 ? null : url.hash.slice(split + diaryAttemptMarker.length);
  if (supplied !== null) {
    url.hash = url.hash.slice(1, split);
    history.replaceState(history.state, "", url);
    remember(null);
  }
  if (
    !url.searchParams.has("inquiry") ||
    (url.searchParams.get("inquiryActivity") ?? "reading") !== "reading" ||
    !isInquiryReadingPath(url.pathname)
  )
    return null;

  try {
    const anchor = decodeURIComponent(url.hash.slice(1));
    if (anchor) {
      const target = document.getElementById(anchor);
      if (
        !target?.closest("main, #content") ||
        !(
          target.dataset.commentTarget === anchor ||
          target.matches("h1, h2, h3, h4, h5, h6")
        )
      )
        return null;
      if (supplied !== null) target.scrollIntoView();
    }
    if (supplied === null) {
      const saved = JSON.parse(sessionStorage.getItem(tabKey) ?? "null");
      if (saved?.path !== url.pathname || saved.anchor !== anchor) return null;
      if (
        saved.owner !== null &&
        !(
          typeof saved.owner?.course === "string" &&
          typeof saved.owner?.member === "string"
        )
      )
        return null;
      return {
        path: url.pathname,
        anchor,
        noteId: learningId(saved.noteId),
        noteRevision: learningId(saved.noteRevision),
        owner: saved.owner,
      };
    }
    if (url.searchParams.get("inquiry") !== "1") return null;
    const ids = supplied.split(".");
    if (ids.length !== 2) return null;
    const attempt: DiaryAttempt = {
      path: url.pathname,
      anchor,
      noteId: learningId(ids[0]),
      noteRevision: learningId(ids[1]),
      owner: null,
    };
    remember(attempt);
    return attempt;
  } catch {
    return null;
  }
}
