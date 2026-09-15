export const mutationNames = [
  "baseline",
  "storage-refactor",
  "authorization-bypass",
  "retry-duplication",
  "archive-write",
] as const;

export type MutationName = (typeof mutationNames)[number];

export type EventType = "work_started" | "work_completed";

export type RecordEventCommand = {
  workspaceId: string;
  actorId: string;
  commandId: string;
  type: EventType;
};

export type RecordedEvent = RecordEventCommand & {
  id: string;
};

export type RecordEventResult =
  | { kind: "recorded"; event: RecordedEvent; replayed: boolean }
  | {
      kind: "rejected";
      reason:
        | "workspace_not_found"
        | "forbidden"
        | "command_conflict"
        | "workspace_archived";
    };

export type Tracker = {
  archiveWorkspace: (workspaceId: string) => boolean;
  listEvents: (workspaceId: string) => readonly RecordedEvent[];
  recordEvent: (command: RecordEventCommand) => RecordEventResult;
};

type Workspace = {
  id: string;
  members: Set<string>;
  status: "active" | "archived";
};

export function parseMutation(value: string | undefined): MutationName {
  const candidate = value ?? "baseline";

  if (mutationNames.includes(candidate as MutationName)) {
    return candidate as MutationName;
  }

  throw new Error(
    `Unknown fixture mode "${candidate}". Choose one of: ${mutationNames.join(", ")}.`,
  );
}

export function createTracker(mutation: MutationName = "baseline"): Tracker {
  const workspaces = new Map<string, Workspace>([
    [
      "W1",
      {
        id: "W1",
        members: new Set(["alice"]),
        status: "active",
      },
    ],
  ]);
  const events = new Map<string, RecordedEvent[]>();
  // The refactor keeps one ordered log instead of grouping events by workspace.
  // Both representations expose the same tracker contract.
  const eventLog: { workspaceId: string; event: RecordedEvent }[] = [];
  const eventsByCommand = new Map<string, RecordedEvent>();
  let nextEventNumber = 1;

  const archiveWorkspace = (workspaceId: string) => {
    const workspace = workspaces.get(workspaceId);

    if (!workspace) {
      return false;
    }

    workspace.status = "archived";
    return true;
  };

  const listEvents = (workspaceId: string) =>
    mutation === "storage-refactor"
      ? eventLog
          .filter((entry) => entry.workspaceId === workspaceId)
          .map((entry) => entry.event)
      : [...(events.get(workspaceId) ?? [])];

  const recordEvent = (command: RecordEventCommand): RecordEventResult => {
    const workspace = workspaces.get(command.workspaceId);

    if (!workspace) {
      return { kind: "rejected", reason: "workspace_not_found" };
    }

    if (
      mutation !== "authorization-bypass" &&
      !workspace.members.has(command.actorId)
    ) {
      return { kind: "rejected", reason: "forbidden" };
    }

    const commandKey = `${command.workspaceId}:${command.commandId}`;
    const existingEvent = eventsByCommand.get(commandKey);

    if (mutation !== "retry-duplication" && existingEvent) {
      const commandMatches =
        existingEvent.actorId === command.actorId &&
        existingEvent.type === command.type;

      if (!commandMatches) {
        return { kind: "rejected", reason: "command_conflict" };
      }

      return { kind: "recorded", event: existingEvent, replayed: true };
    }

    if (mutation !== "archive-write" && workspace.status === "archived") {
      return { kind: "rejected", reason: "workspace_archived" };
    }

    const event: RecordedEvent = {
      ...command,
      id: `E${nextEventNumber}`,
    };
    nextEventNumber += 1;

    if (mutation === "storage-refactor") {
      eventLog.push({ workspaceId: workspace.id, event });
    } else {
      const workspaceEvents = events.get(workspace.id) ?? [];
      workspaceEvents.push(event);
      events.set(workspace.id, workspaceEvents);
    }
    eventsByCommand.set(commandKey, event);

    return { kind: "recorded", event, replayed: false };
  };

  return { archiveWorkspace, listEvents, recordEvent };
}
