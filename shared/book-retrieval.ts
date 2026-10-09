import type { Concept } from "./concepts.ts";
import type { ConceptRelationship } from "./concept-relationships.ts";
import type { LearningResource } from "./learning-resources.ts";
import type { exportExplorations } from "./explorations.ts";
import type { agentPresentation } from "./agent-presentation.ts";
import type { queueInvestigation } from "./reading-investigation.ts";

// Publication data, independent of HTTP, MCP, accounts and private companion state.
export type PublicBookGraph = {
  schemaVersion: number;
  revision: string;
  title: string;
  url: string;
  resources: Record<string, string>;
  semantics: Record<string, string>;
  agentPresentation: typeof agentPresentation;
  concepts: (Concept & {
    url: string;
    readings: string[];
    resourceIds: string[];
    explorationIds: string[];
  })[];
  relationships: ConceptRelationship[];
  explorations: ReturnType<typeof exportExplorations>;
  learningResources: LearningResource[];
  readingActivities?: (typeof queueInvestigation)[];
};

export type BookPassage = {
  url: string;
  title: string;
  heading: string;
  anchors: string[];
  text: string;
};

export type BookPassages = {
  schemaVersion: 1;
  revision: string;
  passages: BookPassage[];
};

export class BookLookupError extends Error {}

export const publicBookInstructions = `Help the student investigate one question at a time using this public book. Start from their question or offer a passage, a concept connection, or a short experiment. Ask for their explanation or prediction before feedback or results. Use search_book, then retrieve the relevant concept and passage; search excerpts alone do not establish that you read the passage. Preserve authored relationship direction, linking phrases and qualifications. A graph path is navigation, not proof. get_demo returns authored controls and prompts, never live state or execution. Follow predict → interact → explain, waiting for the student's attempt. Use inline interactive explanations only when the client supports them, label adaptations and preserve quantities and assumptions. Ask for observations unless tools actually expose them. Keep worked reasoning separate until an attempt or explicit request. Cite retrieved URLs and distinguish source claims, student reports, direct observations and deductions. These tools have no access to accounts, private notes, conversations or browser actions. Read the agent-guide resource for the full teaching and presentation guidance.`;

const stopWords = new Set(
  "a an and are as at be by can do does for from how i in is it of on or that the this to was what when where which with".split(
    " ",
  ),
);
const normalize = (text: string) => text.toLowerCase().normalize("NFKC");

