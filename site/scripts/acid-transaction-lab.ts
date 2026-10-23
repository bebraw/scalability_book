{
  type AcidScenario = "failure" | "concurrent" | "restart";
  type AcidMode = "application" | "transaction";
  type AcidIsolation = "read-committed" | "serializable";
  type AcidStatus = "pass" | "fail" | "idle";
  type AcidReplyTiming = "before" | "after";

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
    result: "protected" | "broken";
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
    const timing = query<HTMLSelectElement>(root, "[data-acid-reply-timing]");
    const reset = query<HTMLButtonElement>(root, "[data-acid-reset]");
    const controlNote = query<HTMLElement>(root, "[data-acid-control-note]");
    const program = query<HTMLDetailsElement>(root, "[data-acid-program]");

    const updateControls = () => {
      const isConcurrent = readScenario(scenario.value) === "concurrent";
      const isRestart = readScenario(scenario.value) === "restart";
      mode.disabled = isRestart;
      mode.closest("label")!.hidden = isRestart;
      timing.closest("label")!.hidden = !isRestart;
      const usesTransaction = readMode(mode.value) === "transaction";
      isolation.disabled = !isConcurrent || !usesTransaction;
      program.hidden = !isConcurrent;
      program.open = isConcurrent;
      controlNote.textContent = isRestart
        ? "Both restart traces use the same durable transaction. Only the reply timing changes: before or after commit. No database executes here."
        : isConcurrent
          ? usesTransaction
            ? "Both requests read initial before either commits, then write unconditionally as shown below. Vary isolation for this program; compare the conditional-write alternative separately."
            : "Separate application-managed writes do not share an isolation boundary."
          : "Isolation is not varied in this disturbance; the experiment focuses on the selected failure boundary.";
      resetOutput(root);
    };

    scenario.addEventListener("change", updateControls);
    mode.addEventListener("change", updateControls);
    isolation.addEventListener("change", () => resetOutput(root));
    timing.addEventListener("change", () => resetOutput(root));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = evaluateAcidScenario(
        readScenario(scenario.value),
        readMode(mode.value),
        readIsolation(isolation.value),
        timing.value === "after" ? "after" : "before",
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
    timing: AcidReplyTiming,
  ): AcidResult {
    if (scenario === "failure") return evaluateFailure(mode);
    if (scenario === "restart") return evaluateRestart(timing);
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
        result: "protected",

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
      result: "broken",

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
        result: "protected",

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
      result: "broken",

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

  function evaluateRestart(timing: AcidReplyTiming): AcidResult {
    if (timing === "after") {
      return {
        acknowledgement: "200 · committed before reply",
        events: [{ actor: "Alice", type: "work_started" }],
        explanation:
          "The server returned success only after the durable commit. A fresh process reconstructed the acknowledged state and its event from storage.",
        invariant: "Protected: acknowledged state survived restart",
        itemState: "Active",
        result: "protected",

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
      acknowledgement: "200 · returned before commit",
      events: [],
      explanation:
        "The application replied while the transaction was still uncommitted. The modeled crash discarded that pending transaction. The same durable store is used in both restart traces; early acknowledgement caused the broken promise.",
      invariant: "Broken: acknowledged transition disappeared",
      itemState: "Initial",
      result: "broken",

      summary:
        "A fast response promised more than the persistence boundary guaranteed.",
      trace: [
        trace(
          "pass",
          "BEGIN",
          "Stage initial → active and its event in one transaction",
        ),
        trace("fail", "REPLY", "Return success before durable commit"),
        trace(
          "fail",
          "RESTART",
          "Process stops before commit; uncommitted writes roll back",
        ),
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
  }

  function trace(status: AcidStatus, label: string, detail: string): AcidTrace {
    return { detail, label, status };
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
