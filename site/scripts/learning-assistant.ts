import type {
  AssistantHandoff,
  NotebookHandoff,
  NotebookEntry,
  LearningSource,
} from "../../shared/learning-workspace.ts";
import type { LearningClient } from "./learning-client.ts";
import type { AssistantDraft, AssistantSection } from "./learning-session.ts";
import { currentReading, pageSource } from "./learning-context.ts";
import { mountLearningGuide } from "./learning-guide.ts";
import { mountLearningAgent } from "./learning-agent-ui.ts";
import { mountLearningPeers } from "./learning-peers.ts";
import type { GuideSave } from "./learning-practice.ts";

interface Options {
  client: LearningClient;
  entries: NotebookEntry[];
  draft: AssistantDraft;
  source: () => LearningSource;
  selected: () => string[];
  active: () => boolean;
  changed: () => void;
  write: (draft: NotebookHandoff) => void;
  help: (context: AssistantHandoff) => void;
  discuss: () => void;
  notes: () => void;
  save: GuideSave;
  close: () => void;
  status: (text: string) => void;
}

/** Instructional composition prepares handoffs; the notebook owns their save. */
export function mountLearningAssistant(
  container: HTMLElement,
  section: AssistantSection,
  options: Options,
) {
  const initial = (source: LearningSource) =>
    options.write({
      source,
      kind: "attempt",
      title: `Initial thinking: ${source.title}`.slice(0, 300),
      body: "",
      relatedIds: [],
      assistance: null,
    });
  const help = (source: LearningSource, question: string) =>
    options.help({ source, question, noteIds: options.selected() });
  if (section === "guide")
    mountLearningGuide(container, {
      entries: options.entries,
      save: options.save,
      notes: options.notes,
      close: options.close,
      status: options.status,
      initial,
      help,
      leave: options.discuss,
      reflect: (source, relatedIds) =>
        options.write({
          source,
          relatedIds,
          kind: "reflection",
          title: `Reflection: ${currentReading().title}`.slice(0, 300),
          body: "",
          assistance: null,
        }),
    });
  if (section === "peers")
    mountLearningPeers(container, {
      source: options.source(),
      entries: options.entries,
      save: options.save,
      notes: options.notes,
      status: options.status,
      initial,
      help,
      reflect: (source, body, relatedIds) =>
        options.write({
          source,
          body,
          relatedIds,
          kind: "reflection",
          title: `Peer inquiry: ${source.title}`.slice(0, 300),
          assistance: null,
        }),
    });
  if (section === "agent")
    mountLearningAgent(container, {
      client: options.client,
      draft: options.draft,
      source: pageSource,
      entries: options.entries,
      selected: options.selected,
      active: options.active,
      notes: options.notes,
      changed: options.changed,
      status: options.status,
      initial,
      currentReading: () =>
        options.help({
          source: pageSource(),
          question: "",
          noteIds: options.selected(),
        }),
      accept: (body, assistance, source, relatedIds) =>
        options.write({
          source,
          relatedIds,
          kind: "reflection",
          title: `Takeaway: ${source.title}`.slice(0, 300),
          body: body.slice(0, 16_000),
          assistance,
        }),
    });
}
