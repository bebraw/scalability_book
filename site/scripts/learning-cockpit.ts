import {
  activityById,
  activityForSource,
  type InvestigationPhase,
} from "../../shared/reading-investigation.ts";
import { demoResources } from "../../shared/learning-resources.ts";
import {
  parseLearningSource,
  sourceLink,
  type AssistantHandoff,
  type LearningSource,
} from "../../shared/learning-workspace.ts";
import { pageSource, currentReading } from "./learning-context.ts";
import { mountReadingInvestigation } from "./learning-investigation.ts";
import {
  cockpitBookmark,
  investigationKey,
  recentInvestigations,
} from "./learning-investigation-session.ts";
import type { ReadingSelection } from "./learning-selection.ts";

export interface CockpitRequest {
  source?: LearningSource;
  demoId?: string;
  activityId?: string;
  draft?: AssistantHandoff;
  selection?: ReadingSelection | null;
  resume?: boolean;
  phase?: InvestigationPhase;
}
type Services = Omit<
  Parameters<typeof mountReadingInvestigation>[1],
  "source" | "activity" | "handoff" | "next"
> & {
  notebook: () => void;
  assistant: () => void;
};
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "") => {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
};
export function createLearningCockpit(services: Services) {
  let mounted: ReturnType<typeof mountReadingInvestigation> | null = null;
  let activeKey = "";
  let root: HTMLElement | null = null;
  function open(request: CockpitRequest = {}) {
    if (request.resume) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(cockpitBookmark) ?? "null",
        );
        if (
          saved?.open &&
          new URL(saved.source.url).pathname === location.pathname
        )
          request = {
            source: parseLearningSource(saved.source),
            activityId: saved.activityId,
          };
      } catch {
        /* Invalid tab state never prevents opening the cockpit. */
      }
    }
    let source =
      request.draft?.source ?? request.source ?? pageSource(request.selection);
    const demoId =
      request.demoId ?? (source.kind === "demo" ? source.anchor : "");
    if (request.demoId || request.activityId === "queue-balance") {
      const demo = demoResources.find(
        ({ id }) => id === (request.demoId ?? "demo-queue-balance-lab"),
      );
      if (!demo || !document.getElementById(demo.id)) return;
      source = {
        ...pageSource(),
        kind: "demo",
        anchor: demo.id,
        title: demo.title,
        excerpt: `${demo.caption}\n\nAssumptions: ${demo.assumptions}`,
        conceptIds: [...demo.conceptIds],
      };
    } else if (!source.excerpt && !request.source && !request.draft) {
      source = { ...source, excerpt: currentReading().prompt };
    }
    source = parseLearningSource(source);
    if (new URL(source.url).origin !== location.origin) return;
    const activity =
      (request.activityId && activityById(request.activityId)) ||
      activityForSource(source);
    const key = investigationKey(source, activity);
    if (key === activeKey && mounted && !request.draft) {
      mounted.open();
      root!.scrollIntoView({ block: "start" });
      return;
    }
    mounted?.dispose();
    root?.remove();
    activeKey = key;
    root = node("section");
    root.id = "learning-cockpit";
    root.className = "reading-investigation learning-cockpit";
    root.dataset.readingInvestigation = activity.id;
    root.setAttribute("aria-label", "Learning cockpit");
    root.tabIndex = -1;
    const heading = node("div");
    heading.className = "cockpit-heading";
    const title = node("div");
    title.append(node("p", "Learning cockpit"), node("h2", source.title));
    title.querySelector("p")!.className = "reading-investigation-kicker";
    const resources = node("nav");
    resources.setAttribute("aria-label", "Learning workspace");
    for (const [label, action] of [
      ["Notebook", services.notebook],
      ["Assistant", services.assistant],
    ] as const) {
      const button = node("button", label);
      button.type = "button";
      button.addEventListener("click", action);
      resources.append(button);
    }
    heading.append(title, resources);
    root.append(heading);
    const chooser = node("select");
    chooser.setAttribute("aria-label", "Learning focus");
    const current = node("option", `Current: ${source.title}`);
    current.value = "current";
    chooser.append(current);
    const reading = node("option", `Reading: ${currentReading().title}`);
    reading.value = "reading";
    chooser.append(reading);
    for (const demo of demoResources.filter(({ id }) =>
      document.getElementById(id)?.hasAttribute("data-demo-anchor"),
    )) {
      const option = node("option", demo.title);
      option.value = demo.id;
      chooser.append(option);
    }
    chooser.addEventListener("change", () => {
      if (chooser.value !== "current")
        open(chooser.value === "reading" ? {} : { demoId: chooser.value });
    });
    const focus = node("label");
    focus.className = "cockpit-focus";
    focus.append(node("span", "Working on"), chooser);
    const sourceAnchor = node("a", "Open selected source");
    sourceAnchor.href = sourceLink(source);
    root.append(focus, sourceAnchor);
    const resume = node("button", "Resume learning loop");
    resume.type = "button";
    resume.dataset.investigationStart = "";
    resume.hidden = true;
    resume.addEventListener("click", () => mounted?.open());
    root.append(resume);
    const actual = demoId ? document.getElementById(demoId) : null;
    const target = actual?.closest(".exercise-tabs") ?? actual;
    const headingTarget = document.querySelector("main h1, #content h1");
    if (target) target.after(root);
    else if (headingTarget)
      (headingTarget.closest("header") ?? headingTarget).after(root);
    else document.querySelector("main, #content")?.prepend(root);
    mounted = mountReadingInvestigation(root, {
      ...services,
      source,
      activity,
      next: (previous, takeaway, nextCheck) =>
        open({
          activityId: "learning-loop",
          phase: "predict",
          source: {
            ...previous,
            title: nextCheck.slice(0, 300),
            excerpt: [
              previous.excerpt.slice(0, 5500),
              takeaway ? `My previous takeaway: ${takeaway}` : "",
              `My next independent check: ${nextCheck}`,
            ]
              .filter(Boolean)
              .join("\n\n")
              .slice(0, 12_000),
          },
        }),
      ...(request.draft ? { handoff: request.draft } : {}),
      ...(request.phase ? { phase: request.phase } : {}),
    });
    const recent = node("details");
    recent.className = "cockpit-trail";
    recent.append(node("summary", "Recent learning loops in this tab"));
    const list = node("ul");
    for (const saved of recentInvestigations()) {
      if (!activityById(saved.activityId)) continue;
      const item = node("li");
      const link = node("a", `${saved.source.title} · ${saved.phase}`);
      link.href = sourceLink(saved.source);
      link.addEventListener("click", (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        if (new URL(saved.source.url).pathname === location.pathname) {
          event.preventDefault();
          open({ source: saved.source, activityId: saved.activityId });
        } else {
          try {
            sessionStorage.setItem(
              cockpitBookmark,
              JSON.stringify({ ...saved, open: true }),
            );
          } catch {
            /* Optional continuity. */
          }
        }
      });
      item.append(link);
      list.append(item);
    }
    recent.append(
      list,
      node(
        "p",
        "Up to 30 learning loops are kept in this tab. Prepare a Notebook takeaway to keep a reflection beyond this browser session.",
      ),
    );
    root.append(recent);
    document
      .querySelector("[data-learning-cockpit]")
      ?.setAttribute("aria-expanded", "true");
    if (!request.resume) {
      root.scrollIntoView({ block: "start" });
      root.focus({ preventScroll: true });
    }
  }
  document.addEventListener("book-cockpit-paused", () =>
    document
      .querySelector("[data-learning-cockpit]")
      ?.setAttribute("aria-expanded", "false"),
  );
  return { open, hasDraft: () => mounted?.hasDraft() ?? false };
}
