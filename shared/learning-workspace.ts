/** Provider-independent contracts for the private learning workspace. */
export const notebookVersion = 1;
export const suggestedReflectionCharacters = 400;
export const noteKinds = [
  "scratch",
  "reflection",
  "attempt",
  "revisit",
] as const;
export const understandingLevels = [
  "unsure",
  "can-explain",
  "can-apply",
] as const;
export type NoteKind = (typeof noteKinds)[number];
export type Understanding = (typeof understandingLevels)[number];
export interface LearningSource {
  url: string;
  title: string;
  kind: "page" | "passage" | "concept" | "exploration" | "demo";
  anchor: string;
  excerpt: string;
  revision: string | null;
  conceptIds: string[];
}
export interface NoteRevision {
  revision: string;
  body: string;
  at: string;
  assistance: string | null;
}
export interface NotebookEntry {
  id: string;
  kind: NoteKind;
  source: LearningSource;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  revision: string;
  relatedIds: string[];
  history: NoteRevision[];
}
export interface ConceptJudgment {
  conceptId: string;
  studied: boolean;
  understanding: Understanding;
  evidenceIds: string[];
  intention: string;
  revision: string;
  updatedAt: string;
}
export interface NotebookArchive {
  version: typeof notebookVersion;
  exportedAt: string;
  entries: NotebookEntry[];
  judgments: ConceptJudgment[];
  judgmentHistory: ConceptJudgment[];
}
export class LearningProblem extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function learningAssert(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new LearningProblem(message, status);
}
export function learningObject(value: unknown): Record<string, unknown> {
  learningAssert(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected an object.",
  );
  return value as Record<string, unknown>;
}
export function learningText(
  value: unknown,
  label: string,
  maximum = 16_000,
  required = false,
): string {
  learningAssert(
    typeof value === "string" &&
      value.length <= maximum &&
      (!required || value.trim()),
    `${label} must ${required ? "contain text and " : ""}fit within ${maximum} characters.`,
  );
  return value.trim();
}
export function learningList(value: unknown, maximum = 5000): unknown[] {
  learningAssert(
    Array.isArray(value) && value.length <= maximum,
    `Expected a list of at most ${maximum} items.`,
  );
  return value;
}
export function learningId(value: unknown): string {
  const id = learningText(value, "Record identity", 36, true);
  learningAssert(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    ),
    "Invalid record identity.",
  );
  return id;
}
export function learningDate(value: unknown): string {
  const date = learningText(value, "Date", 32, true);
  learningAssert(
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString() === date,
    "Use an ISO date.",
  );
  return date;
}
export function conceptIdentity(value: unknown): string {
  const id = learningText(value, "Concept", 120, true);
  learningAssert(/^[a-z0-9][a-z0-9-]*$/.test(id), "Invalid concept identity.");
  return id;
}
export function parseLearningSource(value: unknown): LearningSource {
  const source = learningObject(value);
  const rawUrl = learningText(source.url, "Source URL", 2000, true);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new LearningProblem("Use an absolute source URL.");
  }
  learningAssert(
    ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password,
    "Use an HTTP(S) source URL without credentials.",
  );
  url.hash = "";
  const kind = source.kind;
  learningAssert(
    kind === "page" ||
      kind === "passage" ||
      kind === "concept" ||
      kind === "exploration" ||
      kind === "demo",
    "Unknown source kind.",
  );
  const conceptIds = learningList(source.conceptIds, 100).map(conceptIdentity);
  learningAssert(
    new Set(conceptIds).size === conceptIds.length,
    "Duplicate source concepts.",
  );
  return {
    url: url.href,
    kind,
    title: learningText(source.title, "Source title", 300, true),
    anchor: learningText(source.anchor, "Source anchor", 240),
    excerpt: learningText(source.excerpt, "Source excerpt", 12_000),
    revision:
      source.revision === null
        ? null
        : learningText(source.revision, "Source revision", 128, true),
    conceptIds,
  };
}
export function sourceKey(source: LearningSource): string {
  return `${source.url}#${source.anchor}`;
}
export function sourceLink(source: LearningSource): string {
  const url = new URL(source.url);
  url.hash = source.anchor;
  return url.href;
}
export function parseEntry(value: unknown): NotebookEntry {
  const entry = learningObject(value);
  const kind = entry.kind;
  learningAssert(noteKinds.includes(kind as NoteKind), "Unknown note kind.");
  const history = learningList(entry.history, 2000).map(
    (item): NoteRevision => {
      const revision = learningObject(item);
      return {
        revision: learningId(revision.revision),
        body: learningText(revision.body, "Revision text", 16_000, true),
        at: learningDate(revision.at),
        assistance:
          revision.assistance === null
            ? null
            : learningText(
                revision.assistance,
                "Assistance provenance",
                2000,
                true,
              ),
      };
    },
  );
  const latest = history.at(-1);
  const body = learningText(entry.body, "Note", 16_000, true);
  const revision = learningId(entry.revision);
  const updatedAt = learningDate(entry.updatedAt);
  const createdAt = learningDate(entry.createdAt);
  learningAssert(
    latest &&
      latest.body === body &&
      latest.revision === revision &&
      latest.at === updatedAt,
    "The note must match its latest revision.",
  );
  learningAssert(
    history[0]?.at === createdAt &&
      history.every((item, i) => i === 0 || item.at >= history[i - 1]!.at) &&
      new Set(history.map((item) => item.revision)).size === history.length,
    "Invalid note history.",
  );
  const relatedIds = learningList(entry.relatedIds, 100).map(learningId);
  return {
    id: learningId(entry.id),
    kind: kind as NoteKind,
    source: parseLearningSource(entry.source),
    title: learningText(entry.title, "Note title", 300, true),
    body,
    createdAt,
    updatedAt,
    revision,
    relatedIds,
    history,
  };
}
export function parseJudgment(value: unknown): ConceptJudgment {
  const judgment = learningObject(value);
  learningAssert(
    typeof judgment.studied === "boolean",
    "Choose whether this concept was studied.",
  );
  learningAssert(
    understandingLevels.includes(judgment.understanding as Understanding),
    "Unknown self-assessment.",
  );
  return {
    conceptId: conceptIdentity(judgment.conceptId),
    studied: judgment.studied,
    understanding: judgment.understanding as Understanding,
    evidenceIds: learningList(judgment.evidenceIds, 100).map(learningId),
    intention: learningText(judgment.intention, "Next intention", 2000),
    revision: learningId(judgment.revision),
    updatedAt: learningDate(judgment.updatedAt),
  };
}
export function parseNotebookArchive(value: unknown): NotebookArchive {
  const archive = learningObject(value);
  learningAssert(
    archive.version === notebookVersion,
    "Unsupported notebook version. Keep the original file and use a compatible companion.",
  );
  const entries = learningList(archive.entries).map(parseEntry);
  const judgments = learningList(archive.judgments, 1000).map(parseJudgment);
  const judgmentHistory = learningList(archive.judgmentHistory, 20_000).map(
    parseJudgment,
  );
  learningAssert(
    new Set(entries.map((item) => item.id)).size === entries.length &&
      new Set(judgments.map((item) => item.conceptId)).size ===
        judgments.length &&
      new Set(judgmentHistory.map((item) => item.revision)).size ===
        judgmentHistory.length,
    "Duplicate notebook records.",
  );
  for (const judgment of judgments)
    learningAssert(
      judgmentHistory.some(
        (item) =>
          item.revision === judgment.revision &&
          JSON.stringify(item) === JSON.stringify(judgment),
      ),
      "Missing concept self-assessment history.",
    );
  return {
    version: notebookVersion,
    exportedAt: learningDate(archive.exportedAt),
    entries,
    judgments,
    judgmentHistory,
  };
}
export function notebookMarkdown(entries: NotebookEntry[]): string {
  return entries
    .map(
      (entry) =>
        `## ${entry.title}\n\n${entry.body}\n\nSource: ${sourceLink(entry.source)}\nCaptured: ${entry.createdAt}; revised: ${entry.updatedAt}\n${entry.history.some((item) => item.assistance) ? "\nReviewed agent assistance is recorded in the portable notebook.\n" : ""}`,
    )
    .join("\n---\n\n");
}
export const reflectionPrompts = [
  "What did I initially expect or want to understand?",
  "What did I observe, and what evidence can I link?",
  "What changed or became better supported in my explanation?",
  "What is still uncertain, and what would I investigate next?",
];
export const reflectionExamples = [
  {
    title: "An initial attempt",
    text: "I expect a higher arrival rate to mean more work in progress if time in the system stays unchanged. I want to test which averages must be measured over the same window.",
  },
  {
    title: "A developed reflection",
    text: "In the Little’s Law demo, I set arrival rate to 20 events/s and time in the system to 0.5 s. The expected work in progress was 10 events. Changing the observed work in progress to 15 produced a gap. I now check whether the three averages describe the same stable observation window before applying L = λW. This illustration does not measure my project: I still need observations from its runtime.",
  },
  {
    title: "Honest uncertainty",
    text: "I can calculate L = λW, but I am unsure how to choose an observation window when the queue is growing. I will compare a stable interval with an overloaded interval and record what changes.",
  },
  {
    title: "An unchanged view",
    text: "My prediction still seems plausible after this run, but a single demo result is limited evidence. I kept the original explanation and wrote down a different input that might challenge it.",
  },
];
