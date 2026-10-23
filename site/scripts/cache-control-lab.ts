type CacheProfile = "asset" | "summary" | "private" | "sensitive";
type CacheNode = "browser" | "shared" | "origin";
type CacheStepKind = "hit" | "pass" | "request" | "validate" | "background";

type CacheStep = {
  detail: string;
  kind: CacheStepKind;
  label: string;
  node: CacheNode;
};

type CacheProfileModel = {
  bodySize: string;
  defaultPercent: number;
  etag?: string;
  freshFor: string;
  headers: string;
  label: string;
  maxAge: number;
  privateOnly: boolean;
  rule: string;
  ruleTitle: string;
  summary: string;
  swr: number;
  timeline: number;
  timelineLabel: string;
  title: string;
  unit: "days" | "seconds";
};

type CacheDecision = {
  browserState: string;
  bytes: string;
  code: string;
  outcome: string;
  source: string;
  sharedState: string;
  steps: CacheStep[];
  version: string;
  wait: string;
  originState: string;
};

const cacheProfiles: Record<CacheProfile, CacheProfileModel> = {
  asset: {
    bodySize: "86 KB",
    defaultPercent: 25,
    freshFor: "365 days",
    headers: `GET /assets/app.9f3a.js

HTTP 200 OK
Cache-Control: public, max-age=31536000, immutable
Content-Type: text/javascript`,
    label: "Versioned asset",
    maxAge: 365,
    privateOnly: false,
    rule: "Changing the bytes requires a new fingerprinted URL. The old URL can therefore remain stable throughout its freshness lifetime.",
    ruleTitle: "immutable means the URL carries the version",
    summary:
      "A fingerprinted URL identifies one representation. A fresh cache can reuse it without contacting the origin, including during an ordinary reload.",
    swr: 0,
    timeline: 400,
    timelineLabel: "400 days",
    title: "Reuse the fingerprinted response",
    unit: "days",
  },
  summary: {
    bodySize: "24 KB",
    defaultPercent: 19,
    etag: '"summary-v7"',
    freshFor: "browser 30 s · shared 120 s",
    headers: `GET /activity/summary

HTTP 200 OK
Cache-Control: public, max-age=30,
  s-maxage=120, stale-while-revalidate=60
ETag: "summary-v7"
Vary: Accept-Encoding`,
    label: "Public summary",
    maxAge: 120,
    privateOnly: false,
    rule: "Shared caches use s-maxage. During the following stale window they may answer immediately and validate in the background.",
    ruleTitle: "freshness and acceptable staleness are separate",
    summary:
      "A public aggregate can trade bounded staleness for fewer origin requests and lower response latency. The policy makes that tolerance explicit.",
    swr: 60,
    timeline: 240,
    timelineLabel: "240 seconds",
    title: "Bound the age of a shared answer",
    unit: "seconds",
  },
  private: {
    bodySize: "18 KB",
    defaultPercent: 34,
    etag: '"dashboard-u9-v4"',
    freshFor: "validate before every reuse",
    headers: `GET /dashboard

HTTP 200 OK
Cache-Control: private, no-cache
ETag: "dashboard-u9-v4"
Vary: Cookie`,
    label: "Private dashboard",
    maxAge: 0,
    privateOnly: true,
    rule: "no-cache permits private storage but requires validation before reuse. private prevents a shared cache from storing the personalized response.",
    ruleTitle: "no-cache does not mean no storage",
    summary:
      "The browser may retain the personalized body, but it has to ask whether that stored representation is still current before showing it again.",
    swr: 0,
    timeline: 60,
    timelineLabel: "60 seconds",
    title: "Store privately, validate every reuse",
    unit: "seconds",
  },
  sensitive: {
    bodySize: "9 KB",
    defaultPercent: 34,
    freshFor: "not stored",
    headers: `GET /account/export-token

HTTP 200 OK
Cache-Control: no-store
Content-Type: application/json`,
    label: "Sensitive response",
    maxAge: 0,
    privateOnly: true,
    rule: "no-store prevents normal cache reuse. It does not erase data already stored before the directive appeared and is not a substitute for transport or application security.",
    ruleTitle: "no-store is the storage prohibition",
    summary:
      "The response is fetched from the origin for each request because the policy does not permit a reusable stored response.",
    swr: 0,
    timeline: 60,
    timelineLabel: "60 seconds",
    title: "Return to the origin every time",
    unit: "seconds",
  },
};

const formatAge = (value: number, unit: "days" | "seconds"): string =>
  `${value} ${unit === "days" ? (value === 1 ? "day" : "days") : value === 1 ? "second" : "seconds"}`;

