import {
  queueInvestigation as activity,
  parseInvestigationTurn,
  type InvestigationPhase,
  type QueueObservation,
} from "../../shared/reading-investigation.ts";
import { pageSource } from "./learning-context.ts";
import { observeLearningDemo } from "./learning-demos.ts";

export const investigationSource = () => ({
  ...pageSource(),
  kind: "demo" as const,
  anchor: activity.demoId,
  title: activity.title,
  excerpt: `Little's Law: L = λW, for stable averages within the same boundary. ${activity.phases.map(({ prompt }) => prompt).join(" ")}`,
  conceptIds: [...activity.conceptIds],
});
const key = () =>
  `book-reading-investigation:${location.pathname}:${activity.id}`;
interface Draft {
  version: 1;
  open: boolean;
  phase: InvestigationPhase;
  system: string;
  prediction: string;
  question: string;
  takeaway: string;
  conversationId: string | null;
  browserId: string;
  companionBase: string;
  current?: QueueObservation | undefined;
  lastSent?: QueueObservation | undefined;
}
export function readInvestigationDraft(): Draft {
  const fresh: Draft = {
    version: 1,
    open: true,
    phase: "predict",
    system: "",
    prediction: "",
    question: "",
    takeaway: "",
    conversationId: null,
    browserId: crypto.randomUUID(),
    companionBase: "",
  };
  try {
    const raw = sessionStorage.getItem(key());
    if (!raw || raw.length > 80_000) return fresh;
    const saved = JSON.parse(raw);
    if (saved.version !== 1) return fresh;
    const turn = parseInvestigationTurn(
      {
        ...saved,
        activityId: activity.id,
        version: 1,
        observation: saved.current,
      },
      investigationSource(),
    );
    const uuid =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return {
      ...fresh,
      open: saved.open === true,
      phase: turn.phase,
      system: turn.system,
      prediction: turn.prediction,
      question:
        typeof saved.question === "string" ? saved.question.slice(0, 4000) : "",
      takeaway:
        typeof saved.takeaway === "string" ? saved.takeaway.slice(0, 4000) : "",
      conversationId:
        typeof saved.conversationId === "string" &&
        uuid.test(saved.conversationId)
          ? saved.conversationId
          : null,
      browserId:
        typeof saved.browserId === "string" && uuid.test(saved.browserId)
          ? saved.browserId
          : fresh.browserId,
      companionBase:
        typeof saved.companionBase === "string" ? saved.companionBase : "",
      current: turn.observation,
      lastSent: saved.lastSent
        ? parseInvestigationTurn(
            { ...turn, observation: saved.lastSent },
            investigationSource(),
          ).observation
        : undefined,
    };
  } catch {
    return fresh;
  }
}
export function observeQueue(): QueueObservation {
  // Read the simulator's actual displayed outputs. Do not independently simulate it.
  observeLearningDemo(activity.demoId);
  const root = document.getElementById(activity.demoId)!;
  if (root.closest("[hidden]") || root.getClientRects().length === 0)
    throw new Error(
      "Open the queue's Explore tab before sending a browser result.",
    );
  const input = (name: string) =>
    Number(
      root.querySelector<HTMLInputElement>(`[data-little-law-input="${name}"]`)!
        .value,
    );
  const metric = (name: string) =>
    Number(
      root.querySelector(`[data-little-law-metric="${name}"]`)!.textContent,
    );
  return parseInvestigationTurn(
    {
      activityId: activity.id,
      version: 1,
      phase: "experiment",
      observation: {
        kind: "browser-queue-snapshot",
        observedAt: new Date().toISOString(),
        arrival: input("arrival"),
        time: input("time"),
        observed: input("observed"),
        expected: metric("expected"),
        gap: metric("gap"),
      },
    },
    investigationSource(),
  ).observation!;
}
export const describeQueue = (value: QueueObservation) =>
  `${value.arrival} events/s × ${value.time} s → expected ${value.expected} events; observed ${value.observed}; gap ${value.gap}.`;

export function saveInvestigationDraft(draft: Draft) {
  try {
    sessionStorage.setItem(key(), JSON.stringify(draft));
  } catch {
    /* Memory-only fallback. */
  }
}
