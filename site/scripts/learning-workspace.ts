import { downloadTakeaway } from "./learning-diary.ts";
import { LearningClient } from "./learning-client.ts";
import {
  createLearningPane,
  type LearningSnapshot,
  type LearningPaneServices,
} from "./learning-pane.ts";
import { syncLearningLaunchers } from "./learning-navigation.ts";
import {
  readLearningSession,
  saveLearningSession,
} from "./learning-session.ts";
import type { ReadingSelection } from "./learning-selection.ts";
import type { LearningAction } from "./learning-actions.ts";
import type { SiteAccount } from "../../shared/site-account.ts";
import { createLearningCockpit } from "./learning-cockpit.ts";
export {
  observeLearningDemo,
  changeLearningDemo,
  availableLearningDemos,
} from "./learning-demos.ts";

// The assistant and cockpit share a connection to the local companion.
const client = new LearningClient();
const session = readLearningSession();
let snapshot: LearningSnapshot = {
  connected: false,
  companionStatus: null,
  entries: [],
};
let refreshing: Promise<void> | null = null;

function setOpen(open: boolean) {
  session.assistantOpen = open;
  const panel = assistant.panel;
  const returnFocus = !open && panel.contains(document.activeElement);
  if (!open && panel.open) panel.close();
  panel.hidden = !open;
  if (open && !panel.open) panel.show();
  syncLearningLaunchers(panel);
  document.body.dataset.learningAssistantOpen = String(open);
  if (returnFocus)
    document
      .querySelector<HTMLButtonElement>('[data-learning-toggle="assistant"]')
      ?.focus({ preventScroll: true });
  saveLearningSession(session);
}
async function refresh(readAttempts = false) {
  // A peer inquiry can request its saved attempts during an ordinary status check.
  if (readAttempts && refreshing) await refreshing;
  if (!refreshing)
    refreshing = (async () => {
      const companionStatus = await client.status();
      const entries = readAttempts
        ? (
            await client.request<Pick<LearningSnapshot, "entries">>("/notebook")
          ).entries.filter((entry) => entry.kind === "attempt")
        : snapshot.entries;
      snapshot = { connected: true, companionStatus, entries };
      assistant.update(snapshot);
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
    saveLearningSession(session);
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
    assistant.update(snapshot);
  },
  connection: (connected) => {
    if (connected === snapshot.connected) return;
    snapshot = {
      ...snapshot,
      connected,
      ...(!connected ? { companionStatus: null, entries: [] } : {}),
    };
    assistant.update(snapshot);
  },
  open: () => setOpen(true),
  close: () => setOpen(false),
  write: downloadTakeaway,
};
const assistant = createLearningPane(services);
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
    assistant.navigate("connect");
  },
  write: downloadTakeaway,
  disconnected: () => services.connection(false),
  diary: () => location.assign("/diary/"),
  assistant: () => {
    setOpen(true);
    void assistant.open(null, false);
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
    assistant.accountChanged();
  }
});
document.addEventListener("book-learning-action", (event) => {
  const action = (event as CustomEvent<LearningAction>).detail;
  if (action.kind === "investigate") {
    if (!action.resume) setOpen(false);
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
    if (action.kind === "discuss") assistant.discuss(action.draft);
    else assistant.navigate(action.view);
  })();
});
document.addEventListener("book-learning-open", (event) => {
  const { selection, resume, currentReading } = (
    event as CustomEvent<{
      selection: ReadingSelection | null;
      resume: boolean;
      currentReading?: boolean;
    }>
  ).detail;
  if (!resume && !assistant.panel.hidden) {
    setOpen(false);
    return;
  }
  setOpen(true);
  void (async () => {
    let recovery = "";
    if (resume && client.token) {
      try {
        await refresh();
      } catch (error) {
        recovery =
          error instanceof Error ? error.message : "Reconnect the companion.";
      }
    }
    await assistant.open(selection, resume, currentReading);
    if (recovery) assistant.recover(recovery);
  })();
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
window.addEventListener("pagehide", () => saveLearningSession(session));
window.addEventListener("beforeunload", (event) => {
  saveLearningSession(session);
  if ((assistant.hasDraft() || cockpit.hasDraft()) && !followingBookLink) {
    event.preventDefault();
    event.returnValue = "";
  }
});
