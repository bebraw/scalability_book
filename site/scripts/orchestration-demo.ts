import {
  BaseImage,
  Cluster,
  type ProcessContext,
  type V1Deployment,
  type V1Pod,
} from "@ngrok/webernetes";

const namespace = "default";
const deploymentName = "event-api";
const serviceUrl = "http://node-1:31000/events";

class EventApiV1 extends BaseImage {
  static readonly imageName = "course/event-api";
  static readonly imageVersion = "1.0";

  override async exec(ctx: ProcessContext): Promise<number> {
    ctx.listenHttp(8080, async () => ({
      status: 200,
      header: { "content-type": ["application/json"] },
      body: JSON.stringify({ pod: ctx.pod.name, release: "v1" }),
    }));
    return await ctx.waitUntilKilled();
  }
}

class EventApiV2 extends BaseImage {
  static readonly imageName = "course/event-api";
  static readonly imageVersion = "2.0";

  override async exec(ctx: ProcessContext): Promise<number> {
    ctx.listenHttp(8080, async () => ({
      status: 200,
      header: { "content-type": ["application/json"] },
      body: JSON.stringify({ pod: ctx.pod.name, release: "v2" }),
    }));
    return await ctx.waitUntilKilled();
  }
}

type InformerHandle = { stop(): Promise<void> };
type PodSnapshot = { phase: string; node: string; release: string };

class OrchestrationLab {
  private readonly status: HTMLElement;
  private readonly statusDetail: HTMLElement;
  private readonly controllerState: HTMLElement;
  private readonly replicaInput: HTMLInputElement;
  private readonly replicaOutput: HTMLOutputElement;
  private readonly applyButton: HTMLButtonElement;
  private readonly burstButton: HTMLButtonElement;
  private readonly terminateButton: HTMLButtonElement;
  private readonly rolloutButton: HTMLButtonElement;
  private readonly log: HTMLOListElement;
  private readonly metrics: Record<
    "desired" | "running" | "release" | "served",
    HTMLElement
  >;
  private readonly nodeLists: Map<string, HTMLUListElement>;
  private readonly pods = new Map<string, V1Pod>();
  private readonly podSnapshots = new Map<string, PodSnapshot>();
  private cluster: Cluster | undefined;
  private informer: InformerHandle | undefined;
  private desiredReplicas = 3;
  private servedRequests = 0;
  private currentRelease = "v1";
  private busy = true;

  constructor(private readonly root: HTMLElement) {
    this.status = requiredElement(root, "[data-orchestration-status]");
    this.statusDetail = requiredElement(
      root,
      "[data-orchestration-status-detail]",
    );
    this.controllerState = requiredElement(
      root,
      "[data-orchestration-controller-state]",
    );
    this.replicaInput = requiredElement(
      root,
      "[data-orchestration-replicas]",
      HTMLInputElement,
    );
    this.replicaOutput = requiredElement(
      root,
      "[data-orchestration-replica-output]",
      HTMLOutputElement,
    );
    this.applyButton = requiredElement(
      root,
      "[data-orchestration-apply]",
      HTMLButtonElement,
    );
    this.burstButton = requiredElement(
      root,
      "[data-orchestration-burst]",
      HTMLButtonElement,
    );
    this.terminateButton = requiredElement(
      root,
      "[data-orchestration-terminate]",
      HTMLButtonElement,
    );
    this.rolloutButton = requiredElement(
      root,
      "[data-orchestration-rollout]",
      HTMLButtonElement,
    );
    this.log = requiredElement(
      root,
      "[data-orchestration-log]",
      HTMLOListElement,
    );
    this.metrics = {
      desired: requiredElement(root, "[data-orchestration-metric='desired']"),
      running: requiredElement(root, "[data-orchestration-metric='running']"),
      release: requiredElement(root, "[data-orchestration-metric='release']"),
      served: requiredElement(root, "[data-orchestration-metric='served']"),
    };
    this.nodeLists = new Map(
      Array.from(
        root.querySelectorAll<HTMLUListElement>(
          "[data-orchestration-node-pods]",
        ),
      ).map((list) => [list.dataset.orchestrationNodePods ?? "", list]),
    );

    this.replicaInput.addEventListener("input", () => {
      this.replicaOutput.value = this.replicaInput.value;
    });
    this.applyButton.addEventListener("click", () => void this.applyReplicas());
    this.burstButton.addEventListener("click", () => void this.sendBurst());
    this.terminateButton.addEventListener(
      "click",
      () => void this.terminatePod(),
    );
    this.rolloutButton.addEventListener("click", () => void this.rolloutV2());
    window.addEventListener("pagehide", () => void this.close(), {
      once: true,
    });
  }

