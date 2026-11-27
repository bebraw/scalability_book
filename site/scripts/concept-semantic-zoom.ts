import { routePath, type RoutePoint } from "../../shared/concept-graph.ts";
import type { ConceptViewport } from "./concept-viewport.ts";
import type { TopicConnections } from "./concept-topic-connections.ts";
import { overviewHeadingBounds } from "../../shared/concept-route-labels.ts";

type Region = {
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};
const ns = "http://www.w3.org/2000/svg";
const badgeWidth = 24;
const badgeHeight = 24;

// Topic counts summarize pairs, so their paths attach to topic boundaries.
function topicConnection(
  a: Region,
  b: Region,
  outside: number,
  firstColumn: number,
) {
  const right = (r: Region) => r.x + r.width;
  const bottom = (r: Region) => r.y + r.height;
  const top = a.y <= b.y ? a : b;
  const lower = top === a ? b : a;
  let points: RoutePoint[];
  if (a.y === b.y) {
    const left = a.x < b.x ? a : b;
    const other = left === a ? b : a;
    const x = (right(left) + other.x) / 2;
    const y1 = left.y + left.height * 0.3;
    const y2 = other.y + other.height * 0.7;
    points = [
      { x: right(left), y: y1 },
      { x, y: y1 },
      { x, y: y2 },
      { x: other.x, y: y2 },
    ];
  } else if (top.x > lower.x) {
    // Take one diagonal around the outside of the grid. Both diagonals can
    // then be traced without a crossing in the middle of the four topics.
    const x1 = top.x + top.width / 2;
    const x2 = lower.x - outside;
    const y1 = top.y - outside;
    const y2 = lower.y + lower.height / 2;
    points = [
      { x: x1, y: top.y },
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: lower.x, y: y2 },
    ];
  } else {
    // The left column, inner diagonal and right column occupy separate
    // intervals of the same row gutter.
    const sameColumn = top.x === lower.x;
    const leftColumn = top.x === firstColumn;
    const x1 =
      top.x + top.width * (sameColumn ? (leftColumn ? 0.12 : 0.58) : 0.72);
    const x2 =
      lower.x + lower.width * (sameColumn ? (leftColumn ? 0.42 : 0.88) : 0.28);
    const y = (bottom(top) + lower.y) / 2;
    points = [
      { x: x1, y: bottom(top) },
      { x: x1, y },
      { x: x2, y },
      { x: x2, y: lower.y },
    ];
  }
  const start = points[1]!,
    end = points[2]!;
  return {
    points,
    label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

export class ConceptSemanticZoom {
  private enabled = true;
  private showLabels = false;
  private factor = 1;
  private groupFocusScale = 0;
  private regions;
  private subgroups;
  private detail;
  private status;
  private summaries: {
    element: SVGGElement;
    badge: SVGGElement;
    source: string;
    target: string;
  }[] = [];

  constructor(
    map: HTMLElement,
    private graphic: HTMLElement,
    private viewport: ConceptViewport,
  ) {
    const svg = graphic.querySelector("svg")!;
    this.regions = [
      ...svg.querySelectorAll<SVGGElement>("[data-concept-cluster]"),
    ].map((element) => ({
      element,
      bounds: JSON.parse(element.dataset.bounds!) as Region,
    }));
    this.subgroups = [
      ...svg.querySelectorAll<SVGGElement>("[data-concept-subgroup-target]"),
    ].map((element) => ({
      element,
      bounds: JSON.parse(element.dataset.bounds!) as Pick<
        Region,
        "x" | "y" | "width" | "height"
      >,
    }));
    for (const { element } of this.subgroups) {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      const title = element.querySelector(
        ".concept-subgroup-title",
      )!.textContent;
      element.setAttribute(
        "aria-label",
        `Explore ${title}, ${element.dataset.count} concepts`,
      );
      const activate = () =>
        map.dispatchEvent(
          new CustomEvent("concept-subgroup-select", {
            detail: { id: element.dataset.conceptSubgroupTarget },
          }),
        );
      element.addEventListener("click", activate);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
    this.detail = map.querySelector<HTMLSelectElement>(
      "[data-concept-detail]",
    )!;
    this.status = map.querySelector<HTMLElement>(
      "[data-concept-semantic-status]",
    )!;
    map.querySelector<HTMLElement>("[data-concept-detail-control]")!.hidden =
      false;
    this.detail.addEventListener("change", () => this.render());
    graphic.addEventListener("concept-camera-change", () => this.render());
    for (const { element, bounds } of this.regions) {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute(
        "aria-label",
        `Zoom to ${bounds.group}, ${bounds.count} concepts`,
      );
      const activate = () => {
        viewport.focusBounds({
          x: bounds.x * this.factor,
          y: bounds.y * this.factor,
          width: bounds.width * this.factor,
          height: bounds.height * this.factor,
        });
        // A wide cluster cannot expose readable cards on a narrow screen.
        // Reuse the existing explicit group-only view for that transition.
        if (graphic.clientWidth < 600) {
          const select = map.querySelector<HTMLSelectElement>(
            "[data-concept-group]",
          )!;
          select.value = bounds.group;
          map.querySelector<HTMLSelectElement>(
            "[data-concept-subgroup]",
          )!.value = "";
          map.querySelector<HTMLInputElement>(
            '[data-concept-group-mode][value="only"]',
          )!.checked = true;
          select.dispatchEvent(new Event("change"));
        } else {
          this.groupFocusScale = viewport.scale;
          this.render();
        }
      };
      element.addEventListener("click", activate);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
    const groupOf = new Map(
      [...svg.querySelectorAll<SVGAElement>("[data-concept-node]")].map(
        (node) => [node.dataset.conceptNode!, node.dataset.group!],
      ),
    );
    const aggregates = new Map<
      string,
      { groups: string[]; relations: Set<string> }
    >();
    for (const edge of svg.querySelectorAll<SVGGElement>(
      "[data-concept-edge]",
    )) {
      const relation = edge.dataset.conceptEdge!;
      const [sourceId, targetId] = relation.split(" ");
      const groups = [groupOf.get(sourceId!)!, groupOf.get(targetId!)!].sort();
      if (groups[0] === groups[1]) continue;
      const key = groups.join(" ");
      const aggregate = aggregates.get(key) ?? {
        groups,
        relations: new Set<string>(),
      };
      aggregate.relations.add(relation);
      aggregates.set(key, aggregate);
    }
    for (const { groups, relations } of aggregates.values()) {
      const count = relations.size;
      const [source, target] = groups as [string, string];
      const element = document.createElementNS(ns, "g");
      element.classList.add("concept-cluster-connection");
      element.dataset.connectionCount = String(count);
      const description = `${count} ${count === 1 ? "connection" : "connections"} between ${source} and ${target}`;
      const title = document.createElementNS(ns, "title");
      title.textContent = description;
      element.append(title);
      const path = document.createElementNS(ns, "path");
      path.setAttribute("data-concept-summary-line", "");
      element.append(
        path,
        document.createElementNS(ns, "circle"),
        document.createElementNS(ns, "circle"),
      );
      const label = document.createElementNS(ns, "g");
      const text = document.createElementNS(ns, "text");
      text.textContent = String(count);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      const rect = document.createElementNS(ns, "rect");
      label.append(rect, text);
      element.append(label);
      label.setAttribute("role", "button");
      label.setAttribute("aria-label", `Read ${description}`);
      label.dataset.topicConnection = groups.join(" ");
      const read = () =>
        label.dispatchEvent(
          new CustomEvent<TopicConnections>("concept-topic-connections", {
            bubbles: true,
            detail: { description, relations },
          }),
        );
      label.addEventListener("click", read);
      for (const event of ["pointerenter", "pointerleave", "focus", "blur"])
        label.addEventListener(event, () => this.highlightTopicPair());
      label.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          read();
        }
      });
      this.summaries.push({ element, badge: label, source, target });
      // Summary connections sit in front of region backgrounds and behind nodes.
      this.regions.at(-1)!.element.after(element);
    }
  }

  headingBounds(factor: number) {
    return overviewHeadingBounds(
      this.regions.map((region) => region.bounds),
      this.subgroups.map((subgroup) => subgroup.bounds),
      factor,
    );
  }

  setContext(enabled: boolean, showLabels: boolean, factor: number) {
    this.enabled = enabled;
    this.showLabels = showLabels;
    this.factor = factor;
    this.render();
  }

  get overview() {
    return this.graphic.dataset.detail === "overview";
  }

  private highlightTopicPair() {
    const active = this.overview
      ? (this.summaries.find(({ badge }) => badge.matches(":focus-visible")) ??
        this.summaries.find(({ badge }) => badge.matches(":hover")))
      : undefined;
    for (const summary of this.summaries)
      summary.element.classList.toggle("is-traced", summary === active);
    for (const { element, bounds } of this.regions)
      element.classList.toggle(
        "is-traced-topic",
        bounds.group === active?.source || bounds.group === active?.target,
      );
  }

  private render() {
    const scale = this.viewport.scale;
    if (scale < this.groupFocusScale * 0.8) this.groupFocusScale = 0;
    const detailScale = this.groupFocusScale ? Math.max(0.5, scale) : scale;
    const detail =
      !this.enabled || this.showLabels || this.detail.value === "all"
        ? "relationships"
        : detailScale < 0.5
          ? "overview"
          : detailScale < 0.8
            ? "concepts"
            : "relationships";
    this.graphic.dataset.detail = detail;
    const compactOverview =
      detail === "overview" &&
      this.subgroups.some(
        ({ bounds }) => bounds.width * this.factor * scale < 230,
      );
    this.graphic.dataset.compactOverview = String(compactOverview);
    this.status.textContent =
      !this.enabled || detail === "overview"
        ? ""
        : detail === "concepts"
          ? "Zoom in or focus a concept to follow its connections."
          : "Hover or focus a concept to read the connection labels.";
    const firstColumn = Math.min(...this.regions.map(({ bounds }) => bounds.x));
    const lastColumn = Math.max(...this.regions.map(({ bounds }) => bounds.x));
    const firstRow = Math.min(...this.regions.map(({ bounds }) => bounds.y));
    const lastRow = Math.max(...this.regions.map(({ bounds }) => bounds.y));
    const cell = this.regions[0]!.bounds;
    // Compact views show only the four topic cards. Give the count buttons a
    // clear gutter at phone widths without shrinking those cards or their type.
    const minGap = compactOverview ? 42 / (scale * this.factor) : 0;
    const dx = Math.max(
      0,
      (minGap - (lastColumn - firstColumn - cell.width)) / 2,
    );
    const dy = Math.max(0, (minGap - (lastRow - firstRow - cell.height)) / 2);
    const displayed = new Map(
      this.regions.map(({ bounds }) => [
        bounds.group,
        {
          ...bounds,
          x: bounds.x + (bounds.x === firstColumn ? -dx : dx),
          y: bounds.y + (bounds.y === firstRow ? -dy : dy),
        },
      ]),
    );
    for (const { element, bounds: authoredBounds } of this.regions) {
      const bounds = displayed.get(authoredBounds.group)!;
      element.classList.toggle("is-hidden", !this.enabled);
      element.setAttribute("tabindex", this.enabled ? "0" : "-1");
      element.setAttribute(
        "transform",
        `translate(${authoredBounds.x * this.factor} ${authoredBounds.y * this.factor})`,
      );
      if (compactOverview)
        element.style.setProperty(
          "--compact-topic-position",
          `translate(${bounds.x}px, ${bounds.y}px)`,
        );
      element
        .querySelector("rect")!
        .setAttribute("width", String(bounds.width * this.factor));
      element
        .querySelector("rect")!
        .setAttribute("height", String(bounds.height * this.factor));
      const heading = element.querySelector<SVGGElement>(
        "[data-concept-cluster-heading]",
      )!;
      const size = detail === "overview" ? 1 / scale : 1;
      const pixelWidth = bounds.width * this.factor * scale;
      const pixelHeight = bounds.height * this.factor * scale;
      const margin =
        detail === "overview" ? Math.min(18, pixelWidth * 0.1) : 18;
      const baseline =
        detail === "overview" ? Math.min(27, pixelHeight * 0.38) : 27;
      heading.setAttribute(
        "transform",
        `translate(${margin * size} ${baseline * size})`,
      );
      heading.querySelector<SVGTextElement>(
        ".concept-cluster-title",
      )!.style.fontSize =
        `${(detail === "overview" ? Math.min(22, (pixelWidth - 2 * margin) / (bounds.group.length * 0.58)) : 24) * size}px`;
      const count = heading.querySelector<SVGTextElement>(
        ".concept-cluster-count",
      )!;
      count.style.fontSize = `${(detail === "overview" ? Math.min(11, (pixelWidth - 2 * margin) / (`${bounds.count} concepts`.length * 0.55)) : 11) * size}px`;
      count.setAttribute(
        "y",
        String(
          (detail === "overview" && pixelWidth >= 260
            ? 0
            : detail === "overview"
              ? Math.min(19, pixelHeight * 0.3)
              : 19) * size,
        ),
      );
      count.setAttribute(
        "x",
        String(
          detail === "overview" && pixelWidth >= 260
            ? bounds.width * this.factor - 2 * margin * size
            : 0,
        ),
      );
      count.setAttribute(
        "text-anchor",
        detail === "overview" && pixelWidth >= 260 ? "end" : "start",
      );
    }
    for (const { element, bounds } of this.subgroups) {
      const compact =
        detail === "overview" && bounds.width * this.factor * scale < 230;
      const shown = this.enabled && !compact;
      element.classList.toggle("is-hidden", !shown);
      element.setAttribute("tabindex", shown ? "0" : "-1");
      element.setAttribute("aria-hidden", String(!shown));
      element.setAttribute(
        "transform",
        `translate(${bounds.x * this.factor} ${bounds.y * this.factor})`,
      );
      const surface = element.querySelector("rect")!;
      surface.setAttribute("width", String(bounds.width * this.factor));
      surface.setAttribute("height", String(bounds.height * this.factor));
      const heading = element.querySelector<SVGGElement>(
        "[data-concept-subgroup-heading]",
      )!;
      const size = detail === "overview" ? 1 / scale : 1;
      heading.setAttribute(
        "transform",
        `translate(${detail === "overview" ? 6 * size : 0} ${(detail === "overview" ? 13 : 18) * size})`,
      );
      heading.querySelector<SVGTextElement>(
        ".concept-subgroup-title",
      )!.style.fontSize = `${(detail === "overview" ? 13 : 18) * size}px`;
      const count = heading.querySelector<SVGTextElement>(
        ".concept-subgroup-count",
      )!;
      count.style.fontSize = `${(detail === "overview" ? 11 : 14) * size}px`;
      count.setAttribute(
        "x",
        String(
          bounds.width * this.factor - (detail === "overview" ? 12 * size : 0),
        ),
      );
    }
    for (const summary of this.summaries) {
      const visible = detail === "overview";
      summary.element.classList.toggle("is-hidden", !visible);
      const label = summary.badge;
      label.setAttribute("tabindex", visible ? "0" : "-1");
      if (!visible) continue;
      const route = topicConnection(
        displayed.get(summary.source)!,
        displayed.get(summary.target)!,
        12 / (scale * this.factor),
        firstColumn - dx,
      );
      summary.element
        .querySelector("path")!
        .setAttribute("d", routePath(route.points));
      const pins = [route.points[0]!, route.points.at(-1)!];
      summary.element.querySelectorAll("circle").forEach((circle, index) => {
        circle.setAttribute("cx", String(pins[index]!.x));
        circle.setAttribute("cy", String(pins[index]!.y));
        circle.setAttribute("r", String(2 / scale));
      });
      label.setAttribute(
        "transform",
        `translate(${route.label.x} ${route.label.y})`,
      );
      const size = 1 / scale;
      label.querySelector<SVGTextElement>("text")!.style.fontSize =
        `${11 * size}px`;
      const rect = label.querySelector("rect")!;
      for (const [name, value] of Object.entries({
        x: -badgeWidth / 2,
        y: -badgeHeight / 2,
        width: badgeWidth,
        height: badgeHeight,
        rx: 7,
      }))
        rect.setAttribute(name, String(value * size));
    }
    this.highlightTopicPair();
  }
}
