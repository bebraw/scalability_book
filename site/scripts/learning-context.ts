import { conceptPages } from "../../shared/concept-pages.ts";
import { concepts } from "../../shared/concepts.ts";
import { explorations } from "../../shared/explorations.ts";
import type { LearningSource } from "../../shared/learning-workspace.ts";
import type { ReadingSelection } from "./learning-selection.ts";

export function textOf(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  for (const control of clone.querySelectorAll(
    "button, input, select, textarea, script, style, .reading-investigation, .paragraph-feedback-actions, [data-paragraph-feedback-panel], a[aria-label^='Link to']",
  ))
    control.remove();
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}
export function currentReading() {
  const page = conceptPages.find((page) => page.url === location.pathname);
  return {
    title: page?.title ?? pageSource().title,
    prompt:
      page?.prompt ??
      "What is one idea from this reading you can explain in your own words? What remains uncertain, and what could you check?",
    isChapter: location.pathname.startsWith("/chapters/"),
  };
}
export function pageSource(
  selection?: ReadingSelection | null,
): LearningSource {
  const page = conceptPages.find((page) => page.url === location.pathname);
  const conceptId =
    location.pathname === "/concepts/"
      ? (new URL(location.href).searchParams.get("topic") ??
        location.hash.slice(1))
      : "";
  const concept = concepts.find((concept) => concept.id === conceptId);
  const exploration = explorations.find(
    (activity) => location.pathname === `/explore/${activity.id}/`,
  );
  const heading = document.querySelector("main h1, #content h1");
  const url = new URL(location.href);
  url.hash = "";
  url.search = "";
  return {
    url: url.href,
    title: (
      concept?.title ??
      exploration?.title ??
      (heading ? textOf(heading) : document.title)
    ).slice(0, 300),
    kind: selection
      ? "passage"
      : concept
        ? "concept"
        : location.pathname.startsWith("/explore/")
          ? "exploration"
          : "page",
    anchor: selection?.anchor ?? concept?.id ?? location.hash.slice(1),
    excerpt:
      selection?.text ?? concept?.definition ?? exploration?.summary ?? "",
    revision:
      document.querySelector<HTMLMetaElement>(
        'meta[name="book-content-revision"]',
      )?.content ?? null,
    conceptIds: concept
      ? [concept.id]
      : [...(exploration?.conceptIds ?? page?.concepts ?? [])],
  };
}