function decideCache(
  profile: CacheProfile,
  model: CacheProfileModel,
  age: number,
  changed: boolean,
): CacheDecision {
  if (profile === "sensitive") {
    return {
      browserState: "no stored response",
      bytes: model.bodySize,
      code: "browser → origin 200",
      originState: "200 + full body",
      outcome: "Origin fetch",
      sharedState: "storage prohibited",
      source: "origin",
      steps: [
        {
          detail: "no-store left no reusable response",
          kind: "pass",
          label: "Browser has no cache entry",
          node: "browser",
        },
        {
          detail: "shared storage is also prohibited",
          kind: "pass",
          label: "Pass shared cache",
          node: "shared",
        },
        {
          detail: "generate a complete response",
          kind: "request",
          label: "Request origin",
          node: "origin",
        },
      ],
      version: "current origin body",
      wait: "yes · full request",
    };
  }

  if (
    (profile === "asset" && age < model.maxAge) ||
    (profile === "summary" && age < 30)
  ) {
    return {
      browserState:
        profile === "asset" ? "fresh immutable hit" : "fresh private entry",
      bytes: "0 KB",
      code: "browser cache → response",
      originState: "not contacted",
      outcome: "Fresh cache hit",
      sharedState: "not needed",
      source: "browser cache",
      steps: [
        {
          detail: "age is within max-age",
          kind: "hit",
          label:
            profile === "asset"
              ? "Find fresh stored asset"
              : "Find fresh stored summary",
          node: "browser",
        },
        {
          detail:
            profile === "asset"
              ? "immutable suppresses ordinary validation"
              : "browser max-age has not expired",
          kind: "hit",
          label: "Reuse representation",
          node: "browser",
        },
      ],
      version: profile === "asset" ? "stored fingerprint" : "stored summary-v7",
      wait: "no",
    };
  }

  if (profile === "summary" && age < model.maxAge) {
    return {
      browserState: "private entry stale",
      bytes: "0 KB",
      code: "shared cache → response",
      originState: "not contacted",
      outcome: "Fresh shared hit",
      sharedState: "fresh by s-maxage",
      source: "shared cache",
      steps: [
        {
          detail: "browser forwards after its shorter max-age",
          kind: "pass",
          label: "Check browser freshness",
          node: "browser",
        },
        {
          detail: "Age remains within s-maxage",
          kind: "hit",
          label: "Reuse shared response",
          node: "shared",
        },
      ],
      version: "stored summary-v7",
      wait: "no origin wait",
    };
  }

  if (profile === "summary" && age <= model.maxAge + model.swr) {
    return {
      browserState: "private entry stale",
      bytes: changed ? model.bodySize : "0 KB",
      code: "stale response + background validation",
      originState: changed ? "background 200 + new body" : "background 304",
      outcome: "Serve stale, revalidate",
      sharedState: "inside SWR window",
      source: "shared cache",
      steps: [
        {
          detail: "local freshness has ended",
          kind: "pass",
          label: "Forward stale request",
          node: "browser",
        },
        {
          detail: "serve summary-v7 immediately",
          kind: "hit",
          label: "Use stale response",
          node: "shared",
        },
        {
          detail: `If-None-Match: ${model.etag}`,
          kind: "background",
          label: "Validate in background",
          node: "origin",
        },
      ],
      version: "stale summary-v7 now",
      wait: "no · validation is background",
    };
  }

  const hasValidator = Boolean(model.etag);
  const returnsNewBody = changed || !hasValidator;
  const source = model.privateOnly
    ? "browser cache + origin"
    : "shared cache + origin";
  return {
    browserState: model.privateOnly
      ? "stored, validation required"
      : "entry stale",
    bytes: returnsNewBody ? model.bodySize : "0 KB",
    code: hasValidator
      ? `conditional request → ${returnsNewBody ? "200" : "304"}`
      : "origin request → 200",
    originState: returnsNewBody ? "200 + current body" : "304 · no body",
    outcome: hasValidator
      ? `Revalidated with ${returnsNewBody ? "200" : "304"}`
      : "Origin fetch after expiry",
    sharedState: model.privateOnly
      ? "bypassed by private"
      : "stale · blocks for validation",
    source,
    steps: [
      {
        detail: model.privateOnly
          ? "no-cache requires validation"
          : "freshness window ended",
        kind: hasValidator ? "validate" : "request",
        label: hasValidator
          ? "Stored response needs validation"
          : "Stored response is stale",
        node: "browser",
      },
      {
        detail: model.privateOnly
          ? "private response cannot be reused here"
          : "forward conditional request",
        kind: "pass",
        label: model.privateOnly
          ? "Bypass shared cache"
          : "Shared entry is stale",
        node: "shared",
      },
      {
        detail: model.etag
          ? `compare If-None-Match: ${model.etag}`
          : "fetch current representation",
        kind: "request",
        label: returnsNewBody ? "Return 200" : "Return 304",
        node: "origin",
      },
    ],
    version: returnsNewBody ? "new origin body" : "stored body confirmed",
    wait: "yes · validation blocks",
  };
}

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-cache-control-lab]",
)) {
  const form = root.querySelector<HTMLFormElement>("[data-cache-control-form]");
  const ageInput = root.querySelector<HTMLInputElement>("[data-cache-age]");
  const changedInput = root.querySelector<HTMLInputElement>(
    "[data-cache-origin-change]",
  );
  const run = root.querySelector<HTMLButtonElement>("[data-cache-run]");
  const steps = root.querySelector<HTMLOListElement>("[data-cache-steps]");
  let runToken = 0;

  if (!form || !ageInput || !changedInput || !run || !steps) continue;

  const getProfile = (): CacheProfile =>
    form.querySelector<HTMLInputElement>("[data-cache-profile]:checked")
      ?.value as CacheProfile;

  const setText = (selector: string, value: string): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  };

  const currentAge = (model: CacheProfileModel): number =>
    Math.round((Number(ageInput.value) / 100) * model.timeline);

  const renderSteps = (decision: CacheDecision): void => {
    steps.replaceChildren(
      ...decision.steps.map((step, index) => {
        const li = document.createElement("li");
        li.dataset.cacheStep = step.node;
        li.dataset.kind = step.kind;
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = step.label;
        const detail = document.createElement("small");
        detail.textContent = step.detail;
        copy.append(title, detail);
        li.append(number, copy);
        return li;
      }),
    );
  };

  const resetTrace = (): void => {
    runToken += 1;
    root.dataset.cachePhase = "idle";
    run.disabled = false;
    for (const element of root.querySelectorAll(".is-active, .is-complete")) {
      element.classList.remove("is-active", "is-complete");
    }
  };

  const render = (profileChanged = false): void => {
    resetTrace();
    const profile = getProfile();
    const model = cacheProfiles[profile];
    if (profileChanged) ageInput.value = String(model.defaultPercent);
    const age = currentAge(model);
    const decision = decideCache(profile, model, age, changedInput.checked);
    root.dataset.cacheProfile = profile;
    root.dataset.cacheOutcome = decision.outcome;
    setText("[data-cache-profile-label]", model.label);
    setText("[data-cache-headers]", model.headers);
    setText("[data-cache-age-label]", formatAge(age, model.unit));
    setText("[data-cache-fresh-label]", `fresh: ${model.freshFor}`);
    setText("[data-cache-limit-label]", `timeline: ${model.timelineLabel}`);
    setText("[data-cache-browser-state]", decision.browserState);
    setText("[data-cache-shared-state]", decision.sharedState);
    setText("[data-cache-origin-state]", decision.originState);
    setText("[data-cache-decision-code]", decision.code);
    setText("[data-cache-outcome]", decision.outcome);
    setText("[data-cache-source]", decision.source);
    setText('[data-cache-fact="source"]', decision.source);
    setText('[data-cache-fact="wait"]', decision.wait);
    setText('[data-cache-fact="bytes"]', decision.bytes);
    setText('[data-cache-fact="version"]', decision.version);
    setText("[data-cache-title]", model.title);
    setText("[data-cache-summary]", model.summary);
    setText("[data-cache-rule-title]", model.ruleTitle);
    setText("[data-cache-rule]", model.rule);
    const fill = root.querySelector<HTMLElement>("[data-cache-clock-fill]");
    const marker = root.querySelector<HTMLElement>("[data-cache-clock-marker]");
    fill?.style.setProperty("--cache-clock-position", `${ageInput.value}%`);
    marker?.style.setProperty("--cache-clock-position", `${ageInput.value}%`);
    renderSteps(decision);
  };

  const wait = (duration: number): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

  const runTrace = async (): Promise<void> => {
    resetTrace();
    const token = runToken;
    root.dataset.cachePhase = "running";
    run.disabled = true;
    const traceSteps = [
      ...steps.querySelectorAll<HTMLElement>("[data-cache-step]"),
    ];
    for (const step of traceSteps) {
      if (token !== runToken) return;
      const nodeName = step.dataset.cacheStep;
      const node = root.querySelector<HTMLElement>(
        `[data-cache-node="${nodeName}"]`,
      );
      step.classList.add("is-active");
      node?.classList.add("is-active");
      await wait(260);
      if (token !== runToken) return;
      step.classList.remove("is-active");
      step.classList.add("is-complete");
      node?.classList.remove("is-active");
      node?.classList.add("is-complete");
    }
    root.dataset.cachePhase = "complete";
    run.disabled = false;
  };

  form.addEventListener("change", (event) => {
    render((event.target as HTMLElement).matches("[data-cache-profile]"));
  });
  ageInput.addEventListener("input", () => render());
  run.addEventListener("click", () => void runTrace());
  render(true);
}
