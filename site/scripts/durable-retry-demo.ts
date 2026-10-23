type DurableRetryPhase = "ready" | "crashed" | "recovered" | "stopped";
type DurableRetryPolicy = "retry" | "stop";
type DurableRetryKeyMode = "stable" | "fresh";
type DurableRetryDedupeMode = "none" | "atomic";

type DurableRetryConfiguration = {
  policy: DurableRetryPolicy;
  keyMode: DurableRetryKeyMode;
  dedupeMode: DurableRetryDedupeMode;
};

type DurableRetryHistoryEntry = {
  event: string;
  detail: string;
};

type DurableRetryAttempt = {
  number: number;
  key: string;
  reply: string;
  effectNumber: number;
  applied: boolean;
};

const durableRetryBusinessKey = "deliver:E42:subscriber-7";

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-durable-retry]",
)) {
  initializeDurableRetryLab(root);
}

function initializeDurableRetryLab(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-durable-retry-form]");
  const policySelect = root.querySelector<HTMLSelectElement>(
    "[data-durable-retry-policy]",
  );
  const keyModeSelect = root.querySelector<HTMLSelectElement>(
    "[data-durable-retry-key-mode]",
  );
  const dedupeSelect = root.querySelector<HTMLSelectElement>(
    "[data-durable-retry-dedupe]",
  );
  const predictionInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-durable-retry-prediction]"),
  );
  const crashButton = root.querySelector<HTMLButtonElement>(
    "[data-durable-retry-crash]",
  );
  const recoverButton = root.querySelector<HTMLButtonElement>(
    "[data-durable-retry-recover]",
  );
  const resetButton = root.querySelector<HTMLButtonElement>(
    "[data-durable-retry-reset]",
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-durable-retry-verdict]",
  );
  const summary = root.querySelector<HTMLElement>(
    "[data-durable-retry-summary]",
  );
  const faultNote = root.querySelector<HTMLElement>(
    "[data-durable-retry-fault-note]",
  );
  const appStatus = root.querySelector<HTMLElement>(
    "[data-durable-retry-app-status]",
  );
  const lastFact = root.querySelector<HTMLElement>(
    "[data-durable-retry-last-fact]",
  );
  const historyBody = root.querySelector<HTMLTableSectionElement>(
    "[data-durable-retry-history]",
  );
  const receiverBody = root.querySelector<HTMLTableSectionElement>(
    "[data-durable-retry-receiver-ledger]",
  );
  const resultLabel = root.querySelector<HTMLElement>(
    "[data-durable-retry-result-label]",
  );
  const result = root.querySelector<HTMLElement>("[data-durable-retry-result]");
  const resultPanel = result?.closest<HTMLElement>(".durable-retry-result");
  const resultMark = root.querySelector<HTMLElement>(
    ".durable-retry-result-mark",
  );
  const artifact = root.querySelector<HTMLTextAreaElement>(
    "[data-durable-retry-artifact]",
  );
  const copyButton = root.querySelector<HTMLButtonElement>(
    "[data-durable-retry-copy]",
  );
  const metrics = new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>("[data-durable-retry-metric]"),
    ).map((metric) => [metric.dataset.durableRetryMetric ?? "", metric]),
  );

  if (
    !form ||
    !policySelect ||
    !keyModeSelect ||
    !dedupeSelect ||
    predictionInputs.length !== 2 ||
    !crashButton ||
    !recoverButton ||
    !resetButton ||
    !verdict ||
    !summary ||
    !faultNote ||
    !appStatus ||
    !lastFact ||
    !historyBody ||
    !receiverBody ||
    !resultLabel ||
    !result ||
    !resultPanel ||
    !resultMark ||
    !artifact ||
    !copyButton
  ) {
    return;
  }

  let phase: DurableRetryPhase = "ready";
  let activeConfiguration: DurableRetryConfiguration | undefined;
  let history: DurableRetryHistoryEntry[] = [];
  let attempts: DurableRetryAttempt[] = [];
  let effectCount = 0;
  let receiverKeys = new Map<string, number>();

  const selectedPrediction = () =>
    predictionInputs.find((input) => input.checked)?.value;

  const readConfiguration = (): DurableRetryConfiguration => ({
    policy: isDurableRetryPolicy(policySelect.value)
      ? policySelect.value
      : "retry",
    keyMode: isDurableRetryKeyMode(keyModeSelect.value)
      ? keyModeSelect.value
      : "stable",
    dedupeMode: isDurableRetryDedupeMode(dedupeSelect.value)
      ? dedupeSelect.value
      : "none",
  });

  const applyWebhookAttempt = (
    number: number,
    configuration: DurableRetryConfiguration,
  ) => {
    const key =
      configuration.keyMode === "stable"
        ? durableRetryBusinessKey
        : `${durableRetryBusinessKey}:attempt-${number}`;
    const existingEffect = receiverKeys.get(key);
    const duplicate =
      configuration.dedupeMode === "atomic" && existingEffect !== undefined;

    if (duplicate) {
      attempts.push({
        number,
        key,
        reply: "200 replay",
        effectNumber: existingEffect,
        applied: false,
      });
      return;
    }

    effectCount += 1;
    if (configuration.dedupeMode === "atomic") {
      // The receiver commits the business effect and this key in one boundary.
      receiverKeys.set(key, effectCount);
    }
    attempts.push({
      number,
      key,
      reply: "202 accepted",
      effectNumber: effectCount,
      applied: true,
    });
  };

  const injectCrash = () => {
    if (phase !== "ready" || !selectedPrediction()) {
      return;
    }

    activeConfiguration = readConfiguration();
    history = [
      {
        event: "WorkflowStarted",
        detail: "One logical delivery command accepted",
      },
      {
        event: "ActivityScheduled #1",
        detail: "Attempt 1 may execute",
      },
    ];
    attempts = [];
    effectCount = 0;
    receiverKeys = new Map<string, number>();
    applyWebhookAttempt(1, activeConfiguration);
    phase = "crashed";
    render();
  };

  const recover = () => {
    if (phase !== "crashed" || !activeConfiguration) {
      return;
    }

    history.push({
      event: "ActivityTimedOut #1",
      detail: "No completion exists in history",
    });

    if (activeConfiguration.policy === "stop") {
      history.push({
        event: "WorkflowFailed",
        detail: "External effect remains possible",
      });
      phase = "stopped";
      render();
      return;
    }

    history.push({
      event: "ActivityScheduled #2",
      detail: "Replay schedules a physical retry",
    });
    applyWebhookAttempt(2, activeConfiguration);
    history.push(
      {
        event: "ActivityCompleted #2",
        detail: "Receiver result is now durable",
      },
      {
        event: "WorkflowCompleted",
        detail: "Logical delivery command finished",
      },
    );
    phase = "recovered";
    render();
  };

  const reset = () => {
    phase = "ready";
    activeConfiguration = undefined;
    history = [];
    attempts = [];
    effectCount = 0;
    receiverKeys = new Map<string, number>();
    predictionInputs.forEach((input) => {
      input.checked = false;
    });
    render();
  };

  const render = () => {
    const prediction = selectedPrediction();
    const controlsLocked = phase !== "ready";

    root.dataset.durableRetryPhase = phase;
    policySelect.disabled = controlsLocked;
    keyModeSelect.disabled = controlsLocked;
    dedupeSelect.disabled = controlsLocked;
    predictionInputs.forEach((input) => {
      input.disabled = controlsLocked;
    });
    crashButton.disabled = controlsLocked || !prediction;
    recoverButton.disabled = phase !== "crashed";

    metrics.get("attempts")!.textContent = String(attempts.length);
    metrics.get("effects")!.textContent = String(effectCount);
    metrics.get("completion")!.textContent = phase === "recovered" ? "1" : "0";

    appStatus.textContent =
      phase === "ready"
        ? "Ready"
        : phase === "crashed"
          ? "Pending · effect may exist"
          : phase === "recovered"
            ? "Delivered"
            : "Delivery unknown";
    lastFact.textContent = history[history.length - 1]?.event ?? "None";

    historyBody.innerHTML = history.length
      ? history
          .map(
            (entry, index) => `<tr>
              <td>${String(index + 1).padStart(2, "0")}</td>
              <td><code>${escapeDurableRetryHtml(entry.event)}</code></td>
              <td>${escapeDurableRetryHtml(entry.detail)}</td>
            </tr>`,
          )
          .join("")
      : '<tr class="is-empty"><td colspan="3">Run the first attempt to create history.</td></tr>';

    receiverBody.innerHTML = attempts.length
      ? attempts
          .map(
            (
              attempt,
            ) => `<tr data-durable-retry-attempt="${attempt.number}" data-durable-retry-effect="${attempt.applied ? "applied" : "replayed"}">
              <td>#${attempt.number}</td>
              <td><code>${escapeDurableRetryHtml(attempt.key)}</code></td>
              <td>${escapeDurableRetryHtml(attempt.reply)}</td>
              <td><span class="${attempt.applied ? "is-applied" : "is-replayed"}">${
                attempt.applied
                  ? `Applied effect #${attempt.effectNumber}`
                  : `Replayed effect #${attempt.effectNumber}`
              }</span></td>
            </tr>`,
          )
          .join("")
      : '<tr class="is-empty"><td colspan="4">No webhook attempts yet.</td></tr>';

    updateDurableRetryCopy({
      phase,
      activeConfiguration,
      effectCount,
      prediction,
      verdict,
      summary,
      faultNote,
      resultPanel,
      resultMark,
      resultLabel,
      result,
    });
    artifact.value = buildDurableRetryArtifact({
      phase,
      configuration: activeConfiguration ?? readConfiguration(),
      prediction,
      history,
      attempts,
      effectCount,
    });
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", render);
  crashButton.addEventListener("click", injectCrash);
  recoverButton.addEventListener("click", recover);
  resetButton.addEventListener("click", reset);
  copyButton.addEventListener("click", async () => {
    artifact.select();

    try {
      await navigator.clipboard.writeText(artifact.value);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy model notes";
      }, 1400);
    } catch {
      copyButton.textContent = "Select text";
    }
  });

  render();
}

function buildDurableRetryArtifact({
  phase,
  configuration,
  prediction,
  history,
  attempts,
  effectCount,
}: {
  phase: DurableRetryPhase;
  configuration: DurableRetryConfiguration;
  prediction: string | undefined;
  history: DurableRetryHistoryEntry[];
  attempts: DurableRetryAttempt[];
  effectCount: number;
}) {
  const durableCompletions = phase === "recovered" ? 1 : 0;
  const interpretation =
    phase === "ready"
      ? "Not run."
      : phase === "crashed"
        ? "The receiver effect exists, while workflow completion is absent."
        : phase === "stopped"
          ? "The workflow recorded failure, but the first receiver effect remains."
          : effectCount === 1
            ? "The retry reused a stable business key and the receiver replayed its atomic result."
            : "The retry produced a second receiver effect.";

  return [
    "Durable retry — simulated model notes",
    "Browser-only in-memory simulation; no process crash, HTTP delivery or durable storage was executed.",
    "",
    "Scenario: deliver event E42 to subscriber-7",
    "Fault: worker stops after the receiver effect and before completion is recorded",
    `Phase: ${phase}`,
    `Prediction: ${prediction ? `${prediction} receiver effect${prediction === "1" ? "" : "s"}` : "not recorded"}`,
    "",
    "Configuration:",
    `- Retry policy: ${configuration.policy}`,
    `- Retry key: ${configuration.keyMode}`,
    `- Receiver deduplication: ${configuration.dedupeMode}`,
    "",
    "Modeled counts:",
    `- Logical commands: ${phase === "ready" ? 0 : 1}`,
    `- Activity attempts: ${attempts.length}`,
    `- Outbound calls: ${attempts.length}`,
    `- Receiver effects: ${effectCount}`,
    `- Durable completions: ${durableCompletions}`,
    "",
    `Last workflow fact: ${history[history.length - 1]?.event ?? "none"}`,
    `Interpretation: ${interpretation}`,
  ].join("\n");
}

function updateDurableRetryCopy({
  phase,
  activeConfiguration,
  effectCount,
  prediction,
  verdict,
  summary,
  faultNote,
  resultPanel,
  resultMark,
  resultLabel,
  result,
}: {
  phase: DurableRetryPhase;
  activeConfiguration: DurableRetryConfiguration | undefined;
  effectCount: number;
  prediction: string | undefined;
  verdict: HTMLElement;
  summary: HTMLElement;
  faultNote: HTMLElement;
  resultPanel: HTMLElement;
  resultMark: HTMLElement;
  resultLabel: HTMLElement;
  result: HTMLElement;
}) {
  resultPanel.classList.remove("is-success", "is-warning", "is-failure");

  if (phase === "ready") {
    verdict.textContent = prediction
      ? `${prediction}-effect prediction armed`
      : "Predict the recovery outcome";
    summary.textContent =
      "One command can produce more than one physical attempt.";
    faultNote.querySelector("span")!.textContent = "Modeled failure window";
    resultMark.textContent = "?";
    resultLabel.textContent = "Awaiting model run";
    result.textContent = prediction
      ? "Prediction recorded. Send the first attempt into the crash window."
      : "Make a prediction, then stop the worker inside the failure window.";
    return;
  }

  if (phase === "crashed") {
    verdict.textContent = "Effect applied; completion missing";
    summary.textContent =
      "Replay can prove the activity was scheduled, not whether its effect happened.";
    faultNote.querySelector("span")!.textContent = "Worker stopped at the seam";
    resultPanel.classList.add("is-warning");
    resultMark.textContent = "!";
    resultLabel.textContent = "Modeled crash boundary";
    result.textContent =
      "The receiver committed effect #1, but workflow history still ends at ActivityScheduled #1. Recover from history to learn what the retry contract does.";
    return;
  }

  const predictionMatched = prediction === String(effectCount);
  resultPanel.classList.add(predictionMatched ? "is-success" : "is-failure");
  resultMark.textContent = predictionMatched ? "✓" : "×";
  resultLabel.textContent = predictionMatched
    ? "Prediction confirmed"
    : "Prediction challenged";

  if (phase === "stopped") {
    verdict.textContent = "Stopped with an uncertain delivery";
    summary.textContent =
      "No retry avoids another attempt but cannot erase the first effect.";
    faultNote.querySelector("span")!.textContent = "Recovery recorded failure";
    result.textContent = `${predictionMatched ? "Your prediction matched." : "Your prediction did not match."} One webhook effect exists, while authoritative application state reports delivery unknown.`;
    return;
  }

  verdict.textContent = `1 command · 2 attempts · ${effectCount} effect${effectCount === 1 ? "" : "s"}`;
  faultNote.querySelector("span")!.textContent = "Recovery completed";

  if (
    activeConfiguration?.dedupeMode === "atomic" &&
    activeConfiguration.keyMode === "stable"
  ) {
    summary.textContent =
      "The receiver replayed the stored result for the stable key.";
    result.textContent = `${predictionMatched ? "Your prediction matched." : "Your prediction did not match."} The receiver atomically stored the first effect with the business key, so attempt 2 returned that result without applying another effect.`;
  } else if (activeConfiguration?.keyMode === "fresh") {
    summary.textContent =
      "Fresh keys made both attempts look like new commands.";
    result.textContent = `${predictionMatched ? "Your prediction matched." : "Your prediction did not match."} Receiver-side deduplication cannot connect two different keys, so the retry applied effect #2.`;
  } else {
    summary.textContent = "The receiver accepted both physical attempts.";
    result.textContent = `${predictionMatched ? "Your prediction matched." : "Your prediction did not match."} Reusing a key has no effect unless the receiver enforces it at the side-effect boundary.`;
  }
}

function isDurableRetryPolicy(value: string): value is DurableRetryPolicy {
  return value === "retry" || value === "stop";
}

function isDurableRetryKeyMode(value: string): value is DurableRetryKeyMode {
  return value === "stable" || value === "fresh";
}

function isDurableRetryDedupeMode(
  value: string,
): value is DurableRetryDedupeMode {
  return value === "none" || value === "atomic";
}

function escapeDurableRetryHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
