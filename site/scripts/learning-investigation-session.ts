import {
  parseInvestigationTurn,
  type ReadingActivity,
  type InvestigationPhase,
  type InvestigationObservation,
} from "../../shared/reading-investigation.ts";
import {
  parseLearningSource,
  type LearningSource,
} from "../../shared/learning-workspace.ts";
import { observeLearningDemo } from "./learning-demos.ts";

export const cockpitBookmark = "book-learning-cockpit-active";
const prefix = "book-learning-loop:";
const maxDraftLength = 256_000;
export const investigationKey = (
  source: LearningSource,
  activity: ReadingActivity,
) => {
  let hash = 2166136261;
  for (const char of source.excerpt + source.conceptIds.join(","))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${prefix}${source.url}#${source.anchor}:${activity.id}:${hash >>> 0}`;
};
export interface InvestigationDraft {
  version: 2;
  source: LearningSource;
  activityId: string;
  updatedAt: string;
  open: boolean;
  phase: InvestigationPhase;
  system: string;
  prediction: string;
  question: string;
  takeaway: string;
  evidence: string;
  nextCheck: string;
  noteIds: string[];
  conversationId: string | null;
  browserId: string;
  companionBase: string;
  current?: InvestigationObservation | undefined;
  lastSent?: InvestigationObservation | undefined;
}
export function readInvestigationDraft(
  source: LearningSource,
  activity: ReadingActivity,
): InvestigationDraft {
  const fresh: InvestigationDraft = {
    version: 2,
    source,
    activityId: activity.id,
    updatedAt: new Date().toISOString(),
    open: true,
    phase: "predict",
    system: "",
    prediction: "",
    question: "",
    takeaway: "",
    evidence: "",
    nextCheck: "",
    noteIds: [],
    conversationId: null,
    browserId: crypto.randomUUID(),
    companionBase: "",
  };
  try {
    const raw = sessionStorage.getItem(investigationKey(source, activity));
    if (!raw || raw.length > maxDraftLength) return fresh;
    const saved = JSON.parse(raw);
    if (saved.version !== 2) return fresh;
    const turn = parseInvestigationTurn(
      {
        ...saved,
        activityId: activity.id,
        version: activity.version,
        observation: saved.current,
      },
      source,
    );
    const uuid =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    const text = (key: string, limit: number) =>
      typeof saved[key] === "string" ? saved[key].slice(0, limit) : "";
    return {
      ...fresh,
      open: saved.open === true,
      phase: turn.phase,
      system: turn.system,
      prediction: turn.prediction,
      question: text("question", 4000),
      takeaway: text("takeaway", 4000),
      evidence: turn.evidence ?? "",
      nextCheck: turn.nextCheck ?? "",
      noteIds: Array.isArray(saved.noteIds)
        ? saved.noteIds
            .filter((id: unknown) => typeof id === "string" && uuid.test(id))
            .slice(0, 100)
        : [],
      conversationId:
        typeof saved.conversationId === "string" &&
        uuid.test(saved.conversationId)
          ? saved.conversationId
          : null,
      browserId:
        typeof saved.browserId === "string" && uuid.test(saved.browserId)
          ? saved.browserId
          : fresh.browserId,
      companionBase: text("companionBase", 2000),
      current: turn.observation,
      lastSent: saved.lastSent
        ? parseInvestigationTurn(
            { ...turn, observation: saved.lastSent },
            source,
          ).observation
        : undefined,
    };
  } catch {
    return fresh;
  }
}
export function observeInvestigation(
  source: LearningSource,
  activity: ReadingActivity,
): InvestigationObservation {
  if (!activity.demoId || new URL(source.url).pathname !== location.pathname)
    throw new Error("Describe your check and evidence in your own words.");
  const actual = observeLearningDemo(activity.demoId);
  const root = document.getElementById(activity.demoId)!;
  if (root.closest("[hidden]") || root.getClientRects().length === 0)
    throw new Error(
      "Open the demo's Explore tab before sending a browser result.",
    );
  const observation = {
    kind: "browser-demo-snapshot",
    demoId: activity.demoId,
    observedAt: actual.observedAt,
    controls: actual.controls
      .filter((control) => "value" in control)
      .slice(0, 60)
      .map(({ label, type, value }) => ({
        label,
        type,
        value: typeof value === "string" ? value.slice(0, 1024) : value,
      })),
    visibleText: actual.visibleText.slice(0, 8000),
  };
  return parseInvestigationTurn(
    {
      activityId: activity.id,
      version: activity.version,
      phase: "experiment",
      observation,
    },
    source,
  ).observation!;
}
export const describeObservation = (value: InvestigationObservation) =>
  `${value.controls.map(({ label, value }) => `${label}: ${String(value)}`).join("; ")}\n\n${value.visibleText}`;

export function saveInvestigationDraft(
  draft: InvestigationDraft,
  activity: ReadingActivity,
  active = true,
) {
  draft.updatedAt = new Date().toISOString();
  try {
    const key = investigationKey(draft.source, activity);
    let serialized = JSON.stringify(draft);
    // Escaped demo text and two snapshots can exceed the tab-record budget.
    // Keep the learner's writing and conversation; a new observation is explicit.
    if (serialized.length > maxDraftLength)
      serialized = JSON.stringify({
        ...draft,
        current: undefined,
        lastSent: undefined,
      });
    if (serialized.length > maxDraftLength) return;
    sessionStorage.setItem(key, serialized);
    if (active)
      sessionStorage.setItem(
        cockpitBookmark,
        JSON.stringify({
          key,
          source: draft.source,
          activityId: activity.id,
          open: draft.open,
        }),
      );
    // Bounded tab history, not a durable notebook or an inferred learner profile.
    const keys = Object.keys(sessionStorage).filter((item) =>
      item.startsWith(prefix),
    );
    if (keys.length > 30) {
      const oldest = keys
        .filter((item) => item !== key)
        .sort((a, b) => {
          try {
            return JSON.parse(
              sessionStorage.getItem(a)!,
            ).updatedAt.localeCompare(
              JSON.parse(sessionStorage.getItem(b)!).updatedAt,
            );
          } catch {
            return 0;
          }
        });
      for (const item of oldest.slice(0, keys.length - 30))
        sessionStorage.removeItem(item);
    }
  } catch {
    /* Memory-only fallback. */
  }
}
export function recentInvestigations(): {
  source: LearningSource;
  activityId: string;
  phase: string;
  updatedAt: string;
}[] {
  const result = [];
  try {
    for (const key of Object.keys(sessionStorage)
      .filter((item) => item.startsWith(prefix))
      .slice(0, 100)) {
      try {
        const raw = sessionStorage.getItem(key)!;
        if (raw.length > maxDraftLength) continue;
        const saved = JSON.parse(raw);
        if (
          saved.version !== 2 ||
          typeof saved.updatedAt !== "string" ||
          typeof saved.activityId !== "string"
        )
          continue;
        const source = parseLearningSource(saved.source);
        if (new URL(source.url).origin !== location.origin) continue;
        result.push({
          source,
          activityId: saved.activityId,
          phase: saved.phase,
          updatedAt: saved.updatedAt,
        });
      } catch {
        /* Ignore invalid tab records. */
      }
    }
  } catch {
    /* Tab storage is optional. */
  }
  return result
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10);
}
