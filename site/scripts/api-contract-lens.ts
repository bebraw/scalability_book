type ContractStyle = "resource" | "hypermedia" | "graphql" | "rpc";

type ContractVariant = {
  client: string[];
  code: string;
  delta: string;
  result: string;
  server: string[];
  trace: [string, string, string, string];
};

type ContractModel = {
  boundary: string;
  cache: string;
  caution: string;
  cautionTitle: string;
  discovery: string;
  label: string;
  pressure: string;
  runLabel: string;
  shape: string;
  summary: string;
  title: string;
  variants: {
    base: ContractVariant;
    related: ContractVariant;
  };
  wireLabel: string;
};

const contractModels: Record<ContractStyle, ContractModel> = {
  resource: {
    boundary: "address + representation",
    cache: "resource URL",
    caution:
      "HTTP methods and JSON resources are useful constraints, but clients still rely on documented routes and transition rules when responses do not provide controls.",
    cautionTitle: "HTTP-shaped with full REST",
    discovery: "documentation",
    label: "Resource HTTP",
    pressure: "routes and representations",
    runLabel: "Run PATCH request",
    shape: "resource mutation",
    summary:
      "The client targets a known work-item resource and uses HTTP semantics to request a state change. Stable addresses and representations become the coordination surface.",
    title: "Coordinate around resources",
    variants: {
      base: {
        client: [
          "work-item URL template",
          "PATCH and status semantics",
          "state and action field names",
        ],
        code: `PATCH /work-items/42
Content-Type: application/json

{ "state": "active" }

HTTP 200
{
  "id": "42",
  "state": "active",
  "title": "API contract lens",
  "workspace": { "id": "ws-7", "name": "Course" },
  "allowedTransitions": ["pause", "complete"]
}`,
        delta: "No extra field requested yet.",
        result: "200 OK · item 42 is active",
        server: [
          "resource representation",
          "HTTP status and cache metadata",
          "identifiers for related resources",
        ],
        trace: [
          "Construct PATCH /work-items/42 from a route documented ahead of time.",
          "Match the route, parse JSON, and apply PATCH semantics.",
          "Check that item 42 may move from planned to active.",
          "Return 200 with the updated resource and allowed transitions.",
        ],
      },
      related: {
        client: [
          "work-item and user URL templates",
          "PATCH and status semantics",
          "how assigneeId maps to another request",
        ],
        code: `PATCH /work-items/42
{ "state": "active" }

HTTP 200
{ ..., "assigneeId": "user-9" }

GET /users/user-9

HTTP 200
{ "id": "user-9", "name": "Ada" }`,
        delta:
          "Follow a known relation or extend the representation; either choice coordinates client and server.",
        result: "2 responses · item active + Ada",
        server: [
          "work-item representation",
          "user representation",
          "relationship identifier",
        ],
        trace: [
          "Construct PATCH /work-items/42 and request the known user route.",
          "Validate two resource requests and their representations.",
          "Start item 42, then resolve assignee user-9.",
          "Combine the work-item response with Ada from a second response.",
        ],
      },
    },
    wireLabel: "HTTP exchange",
  },
  hypermedia: {
    boundary: "link relations + media type",
    cache: "linked representations",
    caution:
      "Links remove route knowledge only when clients understand stable relation semantics and actually choose transitions from the received representation.",
    cautionTitle: "links with automatic decoupling",
    discovery: "response controls",
    label: "REST + HATEOAS",
    pressure: "relation vocabulary",
    runLabel: "Follow start control",
    shape: "follow transition",
    summary:
      "The client begins from a known resource and follows controls supplied by the server. Available actions can change with resource state without teaching the client new route templates.",
    title: "Discover the next transition",
    variants: {
      base: {
        client: [
          "entry resource",
          "media type and link relations",
          "how to render known controls",
        ],
        code: `GET /work-items/42

HTTP 200
{
  "id": "42",
  "state": "planned",
  "_links": {
    "start": { "href": "/work-items/42/start" }
  }
}

POST {{links.start.href}}

HTTP 200
{ ..., "_links": { "pause": {...}, "complete": {...} } }`,
        delta: "No extra relation requested yet.",
        result: "200 OK · new controls: pause, complete",
        server: [
          "current representation",
          "available transition links",
          "relation semantics",
        ],
        trace: [
          "Read the start control from the representation instead of constructing a URL.",
          "Follow POST /work-items/42/start using the known start relation.",
          "Check that item 42 may move from planned to active.",
          "Return the active item with its newly available controls.",
        ],
      },
      related: {
        client: [
          "entry resource",
          "media type and assignee relation",
          "how to render known controls",
        ],
        code: `GET /work-items/42

HTTP 200
{
  "state": "planned",
  "_links": {
    "start": { "href": "/work-items/42/start" },
    "assignee": { "href": "/people/user-9" }
  }
}

GET {{links.assignee.href}}

HTTP 200
{ "name": "Ada" }`,
        delta:
          "Follow the advertised assignee relation; the client does not construct its URL.",
        result: "2 linked responses · item active + Ada",
        server: [
          "current representation",
          "transition and assignee links",
          "stable relation semantics",
        ],
        trace: [
          "Read the start and assignee controls from the current representation.",
          "Follow advertised URLs while interpreting stable relation names.",
          "Start item 42 and resolve the linked assignee representation.",
          "Render Ada without embedding either route template in the client.",
        ],
      },
    },
    wireLabel: "hypermedia exchange",
  },
  graphql: {
    boundary: "typed schema + selection",
    cache: "normalized result or operation",
    caution:
      "One endpoint does not mean one cheap operation. Field authorization, resolver fan-out, depth, and query cost remain server-side architectural concerns.",
    cautionTitle: "field flexibility with free execution",
    discovery: "schema introspection",
    label: "GraphQL",
    pressure: "schema and resolver graph",
    runLabel: "Run StartWork mutation",
    shape: "typed mutation",
    summary:
      "The client names the operation and selects its result fields from a typed graph. The response follows that selection rather than a fixed endpoint representation.",
    title: "Coordinate through a schema",
    variants: {
      base: {
        client: [
          "GraphQL endpoint",
          "schema fields and mutation",
          "the exact selection it needs",
        ],
        code: `mutation StartWork($id: ID!) {
  startWorkItem(id: $id) {
    item {
      id
      state
      title
      workspace { name }
      availableActions
    }
  }
}

variables { "id": "42" }`,
        delta: "No extra field selected yet.",
        result: "200 OK · selected fields returned",
        server: [
          "typed graph schema",
          "mutation and field resolvers",
          "validation and error contract",
        ],
        trace: [
          "Send StartWork with id 42 and an explicit result-field selection.",
          "Validate the document, variables, types, and selected fields.",
          "Run the mutation and resolve the requested work-item fields.",
          "Return only id, state, title, workspace, and availableActions.",
        ],
      },
      related: {
        client: [
          "GraphQL endpoint",
          "schema fields and mutation",
          "assignee relation in its selection",
        ],
        code: `mutation StartWork($id: ID!) {
  startWorkItem(id: $id) {
    item {
      id
      state
      title
      workspace { name }
      assignee { name }
      availableActions
    }
  }
}`,
        delta:
          "Add assignee { name } to the selection; resolver cost and authorization move with it.",
        result: "200 OK · selection now includes Ada",
        server: [
          "typed graph schema",
          "work-item and assignee resolvers",
          "field-level policy and cost limits",
        ],
        trace: [
          "Add assignee { name } to the StartWork result selection.",
          "Validate that the schema exposes the field and the caller may read it.",
          "Run the mutation, then invoke the assignee resolver.",
          "Return the original fields plus assignee name Ada in one result shape.",
        ],
      },
    },
    wireLabel: "GraphQL document",
  },
  rpc: {
    boundary: "service method + messages",
    cache: "explicit application policy",
    caution:
      "A remote call still crosses a fallible network. Deadlines, retries, partial failure, and idempotency cannot be hidden by a function-like client stub.",
    cautionTitle: "remote calls with local calls",
    discovery: "service definition",
    label: "RPC",
    pressure: "methods and message evolution",
    runLabel: "Call StartWork RPC",
    shape: "named command",
    summary:
      "The client invokes a domain-oriented method with defined request and response messages. Generated stubs can make the contract convenient and strongly typed.",
    title: "Coordinate around capabilities",
    variants: {
      base: {
        client: [
          "generated service client",
          "StartWork method",
          "request and response message fields",
        ],
        code: `WorkItemService.StartWork(
  StartWorkRequest {
    work_item_id: "42"
  }
)

=> WorkItemView {
  id: "42"
  state: ACTIVE
  title: "API contract lens"
  workspace_name: "Course"
  available_actions: [PAUSE, COMPLETE]
}`,
        delta: "No extra response field requested yet.",
        result: "OK · WorkItemView(state: ACTIVE)",
        server: [
          "service and method definition",
          "typed message schema",
          "RPC status and deadline behavior",
        ],
        trace: [
          "Call the generated StartWork method with work_item_id 42.",
          "Decode and validate the typed StartWorkRequest message.",
          "Invoke the StartWork handler and enforce the state transition.",
          "Return an OK status with a typed WorkItemView message.",
        ],
      },
      related: {
        client: [
          "generated service client",
          "StartWork method",
          "response version containing assignee_name",
        ],
        code: `WorkItemService.StartWork(
  StartWorkRequest {
    work_item_id: "42"
    view: WITH_ASSIGNEE
  }
)

=> WorkItemView {
  id: "42"
  state: ACTIVE
  assignee_name: "Ada"
  ...
}`,
        delta:
          "Evolve the request or response message, or compose another service call.",
        result: "OK · WorkItemView includes Ada",
        server: [
          "evolved method contract",
          "compatible message field",
          "composition with identity data",
        ],
        trace: [
          "Call StartWork with the WITH_ASSIGNEE view option.",
          "Decode a compatible request containing the evolved view field.",
          "Start item 42 and compose its result with identity data.",
          "Return a typed WorkItemView containing assignee_name Ada.",
        ],
      },
    },
    wireLabel: "service invocation",
  },
};

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-api-contract-lens]",
)) {
  const form = root.querySelector<HTMLFormElement>("[data-api-contract-form]");
  const code = root.querySelector<HTMLElement>("[data-api-contract-code]");
  const change = root.querySelector<HTMLInputElement>(
    "[data-api-contract-change]",
  );
  const run = root.querySelector<HTMLButtonElement>("[data-api-contract-run]");
  const status = root.querySelector<HTMLElement>("[data-api-contract-status]");
  const trace = root.querySelector<HTMLOListElement>(
    "[data-api-contract-trace]",
  );
  const receipt = root.querySelector<HTMLElement>(
    "[data-api-contract-receipt]",
  );
  const result = root.querySelector<HTMLElement>("[data-api-contract-result]");
  const clientList = root.querySelector<HTMLElement>(
    "[data-api-contract-client]",
  );
  const serverList = root.querySelector<HTMLElement>(
    "[data-api-contract-server]",
  );
  let runToken = 0;

  if (
    !form ||
    !code ||
    !change ||
    !run ||
    !status ||
    !trace ||
    !receipt ||
    !result ||
    !clientList ||
    !serverList
  ) {
    continue;
  }

  const getStyle = (): ContractStyle =>
    form.querySelector<HTMLInputElement>("[data-api-contract-option]:checked")
      ?.value as ContractStyle;

  const setText = (selector: string, value: string): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  };

  const renderList = (element: HTMLElement, items: string[]): void => {
    element.replaceChildren(
      ...items.map((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      }),
    );
  };

  const renderTrace = (items: ContractVariant["trace"]): void => {
    const labels = [
      "Client prepares",
      "Boundary checks",
      "Domain acts",
      "Result returns",
    ];
    trace.replaceChildren(
      ...items.map((item, index) => {
        const li = document.createElement("li");
        li.dataset.apiContractTraceStep = String(index);

        const marker = document.createElement("span");
        marker.textContent = String(index + 1).padStart(2, "0");

        const copy = document.createElement("div");
        const label = document.createElement("strong");
        label.textContent = labels[index] ?? "Trace step";
        const description = document.createElement("p");
        description.textContent = item;
        copy.append(label, description);
        li.append(marker, copy);
        return li;
      }),
    );
  };

  const resetFlow = (): void => {
    runToken += 1;
    root.dataset.apiContractPhase = "idle";
    for (const node of root.querySelectorAll<HTMLElement>(
      "[data-api-contract-node]",
    )) {
      node.classList.remove("is-active", "is-complete");
    }
    for (const step of trace.querySelectorAll<HTMLElement>(
      "[data-api-contract-trace-step]",
    )) {
      step.classList.remove("is-active", "is-complete");
    }
    receipt.classList.remove("is-complete");
    result.textContent = "Not sent yet";
    run.disabled = false;
    status.textContent =
      "Run the exchange to see what each boundary actually does.";
  };

  const render = (): void => {
    resetFlow();
    const style = getStyle();
    const model = contractModels[style];
    const variant = change.checked
      ? model.variants.related
      : model.variants.base;
    root.dataset.apiContractStyle = style;
    root.dataset.apiContractVariant = change.checked ? "related" : "base";
    code.textContent = variant.code;
    renderTrace(variant.trace);
    renderList(clientList, variant.client);
    renderList(serverList, variant.server);
    setText("[data-api-contract-style]", model.label);
    setText("[data-api-contract-boundary]", model.boundary);
    setText("[data-api-contract-wire-label]", model.wireLabel);
    setText("[data-api-contract-run-label]", model.runLabel);
    setText("[data-api-contract-delta]", variant.delta);
    setText('[data-api-contract-fact="shape"]', model.shape);
    setText('[data-api-contract-fact="discovery"]', model.discovery);
    setText('[data-api-contract-fact="cache"]', model.cache);
    setText('[data-api-contract-fact="pressure"]', model.pressure);
    setText("[data-api-contract-title]", model.title);
    setText("[data-api-contract-summary]", model.summary);
    setText("[data-api-contract-caution-title]", model.cautionTitle);
    setText("[data-api-contract-caution]", model.caution);
  };

  const wait = (duration: number): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, duration));

  const runFlow = async (): Promise<void> => {
    resetFlow();
    const token = runToken;
    const nodes = ["client", "contract", "domain", "result"];
    const style = getStyle();
    const model = contractModels[style];
    const variant = change.checked
      ? model.variants.related
      : model.variants.base;
    root.dataset.apiContractPhase = "running";
    run.disabled = true;

    for (const [index, name] of nodes.entries()) {
      if (token !== runToken) return;
      const node = root.querySelector<HTMLElement>(
        `[data-api-contract-node="${name}"]`,
      );
      const traceStep = trace.querySelector<HTMLElement>(
        `[data-api-contract-trace-step="${index}"]`,
      );
      node?.classList.add("is-active");
      traceStep?.classList.add("is-active");
      status.textContent = `Step ${index + 1} of 4 — ${variant.trace[index]}`;
      await wait(520);
      if (token !== runToken) return;
      node?.classList.remove("is-active");
      node?.classList.add("is-complete");
      traceStep?.classList.remove("is-active");
      traceStep?.classList.add("is-complete");
    }

    root.dataset.apiContractPhase = "complete";
    run.disabled = false;
    receipt.classList.add("is-complete");
    result.textContent = variant.result;
    status.textContent = change.checked
      ? `Complete — ${variant.result}. The assignee-name change is visible in the trace.`
      : `Complete — ${variant.result}. Compare the four steps with another contract style.`;
  };

  form.addEventListener("change", render);
  run.addEventListener("click", () => void runFlow());
  render();
}
