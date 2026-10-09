import { conceptPages } from "../../shared/concept-pages.ts";
import { demoResources } from "../../shared/learning-resources.ts";
import { concepts } from "../../shared/concepts.ts";
import type {
  LearningSource,
  NotebookEntry,
} from "../../shared/learning-workspace.ts";
import type { HelpMode, SupportNeed } from "../../shared/learning-agent.ts";
import {
  activityById,
  type InvestigationTurn,
} from "../../shared/reading-investigation.ts";

export function buildLearningProviderContext({
  source,
  selected,
  text,
  goal,
  mode,
  need,
  origin,
  focused = false,
  investigation,
}: {
  source: LearningSource;
  selected: NotebookEntry[];
  text: string;
  goal: string;
  mode: HelpMode;
  need: SupportNeed;
  origin: string;
  focused?: boolean;
  investigation?: InvestigationTurn;
}) {
  return JSON.stringify({
    helpMode: mode,
    supportNeed: need,
    goal,
    source: source,
    selectedNotes: selected.map(({ id, kind, source, body }) => ({
      id,
      kind,
      source,
      body,
    })),
    question: text,
    ...(investigation
      ? {
          readingActivity: {
            contract: activityById(investigation.activityId),
            turn: investigation,
          },
        }
      : {}),
    supportResources: concepts
      .filter((concept) => source.conceptIds.includes(concept.id))
      .map(
        ({
          id,
          title,
          definition,
          assumptions,
          example,
          misconception,
          contexts,
        }) => ({
          id,
          title,
          definition,
          assumptions,
          example,
          misconception,
          url: new URL(`/concepts/#${id}`, origin).href,
          contexts,
        }),
      ),
    availableDemos: demoResources
      .filter(
        (demo) =>
          !focused ||
          demo.id === source.anchor ||
          (source.conceptIds.some((id) => demo.conceptIds.includes(id)) &&
            (!source.anchor?.startsWith("demo-") || demo.id === source.anchor)),
      )
      .map(({ id, title, url, assumptions }) => ({
        id,
        title,
        url,
        assumptions,
      })),
    bookResources: conceptPages
      .filter(
        (page) =>
          !focused ||
          page.url === new URL(source.url).pathname ||
          page.concepts.some((id) => source.conceptIds.includes(id)),
      )
      .map(({ title, url }) => ({ title, url })),
  });
}
