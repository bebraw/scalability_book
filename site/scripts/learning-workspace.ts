import { downloadTakeaway, legacyRecovery } from "./learning-diary.ts";
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
import type { LearningAction } from "./learning-actions.ts";
import type { SiteAccount } from "../../shared/site-account.ts";
import { createLearningCockpit } from "./learning-cockpit.ts";
export {
  observeLearningDemo,
  changeLearningDemo,
  availableLearningDemos,
} from "./learning-demos.ts";

// One connection and session owner serve independently rendered panels.
const client = new LearningClient();
const session = readNotebookSession();
const compact = matchMedia("(max-width: 68rem), (max-height: 42rem)");
const experiences: LearningExperience[] = legacyRecovery
  ? ["notebook", "assistant"]
  : ["assistant"];
if (!legacyRecovery) {
  session.notebookOpen = false;
  session.experience = "assistant";
  session.assistantSelected = [];
}
let snapshot: LearningSnapshot = {
  connected: false,
  companionStatus: null,
  entries: [],
  judgments: [],
};
let refreshing: Promise<void> | null = null;
let syncing = false;
function pane(experience: LearningExperience) {
  const owner = panes[experience];
  if (!owner)
    throw new Error(
      "Open the recovery page to access previous notebook records.",
    );
  return owner;
}
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
      const panel = pane(experience).panel;
      const visible =
        isOpen(experience) && (!compact.matches || experience === active);
      panel.dataset.learningActive = String(experience === active);
      if (!visible && panel.hasAttribute("open")) panel.close();
      panel.hidden = !visible;
      if (visible && !panel.hasAttribute("open")) panel.show();
      syncLearningLaunchers(panel, experience);
    }
    document.body.dataset.learningOpen = String(
      experiences.some((experience) => !pane(experience).panel.hidden),
    );
    document.body.dataset.learningNotebookOpen = String(
      Boolean(panes.notebook && !panes.notebook.panel.hidden),
    );
    document.body.dataset.learningAssistantOpen = String(
      !panes.assistant.panel.hidden,
    );
    panes.notebook?.syncSize();
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
  const panel = pane(experience).panel;
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
async function refresh(readAttempts = false) {
  // A peer inquiry can request its saved attempts during an ordinary status check.
  if (readAttempts && refreshing) await refreshing;
  if (!refreshing)
    refreshing = (async () => {
      const companionStatus = await client.status();
      const data =
        legacyRecovery || readAttempts
          ? await client.request<
              Pick<LearningSnapshot, "entries" | "judgments">
            >("/notebook")
          : snapshot;
      snapshot = {
        connected: true,
        companionStatus,
        entries: legacyRecovery
          ? data.entries
          : data.entries.filter((entry) => entry.kind === "attempt"),
        judgments: legacyRecovery ? data.judgments : [],
      };
      experiences.forEach((experience) => pane(experience).update(snapshot));
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
  recordAttempt: (entry) => {
    snapshot = {
      ...snapshot,
      entries: [
        ...snapshot.entries.filter((item) => item.id !== entry.id),
        entry,
      ],
    };
    pane("assistant").update(snapshot);
  },
  connection: (connected) => {
    if (connected === snapshot.connected) return;
    snapshot = {
      ...snapshot,
      connected,
      ...(!connected
        ? { companionStatus: null, entries: [], judgments: [] }
        : {}),
    };
    experiences.forEach((experience) => pane(experience).update(snapshot));
  },
  open: show,
  close,
  raise,
  navigate: (experience, view) => {
    if (experience === "notebook" && !legacyRecovery) {
      location.assign("/diary/");
      return;
    }
    pane(experience).navigate(view);
  },
  beginNote: (...args) => panes.notebook?.beginNote(...args) ?? false,
  write: downloadTakeaway,
  discuss: (value) => panes.assistant.discuss(value),
};
const panes = {
  notebook: legacyRecovery ? createLearningPane("notebook", services) : null,
  assistant: createLearningPane("assistant", services),
};
compact.addEventListener("change", syncPanels);
let accountIdentity: string | null = null;
const cockpit = createLearningCockpit({
  client,
  settings: async () => {
    if (client.token) {
      try {
        await refresh();
      } catch {
        services.connection(false);
      }
    }
    services.navigate("assistant", "connect");
  },
  write: downloadTakeaway,
  disconnected: () => services.connection(false),
  diary: () => location.assign("/diary/"),
  assistant: () => {
    show("assistant");
    void panes.assistant.open(null, false);
  },
});
document.addEventListener("book-account-changed", (event) => {
  const account = (event as CustomEvent<SiteAccount>).detail;
  const identity = JSON.stringify([
    account.github.user?.id,
    account.course.user?.id,
    account.course.user?.courseId,
  ]);
  if (identity !== accountIdentity) {
    accountIdentity = identity;
    panes.assistant.accountChanged();
  }
});
document.addEventListener("book-learning-action", (event) => {
  const action = (event as CustomEvent<LearningAction>).detail;
  if (action.kind === "investigate") {
    if (!action.resume) experiences.forEach(close);
    cockpit.open(action);
    return;
  }
  void (async () => {
    if (client.token && !snapshot.connected) {
      try {
        await refresh();
      } catch {
        /* Keep the requested draft available through connection recovery. */
      }
    }
    if (action.kind === "discuss") panes.assistant.discuss(action.draft);
    else services.navigate(action.experience, action.view);
  })();
});
document.addEventListener("book-learning-open", (event) => {
  const { experience, selection, resume, currentReading } = (
    event as CustomEvent<{
      experience: LearningExperience;
      selection: ReadingSelection | null;
      resume: boolean;
      currentReading?: boolean;
    }>
  ).detail;
  if (experience === "notebook" && !legacyRecovery) return;
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
          await pane(owner).open(null, true);
          if (recovery) pane(owner).recover(recovery);
        }
    })();
  } else if (!pane(experience).panel.hidden) close(experience);
  else {
    show(experience);
    void pane(experience).open(selection, false, currentReading);
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
    (anchor.hasAttribute("data-account-navigation") ||
      /^\/(chapters|appendices|parts|case-studies|project|concepts|explore|demos|notebook|diary|course)\//.test(
        destination.pathname,
      ));
});
window.addEventListener("pageshow", () => {
  followingBookLink = false;
});
window.addEventListener("pagehide", persist);
window.addEventListener("beforeunload", (event) => {
  persist();
  if (
    (experiences.some((experience) => pane(experience).hasDraft()) ||
      cockpit.hasDraft()) &&
    !followingBookLink
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
