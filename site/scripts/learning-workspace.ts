import { LearningClient } from "./learning-client.ts";
import {
  createLearningPane,
  type LearningSnapshot,
  type LearningPaneServices,
} from "./learning-pane.ts";
import { syncLearningLaunchers } from "./learning-navigation.ts";
import {
  readNotebookSession,
  saveNotebookSession,
} from "./learning-session.ts";
import type { LearningExperience } from "../../shared/learning-workspace.ts";
import type { ReadingSelection } from "./learning-selection.ts";
export {
  observeLearningDemo,
  changeLearningDemo,
  availableLearningDemos,
} from "./learning-demos.ts";

// One connection and session owner serve independently rendered panels.
const client = new LearningClient();
const session = readNotebookSession();
const compact = matchMedia("(max-width: 68rem), (max-height: 42rem)");
const experiences: LearningExperience[] = ["notebook", "assistant"];
let snapshot: LearningSnapshot = {
  connected: false,
  companionStatus: null,
  entries: [],
  judgments: [],
};
let refreshing: Promise<void> | null = null;
let syncing = false;
let panes: Record<LearningExperience, ReturnType<typeof createLearningPane>>;
function isOpen(experience: LearningExperience) {
  return experience === "notebook"
    ? session.notebookOpen
    : session.assistantOpen;
}
function setOpen(experience: LearningExperience, value: boolean) {
  if (experience === "notebook") session.notebookOpen = value;
  else session.assistantOpen = value;
}
function persist() {
  session.open = session.notebookOpen || session.assistantOpen;
  session.view =
    session.experience === "notebook"
      ? session.notebookPaneView
      : session.assistantPaneView;
  saveNotebookSession(session);
}
function syncPanels() {
  syncing = true;
  try {
    // Closing a panel must leave the other open panel as the foreground,
    // including when the reader later resizes or navigates on a small screen.
    if (!isOpen(session.experience)) {
      const remaining = experiences.find(isOpen);
      if (remaining) session.experience = remaining;
    }
    const active = session.experience;
    for (const experience of experiences) {
      const panel = panes[experience].panel;
      const visible =
        isOpen(experience) && (!compact.matches || experience === active);
      panel.dataset.learningActive = String(experience === active);
      if (!visible && panel.hasAttribute("open")) panel.close();
      panel.hidden = !visible;
      if (visible && !panel.hasAttribute("open")) panel.show();
      syncLearningLaunchers(panel, experience);
    }
    document.body.dataset.learningOpen = String(
      experiences.some((experience) => !panes[experience].panel.hidden),
    );
    document.body.dataset.learningNotebookOpen = String(
      !panes.notebook.panel.hidden,
    );
    document.body.dataset.learningAssistantOpen = String(
      !panes.assistant.panel.hidden,
    );
  } finally {
    syncing = false;
  }
  persist();
}
function raise(experience: LearningExperience) {
  if (syncing || session.experience === experience) return;
  session.experience = experience;
  syncPanels();
}
function show(experience: LearningExperience) {
  setOpen(experience, true);
  session.experience = experience;
  syncPanels();
}
function close(experience: LearningExperience) {
  const panel = panes[experience].panel;
  const returnFocus = panel.contains(document.activeElement);
  setOpen(experience, false);
  syncPanels();
  if (returnFocus)
    document
      .querySelector<HTMLButtonElement>(
        `[data-learning-toggle="${experience}"]`,
      )
      ?.focus({ preventScroll: true });
}
async function refresh() {
  if (!refreshing)
    refreshing = (async () => {
      const companionStatus = await client.status();
      const data =
        await client.request<Pick<LearningSnapshot, "entries" | "judgments">>(
          "/notebook",
        );
      snapshot = { connected: true, companionStatus, ...data };
      experiences.forEach((experience) => panes[experience].update(snapshot));
    })().finally(() => {
      refreshing = null;
    });
  await refreshing;
}
const services: LearningPaneServices = {
  client,
  session,
  save: (patch) => {
    Object.assign(session, patch);
    persist();
  },
  refresh,
  connection: (connected) => {
    if (connected === snapshot.connected) return;
    snapshot = {
      ...snapshot,
      connected,
      ...(!connected
        ? { companionStatus: null, entries: [], judgments: [] }
        : {}),
    };
    experiences.forEach((experience) => panes[experience].update(snapshot));
  },
  open: show,
  close,
  raise,
  navigate: (experience, view) => panes[experience].navigate(view),
  beginNote: (...args) => panes.notebook.beginNote(...args),
  write: (value) => panes.notebook.write(value),
  discuss: (value) => panes.assistant.discuss(value),
};
panes = {
  notebook: createLearningPane("notebook", services),
  assistant: createLearningPane("assistant", services),
};
compact.addEventListener("change", syncPanels);
document.addEventListener("book-learning-open", (event) => {
  const { experience, selection, resume } = (
    event as CustomEvent<{
      experience: LearningExperience;
      selection: ReadingSelection | null;
      resume: boolean;
    }>
  ).detail;
  if (resume) {
    syncPanels();
    void (async () => {
      let recovery = "";
      if (client.token) {
        try {
          await refresh();
        } catch (error) {
          recovery =
            error instanceof Error ? error.message : "Reconnect the companion.";
        }
      }
      for (const owner of experiences)
        if (isOpen(owner)) {
          await panes[owner].open(null, true);
          if (recovery) panes[owner].recover(recovery);
        }
    })();
  } else if (!panes[experience].panel.hidden) close(experience);
  else {
    show(experience);
    void panes[experience].open(selection, false);
  }
});

let followingBookLink = false;
document.addEventListener("click", (event) => {
  followingBookLink = false;
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const anchor = (
    event.target instanceof Element ? event.target : null
  )?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download"))
    return;
  const destination = new URL(anchor.href);
  followingBookLink =
    destination.origin === location.origin &&
    destination.pathname !== location.pathname &&
    /^\/(chapters|appendices|parts|case-studies|project|concepts|explore|demos|notebook)\//.test(
      destination.pathname,
    );
});
window.addEventListener("pageshow", () => {
  followingBookLink = false;
});
window.addEventListener("pagehide", persist);
window.addEventListener("beforeunload", (event) => {
  persist();
  if (
    experiences.some((experience) => panes[experience].hasDraft()) &&
    !followingBookLink
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
