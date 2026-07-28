type TraceScenarioKey = "healthy" | "slow" | "retry";

type SimulatedSpan = {
  id: string;
  parentId: string | null;
  name: string;
  start: number;
  duration: number;
  status: "OK" | "Unset" | "Error";
  source: "Automatic" | "Manual";
  attributes: Record<string, string>;
  note: string;
};

type TraceScenario = {
  traceId: string;
  duration: number;
  verdict: string;
  selectedSpanId: string;
  spans: SimulatedSpan[];
};

const traceScenarios: Record<TraceScenarioKey, TraceScenario> = {
  healthy: {
    traceId: "7c4d8a116f5447218d61bb3bc1a73ea2",
    duration: 48,
    verdict: "Request path looks healthy",
    selectedSpanId: "healthy-store",
    spans: [
      httpSpan("healthy-http", 48),
      validationSpan("healthy-validate", "healthy-http", 4),
      {
        id: "healthy-pool",
        parentId: "healthy-http",
        name: "acquire connection",
        start: 9,
        duration: 5,
        status: "Unset",
        source: "Manual",
        attributes: { "db.pool.name": "events", "db.pool.wait_ms": "5" },
        note: "The connection pool adds little waiting time in this trace.",
      },
      storeSpan("healthy-store", "healthy-http", 15, 24, false),
      publishSpan("healthy-publish", "healthy-http", 41, 5),
    ],
  },
  slow: {
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    duration: 286,
    verdict: "Slow storage path found",
    selectedSpanId: "slow-store",
    spans: [
      httpSpan("slow-http", 286),
      validationSpan("slow-validate", "slow-http", 4),
      {
        id: "slow-pool",
        parentId: "slow-http",
        name: "acquire connection",
        start: 14,
        duration: 67,
        status: "Unset",
        source: "Manual",
        attributes: { "db.pool.name": "events", "db.pool.wait_ms": "67" },
        note: "This request waited for a connection, which suggests pressure on the storage pool.",
      },
      storeSpan("slow-store", "slow-http", 84, 184, true),
      publishSpan("slow-publish", "slow-http", 274, 8),
    ],
  },
  retry: {
    traceId: "1fd09b0b23af498c8d9db8e487a6307d",
    duration: 171,
    verdict: "Retry hides a transient failure",
    selectedSpanId: "retry-first-store",
    spans: [
      httpSpan("retry-http", 171),
      validationSpan("retry-validate", "retry-http", 4),
      {
        ...storeSpan("retry-first-store", "retry-http", 13, 82, false),
        name: "store event · attempt 1",
        status: "Error",
        attributes: {
          "db.system.name": "postgresql",
          "db.operation.name": "INSERT",
          "error.type": "connection_timeout",
          "retry.attempt": "1",
        },
        note: "The request eventually succeeds, but this span preserves the failed first attempt.",
      },
      {
        ...storeSpan("retry-second-store", "retry-http", 108, 48, false),
        name: "store event · attempt 2",
        status: "OK",
        attributes: {
          "db.system.name": "postgresql",
          "db.operation.name": "INSERT",
          "retry.attempt": "2",
        },
      },
      publishSpan("retry-publish", "retry-http", 160, 7),
    ],
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-otel-trace-demo]",
)) {
  initializeOtelTraceDemo(root);
}

function initializeOtelTraceDemo(root: HTMLElement) {
  const select = root.querySelector<HTMLSelectElement>(
    "[data-otel-demo-scenario]",
  );

  if (!select) {
    return;
  }

  let scenario = traceScenarios.slow;
  let selectedSpanId = scenario.selectedSpanId;

  const render = () => {
    renderTrace(root, scenario, selectedSpanId);
  };

  select.addEventListener("change", () => {
    scenario = traceScenarios[readTraceScenario(select.value)];
    selectedSpanId = scenario.selectedSpanId;
    render();
  });

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "[data-otel-demo-span]",
    );
    if (!button) {
      return;
    }

    selectedSpanId = button.dataset.otelDemoSpan ?? scenario.selectedSpanId;
    render();
  });

  render();
}

function renderTrace(
  root: HTMLElement,
  scenario: TraceScenario,
  selectedSpanId: string,
) {
  setText(root, "[data-otel-demo-verdict]", scenario.verdict);
  setText(
    root,
    "[data-otel-demo-trace-name]",
    `POST /events · ${scenario.duration} ms`,
  );
  setText(root, "[data-otel-demo-trace-id]", scenario.traceId);
  setText(
    root,
    "[data-otel-demo-scale-middle]",
    `${Math.round(scenario.duration / 2)} ms`,
  );
  setText(root, "[data-otel-demo-scale-end]", `${scenario.duration} ms`);

  const timeline = root.querySelector<HTMLElement>("[data-otel-demo-timeline]");
  if (timeline) {
    timeline.innerHTML = scenario.spans
      .map((span) => renderSpanRow(span, scenario.duration, selectedSpanId))
      .join("");
  }

  const selectedSpan =
    scenario.spans.find(({ id }) => id === selectedSpanId) ?? scenario.spans[0];
  if (selectedSpan) {
    renderSpanInspector(root, scenario, selectedSpan);
  }
}