export function searchBook(
  graph: PublicBookGraph,
  book: BookPassages,
  query: string,
  limit = 6,
) {
  const terms = [
    ...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) ?? []),
  ].filter((term) => term.length > 1 && !stopWords.has(term));
  if (!terms.length)
    throw new BookLookupError(
      "Use at least one specific book term, such as queue or review budget.",
    );
  const candidates = [
    ...graph.concepts.map((concept) => ({
      kind: "concept" as const,
      id: concept.id,
      title: concept.title,
      url: concept.url,
      text: [
        concept.definition,
        concept.assumptions,
        concept.usage?.note ?? "",
      ].join(" "),
    })),
    ...book.passages.map((passage) => ({
      kind: "passage" as const,
      id: new URL(passage.url).pathname + new URL(passage.url).hash,
      title: `${passage.title} · ${passage.heading}`,
      url: passage.url,
      text: passage.text,
    })),
    ...graph.explorations.map((activity) => ({
      kind: "activity" as const,
      id: activity.id,
      title: activity.title,
      url: activity.agentUrl,
      text: activity.summary,
    })),
    ...graph.learningResources
      .filter(({ kind }) => kind === "demo")
      .map((demo) => ({
        kind: "demo" as const,
        id: demo.id,
        title: demo.title,
        url: demo.url,
        text: `${demo.caption} ${demo.assumptions}`,
      })),
  ];
  const ranked = candidates
    .flatMap(({ text, ...candidate }) => {
      const title = normalize(candidate.title);
      const body = normalize(text);
      const matchedTerms = terms.filter(
        (term) => title.includes(term) || body.includes(term),
      );
      if (!matchedTerms.length) return [];
      const score =
        matchedTerms.length * 10 +
        terms.filter((term) => title.includes(term)).length * 4;
      const first = Math.min(
        ...matchedTerms
          .map((term) => body.indexOf(term))
          .filter((index) => index >= 0),
      );
      const start = Number.isFinite(first) ? Math.max(0, first - 100) : 0;
      return [
        {
          ...candidate,
          score,
          matchedTerms,
          excerpt: `${start ? "…" : ""}${text.slice(start, start + 600)}${text.length > start + 600 ? "…" : ""}`,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  return {
    revision: graph.revision,
    publicationRevision: book.revision,
    query,
    search:
      "Lexical matching over public concepts, rendered reading passages, activities and demo metadata; not semantic inference.",
    total: ranked.length,
    results: ranked.slice(0, limit).map(({ score: _score, ...hit }) => ({
      ...hit,
      retrieve:
        hit.kind === "passage"
          ? { tool: "read_passage", arguments: { url: hit.url } }
          : {
              tool: {
                concept: "get_concept",
                activity: "get_activity",
                demo: "get_demo",
              }[hit.kind],
              arguments: { id: hit.id },
            },
    })),
  };
}

export function getBookConcept(graph: PublicBookGraph, id: string) {
  const concept = graph.concepts.find((item) => item.id === id);
  if (!concept)
    throw new BookLookupError(
      `Unknown concept '${id}'. Use search_book to find a published ID.`,
    );
  return {
    revision: graph.revision,
    concept,
    resources: graph.learningResources.filter((resource) =>
      concept.resourceIds.includes(resource.id),
    ),
    activities: graph.explorations.filter((activity) =>
      concept.explorationIds.includes(activity.id),
    ),
    nextActions: [
      {
        tool: "read_passage",
        arguments: { url: concept.contexts[0]?.href ?? concept.readings[0] },
        purpose: "Check the teaching passage and its conditions.",
      },
      {
        tool: "get_neighbors",
        arguments: { id },
        purpose:
          "Inspect authored connections without reversing incoming claims.",
      },
    ],
  };
}

export function getBookNeighbors(graph: PublicBookGraph, id: string) {
  getBookConcept(graph, id);
  return {
    revision: graph.revision,
    id,
    semantics: graph.semantics,
    relationships: graph.relationships
      .filter((edge) => edge.source === id || edge.target === id)
      .map((edge) => ({
        ...edge,
        neighbor: (() => {
          const concept = graph.concepts.find(
            (concept) =>
              concept.id === (edge.source === id ? edge.target : edge.source),
          )!;
          return { id: concept.id, title: concept.title, url: concept.url };
        })(),
      })),
  };
}

export function getBookActivity(
  graph: PublicBookGraph,
  id: string,
  part: "start" | "discussion",
) {
  const activity = graph.explorations.find((item) => item.id === id);
  if (!activity)
    throw new BookLookupError(
      `Unknown activity '${id}'. Use search_book to find a published ID.`,
    );
  return {
    revision: graph.revision,
    activity,
    part,
    url: part === "discussion" ? activity.discussionUrl : activity.agentUrl,
    presentation: graph.agentPresentation,
    nextActions: [
      {
        tool: "read_passage",
        arguments: { url: activity.reading.href },
        purpose: "Check the scenario against its reading.",
      },
    ],
  };
}

export function getBookDemo(graph: PublicBookGraph, id: string) {
  const demo = graph.learningResources.find(
    (item) => item.kind === "demo" && item.id === id,
  );
  if (!demo)
    throw new BookLookupError(
      `Unknown demo '${id}'. Use search_book or a concept's resources to find a demo ID.`,
    );
  return {
    revision: graph.revision,
    demo,
    activity:
      graph.readingActivities?.find(
        (activity) => activity.demoId === demo.id,
      ) ?? null,
    capabilities: {
      metadata: true,
      liveState: false,
      execute: false,
      privateContext: false,
    },
    presentation: graph.agentPresentation,
    nextActions: [
      { action: "ask_prediction", prompt: demo.experiment?.predict },
      {
        action: "open_demo_after_prediction",
        url: demo.url,
        observation:
          "Use actual browser observations or the student's report; a preview is not a result.",
      },
    ],
  };
}

export function readBookPassage(
  book: BookPassages,
  origin: string,
  href: string,
  offset = 0,
) {
  const url = new URL(href, origin);
  if (
    url.origin !== new URL(origin).origin ||
    url.search ||
    url.username ||
    url.password
  )
    throw new BookLookupError(
      "Use a published passage URL from this book. External URLs and query strings are not supported.",
    );
  const passages = book.passages.filter((passage) => {
    const source = new URL(passage.url);
    return (
      source.pathname === url.pathname &&
      (!url.hash ||
        passage.anchors.includes(decodeURIComponent(url.hash.slice(1))))
    );
  });
  if (!passages.length)
    throw new BookLookupError(
      "This passage is not in the public reading index. Use search_book to find an available passage.",
    );
  const text = passages
    .map((passage) => `${passage.heading}\n\n${passage.text}`)
    .join("\n\n");
  if (offset >= text.length && offset !== 0)
    throw new BookLookupError(
      "Offset is beyond this passage. Start with offset 0.",
    );
  const end = Math.min(offset + 8000, text.length);
  return {
    publicationRevision: book.revision,
    url: url.href,
    title: passages[0]!.title,
    text: text.slice(offset, end),
    offset,
    nextOffset: end < text.length ? end : null,
    totalCharacters: text.length,
    note: "Text from published prose, with section context. Interactive controls, exercise answers and worked discussions are excluded. URLs identify the current publication, not an archived revision.",
  };
}