  async start(): Promise<void> {
    try {
      this.setBusy(true);
      this.setStatus(
        "Starting simulated cluster…",
        "Booting nodes, controllers, DNS, and the in-browser network.",
      );
      this.addLog(
        "Cluster",
        "Desired state: three event-api replicas on three nodes.",
      );

      const cluster = new Cluster({ nodes: 3 });
      this.cluster = cluster;
      cluster.registerImage(EventApiV1);
      cluster.registerImage(EventApiV2);
      await cluster.init();

      this.informer = cluster.informer(
        "pods",
        (eventType, pod) => this.observePod(eventType, pod),
        {
          namespace,
          labelSelector: "app=event-api",
          onError: (error) => this.handleError(error),
        },
      );

      await cluster.apply([deploymentManifest(3, "1.0"), serviceManifest()]);
      await this.waitForPods(
        (pods) => runningPods(pods).length === this.desiredReplicas,
      );
      await delay(150);

      this.controllerState.textContent = "Converged";
      this.setStatus(
        "Desired and observed state match",
        "Three pods are running. Try changing the system while watching the feed.",
      );
      this.addLog("ReplicaSet", "Observed state converged at 3 running pods.");
      this.setBusy(false);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async applyReplicas(): Promise<void> {
    const nextDesired = Number(this.replicaInput.value);
    if (!Number.isInteger(nextDesired) || nextDesired < 1 || nextDesired > 6) {
      return;
    }

    await this.runOperation(async () => {
      this.desiredReplicas = nextDesired;
      this.metrics.desired.textContent = String(nextDesired);
      this.controllerState.textContent = "Reconciling";
      this.setStatus(
        `Reconciling toward ${nextDesired} replicas`,
        "The Deployment changed; the ReplicaSet controller is closing the gap.",
      );
      this.addLog("Operator", `Changed desired replicas to ${nextDesired}.`);

      await this.updateDeployment((deployment) => {
        if (deployment.spec) {
          deployment.spec.replicas = nextDesired;
        }
      });
      await this.waitForPods(
        (pods) => runningPods(pods).length === nextDesired,
      );

      this.controllerState.textContent = "Converged";
      this.setStatus(
        `Converged at ${nextDesired} replicas`,
        "The observed pod count now matches the Deployment's desired state.",
      );
      this.addLog(
        "ReplicaSet",
        `Observed state converged at ${nextDesired} pods.`,
      );
    });
  }

  private async sendBurst(): Promise<void> {
    await this.runOperation(async () => {
      const cluster = this.requireCluster();
      this.setStatus(
        "Routing a six-request burst",
        "The NodePort service selects a healthy endpoint for each request.",
      );

      for (let index = 0; index < 6; index++) {
        const response = await cluster.fetch(serviceUrl);
        const result = JSON.parse(response.body) as {
          pod: string;
          release: string;
        };
        this.servedRequests += 1;
        this.metrics.served.textContent = String(this.servedRequests);
        this.highlightPod(result.pod);
        this.addLog(
          "Service",
          `Request ${this.servedRequests} → ${shortPodName(result.pod)} (${result.release}).`,
        );
        await delay(140);
      }

      this.setStatus(
        "Burst served across pod endpoints",
        "Distribution adds capacity only when the application and its state can be replicated safely.",
      );
    });
  }

  private async terminatePod(): Promise<void> {
    await this.runOperation(async () => {
      const cluster = this.requireCluster();
      const before = runningPods([...this.pods.values()]);
      const victim = before[0];
      const victimName = victim?.metadata?.name;
      if (!victimName) {
        throw new Error(
          "No running application pod is available to terminate.",
        );
      }

      this.controllerState.textContent = "Reconciling";
      this.setStatus(
        `Terminating ${shortPodName(victimName)}`,
        "The observed state will fall below the ReplicaSet's desired count.",
      );
      this.addLog("Failure", `${shortPodName(victimName)} was terminated.`);
      await cluster.api.corev1.deleteNamespacedPod({
        name: victimName,
        namespace,
        gracePeriodSeconds: 0,
      });

      await this.waitForPods((pods) => {
        const names = new Set(pods.map((pod) => pod.metadata?.name));
        return (
          !names.has(victimName) &&
          runningPods(pods).length === this.desiredReplicas
        );
      });

      const replacement = runningPods([...this.pods.values()]).find(
        (pod) =>
          !before.some(
            (oldPod) => oldPod.metadata?.name === pod.metadata?.name,
          ),
      );
      this.controllerState.textContent = "Converged";
      this.setStatus(
        "ReplicaSet restored the desired count",
        "Recovery replaced a process; it did not prove that every request remained available.",
      );
      this.addLog(
        "ReplicaSet",
        replacement?.metadata?.name
          ? `Created replacement ${shortPodName(replacement.metadata.name)}.`
          : "Created a replacement pod.",
      );
    });
  }

  private async rolloutV2(): Promise<void> {
    if (this.currentRelease === "v2") {
      return;
    }

    await this.runOperation(async () => {
      this.controllerState.textContent = "Rolling update";
      this.setStatus(
        "Rolling out release v2",
        "The Deployment controller is replacing v1 pods while preserving capacity.",
      );
      this.addLog(
        "Deployment",
        "Changed the pod template image to event-api:2.0.",
      );

      await this.updateDeployment((deployment) => {
        const template = deployment.spec?.template;
        if (!template?.spec?.containers?.[0]) {
          throw new Error("The Deployment pod template is incomplete.");
        }
        template.spec.containers[0].image = "course/event-api:2.0";
        template.metadata ??= {};
        template.metadata.labels = {
          ...template.metadata.labels,
          release: "v2",
        };
      });

      await this.waitForPods((pods) => {
        const running = runningPods(pods);
        return (
          running.length === this.desiredReplicas &&
          running.every((pod) => podRelease(pod) === "v2")
        );
      }, 20_000);

      this.currentRelease = "v2";
      this.metrics.release.textContent = "v2";
      this.controllerState.textContent = "Converged";
      this.setStatus(
        "Release v2 is fully rolled out",
        "The new pod template became the observed state without replacing every pod at once.",
      );
      this.addLog("Deployment", "All running replicas now use release v2.");
    });
  }

  private async updateDeployment(
    mutate: (deployment: V1Deployment) => void,
  ): Promise<void> {
    const cluster = this.requireCluster();
    const deployment = await cluster.api.appsv1.readNamespacedDeployment({
      name: deploymentName,
      namespace,
    });
    mutate(deployment);
    await cluster.api.appsv1.replaceNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: deployment,
    });
  }

