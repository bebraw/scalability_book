type SymptomKey = "stale" | "missing" | "slow";
type SignalKey =
  | "logs"
  | "metrics"
  | "traces"
  | "errors"
  | "benchmark"
  | "database";
type SignalRating = "answers" | "supports" | "noisy";

type Symptom = {
  label: string;
  question: string;
  recommendation: SignalKey[];
  ratings: Record<SignalKey, { rating: SignalRating; reason: string }>;
};

type Signal = {
  label: string;
  description: string;
};

const signals: Record<SignalKey, Signal> = {
  logs: {
    label: "Structured logs",
    description: "Discrete records for jobs, requests, retries, and decisions.",
  },
  metrics: {
    label: "Metrics over time",
    description:
      "Numerical counters and gauges that reveal rate, latency, and backlog.",
  },
  traces: {
    label: "Request traces",
    description:
      "A path through services, handlers, database calls, and queues.",
  },
  errors: {
    label: "User-visible errors",
    description: "What failed from the user's point of view.",
  },
  benchmark: {
    label: "Benchmark data",
    description: "Controlled pressure that shows whether the behavior repeats.",
  },
  database: {
    label: "Database inspection",
    description:
      "Rows, indexes, query plans, and queue tables near the source of truth.",
  },
};

const symptoms: Record<SymptomKey, Symptom> = {
  stale: {
    label: "Event summaries are stale",
    question: "Which signals would let you explain why summaries are behind?",
    recommendation: ["metrics", "logs", "database"],
    ratings: {
      metrics: {
        rating: "answers",
        reason:
          "Queue depth, job age, and summary freshness show whether work is falling behind.",
      },
      logs: {
        rating: "answers",
        reason:
          "Job logs can show retries, skipped event types, and the last successful summary update.",
      },
      database: {
        rating: "answers",
        reason:
          "Inspecting summary rows and pending events confirms what data is stale.",
      },
      traces: {
        rating: "supports",
        reason:
          "Traces help if summaries are updated during requests, but they may miss background jobs.",
      },
      benchmark: {
        rating: "supports",
        reason:
          "A batch benchmark can reproduce the lag, but it does not explain a live incident first.",
      },
      errors: {
        rating: "noisy",
        reason:
          "Users may see old data without seeing an error, so errors alone can look healthy.",
      },
    },
  },
  missing: {
    label: "Users report missing events",
    question:
      "Which signals tell whether events were never accepted, dropped later, or hidden in reads?",
    recommendation: ["logs", "database", "traces"],
    ratings: {
      logs: {
        rating: "answers",
        reason:
          "Structured create-event logs show acceptance, validation failures, duplicate handling, and IDs.",
      },
      database: {
        rating: "answers",
        reason:
          "Checking event rows by user, entity, and time confirms whether the data exists.",
      },
      traces: {
        rating: "answers",
        reason:
          "Traces connect the browser request to validation, persistence, and response status.",
      },
      errors: {
        rating: "supports",
        reason:
          "User-visible errors help if the request failed, but missing events can happen without an error.",
      },
      metrics: {
        rating: "supports",
        reason:
          "Event accept and reject rates show a pattern, but not which specific event disappeared.",
      },
      benchmark: {
        rating: "noisy",
        reason:
          "A synthetic benchmark can miss rare client retries, race conditions, or filtering mistakes.",
      },
    },
  },
  slow: {
    label: "Dashboard loads slowly during arrival peak",
    question:
      "Which signals reveal whether the delay is network, API, database, or rendering work?",
    recommendation: ["traces", "metrics", "benchmark"],
    ratings: {
      traces: {
        rating: "answers",
        reason:
          "A trace separates API time, database time, cache waits, and downstream calls.",
      },
      metrics: {
        rating: "answers",
        reason:
          "p95 latency, request rate, error rate, CPU, and database time show when the slowdown starts.",
      },
      benchmark: {
        rating: "answers",
        reason:
          "A repeatable arrival-peak workload can confirm whether the dashboard degrades under load.",
      },
      database: {
        rating: "supports",
        reason:
          "Query plans and slow queries help if the trace points toward database work.",
      },
      logs: {
        rating: "supports",
        reason:
          "Logs can reveal cache misses or fallback paths, but line-by-line logs are often too noisy.",
      },
      errors: {
        rating: "noisy",
        reason:
          "A slow dashboard can still return 200 responses, so error reports may stay quiet.",
      },
    },
  },
};

