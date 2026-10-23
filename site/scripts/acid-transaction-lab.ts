{
  type AcidScenario = "failure" | "concurrent" | "restart";
  type AcidMode = "application" | "transaction";
  type AcidIsolation = "read-committed" | "serializable";
  type AcidStatus = "pass" | "fail" | "idle";
  type AcidStage = "read" | "state" | "event" | "commit";
  type AcidStageStatus = "complete" | "failed" | "rolled-back" | "skipped";

  type AcidProperty = {
    status: AcidStatus;
    text: string;
  };

  type AcidEvent = {
    actor: string;
    type: "work_started" | "work_completed";
  };

  type AcidTrace = {
    detail: string;
    label: string;
    status: AcidStatus;
  };

  type AcidResult = {
    acknowledgement: string;
    events: AcidEvent[];
    explanation: string;
    invariant: string;
    itemState: "Initial" | "Active" | "Finished";
    properties: Record<
      "atomicity" | "consistency" | "isolation" | "durability",
      AcidProperty
    >;
    result: "protected" | "broken";
    stages: Record<AcidStage, AcidStageStatus>;
    summary: string;
    trace: AcidTrace[];
    verdict: string;
  };

  const acidLabs = document.querySelectorAll<HTMLElement>("[data-acid-lab]");

  for (const root of acidLabs) initializeAcidLab(root);

  function initializeAcidLab(root: HTMLElement) {
    const form = query<HTMLFormElement>(root, "[data-acid-form]");
    const scenario = query<HTMLSelectElement>(root, "[data-acid-scenario]");
    const mode = query<HTMLSelectElement>(root, "[data-acid-mode]");
    const isolation = query<HTMLSelectElement>(root, "[data-acid-isolation]");
    const reset = query<HTMLButtonElement>(root, "[data-acid-reset]");
    const controlNote = query<HTMLElement>(root, "[data-acid-control-note]");
    const program = query<HTMLDetailsElement>(root, "[data-acid-program]");

    const updateControls = () => {
      const isConcurrent = readScenario(scenario.value) === "concurrent";
      const usesTransaction = readMode(mode.value) === "transaction";
      isolation.disabled = !isConcurrent || !usesTransaction;
      program.hidden = !isConcurrent;
      program.open = isConcurrent;
      controlNote.textContent = isConcurrent
        ? usesTransaction
          ? "Both requests read initial before either commits, then write unconditionally as shown below. Vary isolation for this program; compare the conditional-write alternative separately."
          : "Separate application-managed writes do not share an isolation boundary."
        : "Isolation is not varied in this disturbance; the experiment focuses on the selected failure boundary.";
      resetOutput(root);
    };

    scenario.addEventListener("change", updateControls);
    mode.addEventListener("change", updateControls);
    isolation.addEventListener("change", () => resetOutput(root));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = evaluateAcidScenario(
        readScenario(scenario.value),
        readMode(mode.value),
        readIsolation(isolation.value),
      );
      renderAcidResult(root, result);
    });

    reset.addEventListener("click", () => {
      form.reset();
      updateControls();
    });

    updateControls();
  }

  function evaluateAcidScenario(
    scenario: AcidScenario,
    mode: AcidMode,
    isolation: AcidIsolation,
  ): AcidResult {
    if (scenario === "failure") return evaluateFailure(mode);
    if (scenario === "restart") return evaluateRestart(mode);
    return evaluateConcurrency(mode, isolation);
  }

  function evaluateFailure(mode: AcidMode): AcidResult {
    if (mode === "transaction") {
      return {
        acknowledgement: "500 · transaction rolled back",
        events: [],
        explanation:
          "The injected failure occurred before commit. The database rolled back the state change, so the item and event ledger still agree.",
        invariant: "Protected: no partial transition escaped",
        itemState: "Active",
        properties: {
          atomicity: property("pass", "Both writes rolled back"),
          consistency: property("pass", "Lifecycle invariant preserved"),
          isolation: property("idle", "No competing transaction"),
          durability: property("idle", "Nothing committed"),
        },
        result: "protected",
        stages: stages("complete", "rolled-back", "failed", "rolled-back"),
        summary:
          "The state change and its event remained one indivisible unit.",
        trace: [
          trace("pass", "BEGIN", "Open one transaction for state and event"),
          trace(
            "pass",
            "UPDATE",
            "Stage active → finished inside the transaction",
          ),
          trace("fail", "FAULT", "Connection fails before the event append"),
          trace("pass", "ROLLBACK", "Discard the uncommitted state change"),
        ],
        verdict: "Atomic rollback preserved the contract",
      };
    }

    return {
      acknowledgement: "500 · operation interrupted",
      events: [],
      explanation:
        "The state write became durable before the event write began. The failure left a finished item with no work_completed event.",
      invariant: "Broken: finished item has no completion event",
      itemState: "Finished",
      properties: {
        atomicity: property("fail", "Only the state write survived"),
        consistency: property("fail", "Lifecycle invariant broken"),
        isolation: property("idle", "No competing operation"),
        durability: property("idle", "Not the tested boundary"),
      },
      result: "broken",
      stages: stages("complete", "complete", "failed", "skipped"),
      summary:
        "Two individually durable writes still formed one broken operation.",
      trace: [
        trace("pass", "READ", "Observe I42 in the active state"),
        trace("pass", "UPDATE", "Persist active → finished immediately"),
        trace(
          "fail",
          "FAULT",
          "Process stops before work_completed is appended",
        ),
        trace(
          "fail",
          "RESULT",
          "No shared boundary exists to roll the state back",
        ),
      ],
      verdict: "A partial write escaped",
    };
  }

  function evaluateConcurrency(
    mode: AcidMode,
    isolation: AcidIsolation,
  ): AcidResult {
    if (mode === "transaction" && isolation === "serializable") {
      return {
        acknowledgement: "Alice 200 · Bob 409 retry",
        events: [{ actor: "Alice", type: "work_started" }],
        explanation:
          "The database accepted one serial order. Alice committed the transition; Bob's transaction could no longer behave as though it started from the same initial state.",
        invariant: "Protected: one transition produced one event",
        itemState: "Active",
        properties: {
          atomicity: property("pass", "Each attempt stayed whole"),
          consistency: property("pass", "One successful transition"),
          isolation: property("pass", "Equivalent to a serial order"),
          durability: property("idle", "Restart not exercised"),
        },
        result: "protected",
        stages: stages("complete", "complete", "complete", "complete"),
        summary:
          "One transaction committed; the conflicting transaction must retry.",
        trace: [
          trace("pass", "T1 + T2", "Alice and Bob both read initial"),
          trace("pass", "T1 COMMIT", "Alice stores active + work_started"),
          trace(
            "fail",
            "T2 ABORT",
            "Serialization conflict rejects Bob's stale decision",
          ),
          trace("pass", "RESULT", "Exactly one successful transition remains"),
        ],
        verdict: "Serializable execution preserved one history",
      };
    }

    const transactionText =
      mode === "transaction"
        ? "Each transaction was atomic, but both application checks read initial before either committed. The modeled UPDATE checks only the item ID, so the second caller writes active again and appends another event."
        : "Both requests checked the initial state outside a shared transaction boundary, then persisted their writes independently.";

    return {
      acknowledgement: "Alice 200 · Bob 200",
      events: [
        { actor: "Alice", type: "work_started" },
        { actor: "Bob", type: "work_started" },
      ],
      explanation: `${transactionText} Atomicity alone does not serialize competing decisions.`,
      invariant: "Broken: one transition was accepted twice",
      itemState: "Active",
      properties: {
        atomicity: property(
          mode === "transaction" ? "pass" : "idle",
          mode === "transaction"
            ? "Each pair committed together"
            : "No shared transaction",
        ),
        consistency: property("fail", "Duplicate transition events"),
        isolation: property("fail", "Both acted on the same old state"),
        durability: property("idle", "Restart not exercised"),
      },
      result: "broken",
      stages: stages("complete", "complete", "complete", "complete"),
      summary:
        "Both callers received success for the same lifecycle transition.",
      trace: [
        trace("pass", "READ ×2", "Alice and Bob both observe initial"),
        trace("pass", "WRITE ×2", "Both set the item to active"),
        trace("fail", "EVENT ×2", "Both append work_started"),
        trace("fail", "RESULT", "The ledger contains two successful starts"),
      ],
      verdict: "Concurrent decisions leaked through",
    };
  }

  function evaluateRestart(mode: AcidMode): AcidResult {
    if (mode === "transaction") {
      return {
        acknowledgement: "200 · committed before reply",
        events: [{ actor: "Alice", type: "work_started" }],
        explanation:
          "The server returned success only after the durable commit. A fresh process reconstructed the acknowledged state and its event from storage.",
        invariant: "Protected: acknowledged state survived restart",
        itemState: "Active",
        properties: {
          atomicity: property("pass", "State and event committed together"),
          consistency: property("pass", "Lifecycle invariant preserved"),
          isolation: property("idle", "No competing transaction"),
          durability: property("pass", "Commit survived restart"),
        },
        result: "protected",
        stages: stages("complete", "complete", "complete", "complete"),
        summary:
          "The acknowledged transition remained visible after process loss.",
        trace: [
          trace("pass", "BEGIN", "Stage initial → active and work_started"),
          trace("pass", "COMMIT", "Durable storage confirms the transaction"),
          trace("pass", "REPLY", "Return success after commit"),
          trace("pass", "RESTART", "Reload the same committed state"),
        ],
        verdict: "Committed state survived restart",
      };
    }

    return {
      acknowledgement: "200 · returned before flush",
      events: [],
      explanation:
        "The application acknowledged an in-memory change while its persistence task was still pending. Restart removed the state that the client had been told was complete.",
      invariant: "Broken: acknowledged transition disappeared",
      itemState: "Initial",
      properties: {
        atomicity: property("idle", "No durable write completed"),
        consistency: property("idle", "Reloaded records agree"),
        isolation: property("idle", "No competing operation"),
        durability: property("fail", "Acknowledged state was lost"),
      },
      result: "broken",
      stages: stages("complete", "complete", "complete", "failed"),
      summary:
        "A fast response promised more than the persistence boundary guaranteed.",
      trace: [
        trace("pass", "MEMORY", "Apply initial → active and create an event"),
        trace("fail", "REPLY", "Return success before durable flush"),
        trace("fail", "RESTART", "Process stops with the flush still pending"),
        trace("fail", "RELOAD", "Storage still contains the initial state"),
      ],
      verdict: "The success response was not durable",
    };
  }

  function renderAcidResult(root: HTMLElement, result: AcidResult) {
    root.dataset.acidResult = result.result;
    query<HTMLElement>(root, "[data-acid-verdict]").textContent =
      result.verdict;
    query<HTMLElement>(root, "[data-acid-summary]").textContent =
      result.summary;
    query<HTMLElement>(root, "[data-acid-item-state]").textContent =
      result.itemState;
    query<HTMLElement>(root, "[data-acid-acknowledgement]").textContent =
      result.acknowledgement;
    query<HTMLElement>(root, "[data-acid-invariant]").textContent =
      result.invariant;
    query<HTMLElement>(root, "[data-acid-explanation]").textContent =
      result.explanation;
    query<HTMLElement>(root, ".acid-lab-invariant-mark").textContent =
      result.result === "protected" ? "✓" : "!";

    renderEvents(
      query<HTMLTableSectionElement>(root, "[data-acid-events]"),
      result.events,
    );
    renderTrace(
      query<HTMLOListElement>(root, "[data-acid-trace]"),
      result.trace,
    );

    for (const [name, assessment] of Object.entries(result.properties)) {
      const property = query<HTMLElement>(
        root,
        `[data-acid-property="${name}"]`,
      );
      property.dataset.status = assessment.status;
      query<HTMLElement>(property, "dd").textContent = assessment.text;
    }

    for (const [name, status] of Object.entries(result.stages)) {
      query<HTMLElement>(root, `[data-acid-stage="${name}"]`).dataset.status =
        status;
    }
  }

  function renderEvents(target: HTMLTableSectionElement, events: AcidEvent[]) {
    target.replaceChildren();
    if (events.length === 0) {
      const row = document.createElement("tr");
      row.className = "is-empty";
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = "No activity events stored.";
      row.append(cell);
      target.append(row);
      return;
    }

    events.forEach((event, index) => {
      const row = document.createElement("tr");
      row.dataset.acidEvent = event.type;
      for (const value of [
        String(index + 1).padStart(2, "0"),
        event.type,
        event.actor,
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      target.append(row);
    });
  }

  function renderTrace(target: HTMLOListElement, entries: AcidTrace[]) {
    target.replaceChildren();
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.dataset.status = entry.status;
      const label = document.createElement("span");
      label.textContent = entry.label;
      const detail = document.createElement("small");
      detail.textContent = entry.detail;
      item.append(label, detail);
      target.append(item);
    });
  }

  function resetOutput(root: HTMLElement) {
    root.dataset.acidResult = "ready";
    query<HTMLElement>(root, "[data-acid-verdict]").textContent =
      "Choose a failure boundary";
    query<HTMLElement>(root, "[data-acid-summary]").textContent =
      "One lifecycle transition must produce exactly one activity event.";
    query<HTMLElement>(root, "[data-acid-item-state]").textContent = "Initial";
    query<HTMLElement>(root, "[data-acid-acknowledgement]").textContent =
      "Not run";
    query<HTMLElement>(root, "[data-acid-invariant]").textContent =
      "Awaiting an operation";
    query<HTMLElement>(root, "[data-acid-explanation]").textContent =
      "The lifecycle state and activity ledger have not changed.";
    query<HTMLElement>(root, ".acid-lab-invariant-mark").textContent = "?";
    renderEvents(
      query<HTMLTableSectionElement>(root, "[data-acid-events]"),
      [],
    );
    renderTrace(query<HTMLOListElement>(root, "[data-acid-trace]"), [
      trace("idle", "Ready", "Select a scenario and run it."),
    ]);
    root
      .querySelectorAll<HTMLElement>("[data-acid-property]")
      .forEach((property) => {
        property.dataset.status = "idle";
        query<HTMLElement>(property, "dd").textContent = "Not exercised";
      });
    root.querySelectorAll<HTMLElement>("[data-acid-stage]").forEach((stage) => {
      delete stage.dataset.status;
    });
  }

  function property(status: AcidStatus, text: string): AcidProperty {
    return { status, text };
  }

  function trace(status: AcidStatus, label: string, detail: string): AcidTrace {
    return { detail, label, status };
  }

  function stages(
    read: AcidStageStatus,
    state: AcidStageStatus,
    event: AcidStageStatus,
    commit: AcidStageStatus,
  ): Record<AcidStage, AcidStageStatus> {
    return { commit, event, read, state };
  }

  function readScenario(value: string): AcidScenario {
    return value === "concurrent" || value === "restart" ? value : "failure";
  }

  function readMode(value: string): AcidMode {
    return value === "transaction" ? value : "application";
  }

  function readIsolation(value: string): AcidIsolation {
    return value === "serializable" ? value : "read-committed";
  }

  function query<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing ACID lab element: ${selector}`);
    return element;
  }
}