  private observePod(eventType: "add" | "update" | "delete", pod: V1Pod): void {
    const name = pod.metadata?.name;
    if (!name) {
      return;
    }

    const previous = this.podSnapshots.get(name);
    if (eventType === "delete") {
      this.pods.delete(name);
      this.podSnapshots.delete(name);
      if (previous) {
        this.addLog(
          "Pod",
          `${shortPodName(name)} removed from observed state.`,
        );
      }
    } else {
      this.pods.set(name, pod);
      const next = podSnapshot(pod);
      this.podSnapshots.set(name, next);
      if (!previous) {
        this.addLog(
          "Scheduler",
          `${shortPodName(name)} entered the pending queue.`,
        );
      } else if (previous.phase !== "Running" && next.phase === "Running") {
        this.addLog(
          "Kubelet",
          `${shortPodName(name)} is running on ${next.node} (${next.release}).`,
        );
      }
    }
    this.renderPods();
  }

  private async waitForPods(
    predicate: (pods: V1Pod[]) => boolean,
    timeoutMs = 12_000,
  ): Promise<void> {
    const cluster = this.requireCluster();
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = await cluster.api.corev1.listNamespacedPod({
        namespace,
        labelSelector: "app=event-api",
      });
      for (const pod of response.items) {
        const name = pod.metadata?.name;
        if (name) {
          this.pods.set(name, pod);
        }
      }
      const currentNames = new Set(
        response.items.map((pod) => pod.metadata?.name),
      );
      for (const name of this.pods.keys()) {
        if (!currentNames.has(name)) {
          this.pods.delete(name);
        }
      }
      this.renderPods();
      if (predicate(response.items)) {
        return;
      }
      await delay(100);
    }