function renderSpanRow(
  span: SimulatedSpan,
  traceDuration: number,
  selectedSpanId: string,
) {
  const left = (span.start / traceDuration) * 100;
  const width = Math.max(2.5, (span.duration / traceDuration) * 100);
  const level = span.parentId ? 1 : 0;

  return `<button
    type="button"
    class="otel-demo-span-row${span.id === selectedSpanId ? " is-selected" : ""}"
    data-otel-demo-span="${escapeOtelHtml(span.id)}"
    aria-pressed="${span.id === selectedSpanId}"
  >
    <span class="otel-demo-span-label" style="--otel-span-level: ${level}">
      <b>${escapeOtelHtml(span.name)}</b>
      <small>${span.source}</small>
    </span>
    <span class="otel-demo-span-track">
      <i class="is-${span.status.toLowerCase()}" style="--otel-span-left: ${left}%; --otel-span-width: ${width}%"></i>
    </span>
    <strong>${span.duration} ms</strong>
  </button>`;
}

function renderSpanInspector(
  root: HTMLElement,
  scenario: TraceScenario,
  span: SimulatedSpan,
) {
  setText(root, "[data-otel-demo-span-name]", span.name);
  setText(root, "[data-otel-demo-span-duration]", `${span.duration} ms`);
  setText(root, "[data-otel-demo-span-status]", span.status);
  setText(root, "[data-otel-demo-span-source]", span.source);
  setText(root, "[data-otel-demo-span-note]", span.note);

  const attributes = root.querySelector<HTMLElement>(
    "[data-otel-demo-attributes]",
  );
  if (attributes) {
    attributes.innerHTML = Object.entries(span.attributes)
      .map(
        ([key, value]) =>
          `<div><dt>${escapeOtelHtml(key)}</dt><dd>${escapeOtelHtml(value)}</dd></div>`,
      )
      .join("");
  }

  setText(
    root,
    "[data-otel-demo-span-record]",
    JSON.stringify(buildConceptualSpanRecord(scenario, span), null, 2),
  );
}

function buildConceptualSpanRecord(
  scenario: TraceScenario,
  span: SimulatedSpan,
) {
  return {
    resource: { "service.name": "event-api" },
    scope: "course.event-tracker",
    traceId: scenario.traceId,
    spanId: getSimulatedSpanId(span.id),
    parentSpanId: span.parentId ? getSimulatedSpanId(span.parentId) : null,
    name: span.name,
    startOffsetMs: span.start,
    durationMs: span.duration,
    status: span.status,
    attributes: span.attributes,
  };
}

function getSimulatedSpanId(value: string) {
  const forward = hashSpanId(value);
  const backward = hashSpanId([...value].reverse().join(""));

  return `${forward}${backward}`;
}

function hashSpanId(value: string) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function httpSpan(id: string, duration: number): SimulatedSpan {
  return {
    id,
    parentId: null,
    name: "POST /events",
    start: 0,
    duration,
    status: "Unset",
    source: "Automatic",
    attributes: {
      "http.request.method": "POST",
      "http.route": "/events",
      "http.response.status_code": "201",
    },
    note: "Automatic HTTP instrumentation creates the root server span and captures the end-to-end request duration.",
  };
}

function validationSpan(
  id: string,
  parentId: string,
  duration: number,
): SimulatedSpan {
  return {
    id,
    parentId,
    name: "validate event",
    start: 4,
    duration,
    status: "OK",
    source: "Manual",
    attributes: { "app.event.type": "check_in", "validation.result": "valid" },
    note: "A custom span records a domain operation that generic HTTP instrumentation cannot name for us.",
  };
}

function storeSpan(
  id: string,
  parentId: string,
  start: number,
  duration: number,
  slow: boolean,
): SimulatedSpan {
  return {
    id,
    parentId,
    name: "store event",
    start,
    duration,
    status: "Unset",
    source: "Manual",
    attributes: {
      "db.system.name": "postgresql",
      "db.operation.name": "INSERT",
      "db.collection.name": "events",
      "app.storage.slow_path": String(slow),
    },
    note: slow
      ? "This child span explains most of the end-to-end latency. The trace narrows the investigation; it does not prove the underlying cause."
      : "The storage operation completes within the expected range for this simulated request.",
  };
}

function publishSpan(
  id: string,
  parentId: string,
  start: number,
  duration: number,
): SimulatedSpan {
  return {
    id,
    parentId,
    name: "publish dashboard update",
    start,
    duration,
    status: "OK",
    source: "Manual",
    attributes: {
      "messaging.operation.name": "publish",
      "messaging.destination.name": "dashboard",
    },
    note: "The final child span represents notifying dashboard clients after persistence succeeds.",
  };
}

function readTraceScenario(value: string): TraceScenarioKey {
  return value === "healthy" || value === "retry" ? value : "slow";
}

function setText(root: HTMLElement, selector: string, value: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = value;
  }
}

function escapeOtelHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
