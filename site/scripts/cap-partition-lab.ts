{
  type CapPolicy = "quorum" | "local";
  type CapStatus = "pass" | "fail" | "warn" | "idle";
  type CapRegion = "helsinki" | "frankfurt" | "dublin";

  type CapLogEntry = {
    detail: string;
    label: string;
    status: CapStatus;
  };

  type CapNodeView = {
    event: string;
    item: string;
    network: string;
    reply: string;
    state: string;
  };

  const capLabs = document.querySelectorAll<HTMLElement>("[data-cap-lab]");

  for (const root of capLabs) initializeCapLab(root);

  function initializeCapLab(root: HTMLElement) {
    const form = query<HTMLFormElement>(root, "[data-cap-form]");
    const policy = query<HTMLSelectElement>(root, "[data-cap-policy]");
    const partition = query<HTMLButtonElement>(root, "[data-cap-partition]");
    const write = query<HTMLButtonElement>(root, "[data-cap-write]");
    const heal = query<HTMLButtonElement>(root, "[data-cap-heal]");
    const reset = query<HTMLButtonElement>(root, "[data-cap-reset]");
    const controls = { heal, partition, policy, write };

    policy.addEventListener("change", () => renderConnected(root, controls));
    partition.addEventListener("click", () =>
      renderPartitioned(root, controls),
    );
    write.addEventListener("click", () =>
      renderWriteOutcome(root, controls, readPolicy(policy.value)),
    );
    heal.addEventListener("click", () =>
      renderHealed(root, controls, readPolicy(policy.value)),
    );
    reset.addEventListener("click", () => {
      form.reset();
      renderConnected(root, controls);
    });

    renderConnected(root, controls);
  }

  function renderConnected(root: HTMLElement, controls: CapControls) {
    root.dataset.capPhase = "connected";
    root.dataset.capResult = "ready";
    controls.policy.disabled = false;
    controls.partition.disabled = false;
    controls.write.disabled = true;
    controls.heal.disabled = true;
    query<HTMLElement>(root, "[data-cap-network-label]").textContent =
      "healthy network";
    setSummary(
      root,
      "All regions can communicate",
      "Cut the network before testing the write policy.",
      "CAP has not constrained the request path yet",
      "With communication intact, the replicas can coordinate before they answer.",
    );
    setNode(
      root,
      "helsinki",
      node("initial", "none", "waiting", "connected", "connected"),
    );
    setNode(
      root,
      "frankfurt",
      node("initial", "none", "waiting", "connected", "connected"),
    );
    setNode(
      root,
      "dublin",
      node("initial", "none", "replica", "connected", "connected"),
    );
    setMetrics(root, 0, 0, 0);
    setProperty(root, "consistency", "idle", "One transition history");
    setProperty(root, "availability", "idle", "No partition yet");
    setProperty(root, "partition", "idle", "Network connected");
    renderLog(root, [log("idle", "00", "Replicas agree that I42 is initial.")]);
  }

  function renderPartitioned(root: HTMLElement, controls: CapControls) {
    root.dataset.capPhase = "partitioned";
    root.dataset.capResult = "pending";
    controls.policy.disabled = true;
    controls.partition.disabled = true;
    controls.write.disabled = false;
    controls.heal.disabled = true;
    query<HTMLElement>(root, "[data-cap-network-label]").textContent =
      "network partition";
    setSummary(
      root,
      "Helsinki cannot reach the majority",
      "The next requests reveal the configured write policy.",
      "The partition condition is now part of every decision",
      "The system cannot restore communication by choosing a data policy. It must define what each side is allowed to return while communication is absent.",
    );
    setNode(
      root,
      "helsinki",
      node("initial", "none", "waiting", "isolated", "isolated"),
    );
    setNode(
      root,
      "frankfurt",
      node("initial", "none", "waiting", "majority", "majority 2/3"),
    );
    setNode(
      root,
      "dublin",
      node("initial", "none", "replica", "majority", "majority 2/3"),
    );
    setProperty(root, "consistency", "idle", "Policy not exercised");
    setProperty(root, "availability", "idle", "Policy not exercised");
    setProperty(root, "partition", "warn", "Communication is split");
    renderLog(root, [
      log("idle", "00", "Replicas agree that I42 is initial."),
      log("warn", "01", "HEL loses contact with the FRA–DUB majority."),
    ]);
  }

  function renderWriteOutcome(
    root: HTMLElement,
    controls: CapControls,
    policy: CapPolicy,
  ) {
    root.dataset.capPhase = "written";
    controls.write.disabled = true;
    controls.heal.disabled = false;

    if (policy === "quorum") {
      root.dataset.capResult = "quorum";
      setSummary(
        root,
        "One history · one unavailable write",
        "The majority committed Bob's transition; Helsinki refused Alice's.",
        "Consistency was preserved by denying availability",
        "Helsinki could not prove that its initial value was current, so it returned an error instead of accepting Alice's transition. The connected majority accepted Bob's write.",
      );
      setNode(
        root,
        "helsinki",
        node("initial", "none", "503 no quorum", "isolated", "isolated"),
      );
      setNode(
        root,
        "frankfurt",
        node(
          "active",
          "work_started · Bob",
          "200 started",
          "majority",
          "majority 2/3",
        ),
      );
      setNode(
        root,
        "dublin",
        node(
          "active",
          "work_started · Bob",
          "replicated",
          "majority",
          "majority 2/3",
        ),
      );
      setMetrics(root, 1, 1, 0);
      setProperty(root, "consistency", "pass", "One accepted transition");
      setProperty(root, "availability", "fail", "HEL write returned an error");
      setProperty(root, "partition", "warn", "Service continues on majority");
      renderLog(root, [
        log("idle", "00", "Replicas agree that I42 is initial."),
        log("warn", "01", "HEL loses contact with the FRA–DUB majority."),
        log("fail", "02A", "Alice asks HEL to start I42 → 503 no quorum."),
        log("pass", "02B", "Bob asks FRA to start I42 → 200 committed."),
        log("pass", "03", "FRA replicates Bob's event to DUB."),
      ]);
      return;
    }

    root.dataset.capResult = "local";
    setSummary(
      root,
      "Two successes · two incompatible histories",
      "Both sides accepted a transition from the same initial state.",
      "Availability was preserved by allowing divergence",
      "Alice and Bob both received success, but a single work item cannot make the same initial → active transition twice. Healing the network cannot erase either response.",
    );
    setNode(
      root,
      "helsinki",
      node(
        "active",
        "work_started · Alice",
        "200 started",
        "divergent",
        "isolated",
      ),
    );
    setNode(
      root,
      "frankfurt",
      node(
        "active",
        "work_started · Bob",
        "200 started",
        "divergent",
        "majority 2/3",
      ),
    );
    setNode(
      root,
      "dublin",
      node(
        "active",
        "work_started · Bob",
        "replicated",
        "divergent",
        "majority 2/3",
      ),
    );
    setMetrics(root, 2, 0, 1);
    setProperty(root, "consistency", "fail", "Two accepted transitions");
    setProperty(root, "availability", "pass", "Both regions returned success");
    setProperty(root, "partition", "warn", "Divergence requires repair");
    renderLog(root, [
      log("idle", "00", "Replicas agree that I42 is initial."),
      log("warn", "01", "HEL loses contact with the FRA–DUB majority."),
      log("pass", "02A", "Alice asks HEL to start I42 → 200 accepted locally."),
      log("pass", "02B", "Bob asks FRA to start I42 → 200 accepted locally."),
      log("fail", "03", "HEL and FRA now expose different successful actors."),
    ]);
  }

  function renderHealed(
    root: HTMLElement,
    controls: CapControls,
    policy: CapPolicy,
  ) {
    root.dataset.capPhase = "healed";
    controls.heal.disabled = true;
    query<HTMLElement>(root, "[data-cap-network-label]").textContent =
      "network restored";

    if (policy === "quorum") {
      root.dataset.capResult = "quorum";
      setSummary(
        root,
        "All replicas converge on Bob's transition",
        "Helsinki catches up after communication returns.",
        "The consistency policy avoided reconciliation",
        "The cost remains visible in the rejected Helsinki request. Recovery restores regional service; it does not retroactively make Alice's earlier operation available.",
      );
      setNode(
        root,
        "helsinki",
        node(
          "active",
          "work_started · Bob",
          "caught up",
          "converged",
          "connected",
        ),
      );
      setNode(
        root,
        "frankfurt",
        node(
          "active",
          "work_started · Bob",
          "200 started",
          "converged",
          "connected",
        ),
      );
      setNode(
        root,
        "dublin",
        node(
          "active",
          "work_started · Bob",
          "replicated",
          "converged",
          "connected",
        ),
      );
      setProperty(root, "consistency", "pass", "One accepted transition");
      setProperty(
        root,
        "availability",
        "fail",
        "HEL was unavailable during split",
      );
      setProperty(root, "partition", "pass", "Recovered without conflict");
      renderLog(root, [
        log("idle", "00", "Replicas agree that I42 is initial."),
        log("warn", "01", "HEL loses contact with the FRA–DUB majority."),
        log("fail", "02A", "Alice asks HEL to start I42 → 503 no quorum."),
        log("pass", "02B", "Bob asks FRA to start I42 → 200 committed."),
        log(
          "pass",
          "04",
          "Network heals; HEL receives Bob's committed history.",
        ),
      ]);
      return;
    }

    root.dataset.capResult = "repaired";
    setSummary(
      root,
      "Replicas converge after conflict repair",
      "Alice's accepted event is quarantined; Bob's majority event remains.",
      "Reconciliation restored one state, not one past experience",
      "Every replica now shows active, but Alice was previously told that her transition succeeded. The system needs a repair record, user-visible resolution, or a domain model that can represent both facts honestly.",
    );
    setNode(
      root,
      "helsinki",
      node(
        "active",
        "Bob · Alice quarantined",
        "reconciled",
        "converged",
        "connected",
      ),
    );
    setNode(
      root,
      "frankfurt",
      node(
        "active",
        "Bob · Alice quarantined",
        "200 started",
        "converged",
        "connected",
      ),
    );
    setNode(
      root,
      "dublin",
      node(
        "active",
        "Bob · Alice quarantined",
        "replicated",
        "converged",
        "connected",
      ),
    );
    setMetrics(root, 2, 0, 1);
    setProperty(root, "consistency", "fail", "Diverged until repair");
    setProperty(root, "availability", "pass", "Both writes returned success");
    setProperty(root, "partition", "warn", "One conflict quarantined");
    renderLog(root, [
      log("idle", "00", "Replicas agree that I42 is initial."),
      log("warn", "01", "HEL loses contact with the FRA–DUB majority."),
      log("pass", "02A", "Alice asks HEL to start I42 → 200 accepted locally."),
      log("pass", "02B", "Bob asks FRA to start I42 → 200 accepted locally."),
      log("fail", "04", "Network heals; two successful transitions conflict."),
      log(
        "warn",
        "05",
        "Repair keeps Bob's majority event and quarantines Alice's.",
      ),
    ]);
  }

  type CapControls = {
    heal: HTMLButtonElement;
    partition: HTMLButtonElement;
    policy: HTMLSelectElement;
    write: HTMLButtonElement;
  };

  function setNode(root: HTMLElement, region: CapRegion, view: CapNodeView) {
    const card = query<HTMLElement>(root, `[data-cap-node="${region}"]`);
    card.dataset.nodeState = view.state;
    query<HTMLElement>(root, `[data-cap-node-item="${region}"]`).textContent =
      view.item;
    query<HTMLElement>(root, `[data-cap-node-event="${region}"]`).textContent =
      view.event;
    query<HTMLElement>(root, `[data-cap-node-reply="${region}"]`).textContent =
      view.reply;
    query<HTMLElement>(
      root,
      `[data-cap-node-network="${region}"]`,
    ).textContent = view.network;
  }

  function setSummary(
    root: HTMLElement,
    verdict: string,
    summary: string,
    reading: string,
    explanation: string,
  ) {
    query<HTMLElement>(root, "[data-cap-verdict]").textContent = verdict;
    query<HTMLElement>(root, "[data-cap-summary]").textContent = summary;
    query<HTMLElement>(root, "[data-cap-reading]").textContent = reading;
    query<HTMLElement>(root, "[data-cap-explanation]").textContent =
      explanation;
  }

  function setMetrics(
    root: HTMLElement,
    accepted: number,
    rejected: number,
    conflicts: number,
  ) {
    query<HTMLElement>(root, '[data-cap-metric="accepted"]').textContent =
      String(accepted);
    query<HTMLElement>(root, '[data-cap-metric="rejected"]').textContent =
      String(rejected);
    query<HTMLElement>(root, '[data-cap-metric="conflicts"]').textContent =
      String(conflicts);
  }

  function setProperty(
    root: HTMLElement,
    name: "consistency" | "availability" | "partition",
    status: CapStatus,
    text: string,
  ) {
    const property = query<HTMLElement>(root, `[data-cap-property="${name}"]`);
    property.dataset.status = status;
    query<HTMLElement>(property, "dd").textContent = text;
  }

  function renderLog(root: HTMLElement, entries: CapLogEntry[]) {
    const target = query<HTMLOListElement>(root, "[data-cap-log]");
    target.replaceChildren();
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.dataset.status = entry.status;
      const label = document.createElement("span");
      label.textContent = entry.label;
      const detail = document.createElement("p");
      detail.textContent = entry.detail;
      item.append(label, detail);
      target.append(item);
    });
  }

  function node(
    item: string,
    event: string,
    reply: string,
    state: string,
    network: string,
  ): CapNodeView {
    return { event, item, network, reply, state };
  }

  function log(status: CapStatus, label: string, detail: string): CapLogEntry {
    return { detail, label, status };
  }

  function readPolicy(value: string): CapPolicy {
    return value === "local" ? value : "quorum";
  }

  function query<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing CAP lab element: ${selector}`);
    return element;
  }
}