    throw new Error("The simulated controllers did not converge in time.");
  }

  private renderPods(): void {
    for (const list of this.nodeLists.values()) {
      list.replaceChildren();
    }

    const pods = [...this.pods.values()].sort((left, right) =>
      (left.metadata?.name ?? "").localeCompare(right.metadata?.name ?? ""),
    );
    for (const pod of pods) {
      const node = pod.spec?.nodeName ?? "node-1";
      const target = this.nodeLists.get(node);
      const name = pod.metadata?.name;
      if (!target || !name) {
        continue;
      }

      const phase = pod.metadata?.deletionTimestamp
        ? "Terminating"
        : (pod.status?.phase ?? "Pending");
      const release = podRelease(pod);
      const item = document.createElement("li");
      item.className = "orchestration-pod";
      item.dataset.podName = name;
      item.dataset.podPhase = phase.toLowerCase();
      item.dataset.podRelease = release;

      const marker = document.createElement("span");
      marker.className = "orchestration-pod-marker";
      marker.setAttribute("aria-hidden", "true");
      const content = document.createElement("div");
      const podName = document.createElement("strong");
      podName.textContent = shortPodName(name);
      podName.title = name;
      const detail = document.createElement("small");
      detail.textContent = `${release} · ${phase}`;
      content.append(podName, detail);
      item.append(marker, content);
      target.append(item);
    }

    const running = runningPods(pods).length;
    this.metrics.running.textContent = String(running);
    for (const [nodeName, list] of this.nodeLists) {
      if (list.childElementCount === 0) {
        const empty = document.createElement("li");
        empty.className = "orchestration-node-empty";
        empty.textContent = `${nodeName} · available`;
        list.append(empty);
      }
    }
  }

  private highlightPod(name: string): void {
    for (const pod of this.root.querySelectorAll<HTMLElement>(
      "[data-pod-name]",
    )) {
      if (pod.dataset.podName === name) {
        pod.classList.remove("is-serving");
        void pod.offsetWidth;
        pod.classList.add("is-serving");
        window.setTimeout(() => pod.classList.remove("is-serving"), 480);
        break;
      }
    }
  }

  private addLog(source: string, message: string): void {
    const item = document.createElement("li");
    const sourceElement = document.createElement("strong");
    sourceElement.textContent = source;
    const messageElement = document.createElement("span");
    messageElement.textContent = message;
    item.append(sourceElement, messageElement);
    this.log.prepend(item);
    while (this.log.childElementCount > 9) {
      this.log.lastElementChild?.remove();
    }
  }

  private async runOperation(operation: () => Promise<void>): Promise<void> {
    if (this.busy) {
      return;
    }
    this.setBusy(true);
    try {
      await operation();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setBusy(false);
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.root.toggleAttribute("data-busy", busy);
    this.replicaInput.disabled = busy;
    this.applyButton.disabled = busy;
    this.burstButton.disabled = busy;
    this.terminateButton.disabled = busy;
    this.rolloutButton.disabled = busy || this.currentRelease === "v2";
  }

  private setStatus(title: string, detail: string): void {
    this.status.textContent = title;
    this.statusDetail.textContent = detail;
  }

  private handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.controllerState.textContent = "Attention";
    this.root.setAttribute("data-error", "");
    this.setStatus("The teaching cluster stopped", message);
    this.addLog("Error", message);
  }

  private requireCluster(): Cluster {
    if (!this.cluster) {
      throw new Error("The teaching cluster has not started yet.");
    }
    return this.cluster;
  }

  private async close(): Promise<void> {
    await this.informer?.stop();
    await this.cluster?.close();
  }
}

function deploymentManifest(replicas: number, version: "1.0" | "2.0") {
  return {
    apiVersion: "apps/v1" as const,
    kind: "Deployment" as const,
    metadata: { name: deploymentName, namespace },
    spec: {
      replicas,
      strategy: {
        type: "RollingUpdate",
        rollingUpdate: { maxSurge: 1, maxUnavailable: 1 },
      },
      selector: { matchLabels: { app: "event-api" } },
      template: {
        metadata: {
          labels: {
            app: "event-api",
            release: version === "1.0" ? "v1" : "v2",
          },
        },
        spec: {
          containers: [
            {
              name: "event-api",
              image: `course/event-api:${version}`,
              ports: [{ containerPort: 8080, protocol: "TCP" }],
            },
          ],
        },
      },
    },
  };
}

function serviceManifest() {
  return {
    apiVersion: "v1" as const,
    kind: "Service" as const,
    metadata: { name: deploymentName, namespace },
    spec: {
      type: "NodePort",
      selector: { app: "event-api" },
      ports: [
        {
          name: "http",
          protocol: "TCP",
          port: 80,
          targetPort: 8080,
          nodePort: 31000,
        },
      ],
    },
  };
}

function runningPods(pods: V1Pod[]): V1Pod[] {
  return pods.filter(
    (pod) =>
      pod.status?.phase === "Running" && !pod.metadata?.deletionTimestamp,
  );
}

function podRelease(pod: V1Pod): string {
  return pod.spec?.containers?.[0]?.image?.endsWith(":2.0") ? "v2" : "v1";
}

function podSnapshot(pod: V1Pod): PodSnapshot {
  return {
    phase: pod.status?.phase ?? "Pending",
    node: pod.spec?.nodeName ?? "unscheduled",
    release: podRelease(pod),
  };
}

function shortPodName(name: string): string {
  const parts = name.split("-");
  return parts.length > 3 ? `pod-${parts.slice(-2).join("-")}` : name;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function requiredElement<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  constructor?: { new (): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof (constructor ?? HTMLElement))) {
    throw new Error(`Missing orchestration lab element: ${selector}`);
  }
  return element as T;
}

for (const root of document.querySelectorAll<HTMLElement>(
  "[data-orchestration-lab]",
)) {
  void new OrchestrationLab(root).start();
}