const ratingLabels: Record<SignalRating, string> = {
  answers: "Answers the question",
  supports: "Useful context",
  noisy: "Noisy by itself",
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-observability-demo]",
)) {
  initializeObservabilityDemo(root);
}

function initializeObservabilityDemo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(
    "[data-observability-demo-form]",
  );
  const symptomSelect = root.querySelector<HTMLSelectElement>(
    "[data-observability-demo-symptom]",
  );
  const signalInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-observability-demo-signal]"),
  );
  const verdict = root.querySelector<HTMLElement>(
    "[data-observability-demo-verdict]",
  );
  const question = root.querySelector<HTMLElement>(
    "[data-observability-demo-question]",
  );
  const results = root.querySelector<HTMLElement>(
    "[data-observability-demo-results]",
  );
  const recommendation = root.querySelector<HTMLElement>(
    "[data-observability-demo-recommendation]",
  );

  if (
    !form ||
    !symptomSelect ||
    !verdict ||
    !question ||
    !results ||
    !recommendation
  ) {
    return;
  }

  const render = () => {
    const symptom =
      symptoms[symptomSelect.value as SymptomKey] ?? symptoms.stale;
    const selected = getSelectedSignals(signalInputs);
    const selectedRatings = selected.map((signalKey) => ({
      signalKey,
      ...symptom.ratings[signalKey],
    }));
    const answerCount = selectedRatings.filter(
      ({ rating }) => rating === "answers",
    ).length;
    const noisyCount = selectedRatings.filter(
      ({ rating }) => rating === "noisy",
    ).length;

    question.textContent = symptom.question;
    verdict.textContent =
      selected.length === 0
        ? "Pick evidence signals"
        : `${answerCount} answer${answerCount === 1 ? "" : "s"}, ${noisyCount} noisy`;
    results.innerHTML =
      selectedRatings.length === 0
        ? `<p class="observability-demo-empty">Select signals to see what each one can prove.</p>`
        : selectedRatings
            .map(({ signalKey, rating, reason }) =>
              renderSignalResult(signalKey, rating, reason),
            )
            .join("");
    recommendation.innerHTML = symptom.recommendation
      .map((signalKey) => renderRecommendedSignal(signalKey, symptom))
      .join("");
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", render);
  render();
}

function getSelectedSignals(inputs: HTMLInputElement[]) {
  return inputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter(isSignalKey);
}

function isSignalKey(value: string): value is SignalKey {
  return value in signals;
}

function renderSignalResult(
  signalKey: SignalKey,
  rating: SignalRating,
  reason: string,
) {
  const signal = signals[signalKey];

  return `<article class="observability-demo-result is-${rating}">
    <div>
      <strong>${escapeObservabilityHtml(signal.label)}</strong>
      <span>${ratingLabels[rating]}</span>
    </div>
    <p>${escapeObservabilityHtml(reason)}</p>
  </article>`;
}

function renderRecommendedSignal(signalKey: SignalKey, symptom: Symptom) {
  const signal = signals[signalKey];
  const rating = symptom.ratings[signalKey];

  return `<li>
    <strong>${escapeObservabilityHtml(signal.label)}</strong>
    <span>${escapeObservabilityHtml(signal.description)}</span>
    <small>${escapeObservabilityHtml(rating.reason)}</small>
  </li>`;
}

function escapeObservabilityHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
