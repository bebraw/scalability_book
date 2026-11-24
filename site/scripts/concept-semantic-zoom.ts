import { routePath, type RoutePoint } from "../../shared/concept-graph.ts";
import type { ConceptViewport } from "./concept-viewport.ts";

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
const badgeHeight = 20;

// Return only the part of a routed connection outside its two topic regions.
function betweenRegions(route: RoutePoint[], source: Region, target: Region) {
  const trim = (points: RoutePoint[], box: Region) => {
    const inside = (point: RoutePoint) =>
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
    const index = points.findIndex((point) => !inside(point));
    if (index <= 0) return points;
    const a = points[index - 1]!,
      b = points[index]!;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.min(
      dx > 0
        ? (box.x + box.width - a.x) / dx
        : dx < 0
          ? (box.x - a.x) / dx
          : Infinity,
      dy > 0
        ? (box.y + box.height - a.y) / dy
        : dy < 0
          ? (box.y - a.y) / dy
          : Infinity,
    );
    return [{ x: a.x + dx * t, y: a.y + dy * t }, ...points.slice(index)];
  };
  return trim(trim(route, source).reverse(), target).reverse();
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
    points: RoutePoint[];
    labelPositions: RoutePoint[];
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
    const regionOf = new Map(
      this.regions.map(({ bounds }) => [bounds.group, bounds]),
    );
    const aggregates = new Map<
      string,
      {
        source: string;
        target: string;
        count: number;
        points: RoutePoint[];
        length: number;
      }
    >();
    for (const edge of svg.querySelectorAll<SVGGElement>(
      "[data-concept-edge]",
    )) {
      const [sourceId, targetId] = edge.dataset.conceptEdge!.split(" ");
      const source = groupOf.get(sourceId!)!,
        target = groupOf.get(targetId!)!;
      if (source === target) continue;
      const key = [source, target].sort().join(" ");
      const points = betweenRegions(
        JSON.parse(edge.dataset.route!),
        regionOf.get(source)!,
        regionOf.get(target)!,
      );
      const length = points
        .slice(1)
        .reduce(
          (sum, p, i) =>
            sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y),
          0,
        );
      const earlier = aggregates.get(key);
      aggregates.set(key, {
        source,
        target,
        count: (earlier?.count || 0) + 1,
        points: earlier && earlier.length < length ? earlier.points : points,
        length: Math.min(earlier?.length ?? Infinity, length),
      });
    }
    for (const aggregate of aggregates.values()) {
      const element = document.createElementNS(ns, "g");
      element.classList.add("concept-cluster-connection");
      element.setAttribute("aria-hidden", "true");
      element.dataset.connectionCount = String(aggregate.count);
      const title = document.createElementNS(ns, "title");
      title.textContent = `${aggregate.source} ↔ ${aggregate.target}: ${aggregate.count} authored connections. Expand the topics to inspect their directions and explanations.`;
      element.append(title);
      const path = document.createElementNS(ns, "path");
      path.setAttribute("data-concept-summary-line", "");
      element.append(path);
      const label = document.createElementNS(ns, "g");
      const text = document.createElementNS(ns, "text");
      text.textContent = String(aggregate.count);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      const rect = document.createElementNS(ns, "rect");
      label.append(rect, text);
      element.append(label);
      // Prefer the longest segment's center. Other points on the route let
      // fixed-size badges move apart as the map shrinks.
      const segments = aggregate.points
        .slice(1)
        .map((b, i) => ({ a: aggregate.points[i]!, b }));
      segments.sort(
        (a, b) =>
          Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y) -
          Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y),
      );
      this.summaries.push({
        element,
        points: aggregate.points,
        labelPositions: segments.flatMap(({ a, b }) =>
          [0.5, 0.25, 0.75, 0.125, 0.875].map((fraction) => ({
            x: a.x + (b.x - a.x) * fraction,
            y: a.y + (b.y - a.y) * fraction,
          })),
        ),
      });
      // Summary connections sit in front of region backgrounds and behind nodes.
      this.regions.at(-1)!.element.after(element);
    }
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
    for (const { element, bounds } of this.regions) {
      element.classList.toggle("is-hidden", !this.enabled);
      element.setAttribute("tabindex", this.enabled ? "0" : "-1");
      element.setAttribute(
        "transform",
        `translate(${bounds.x * this.factor} ${bounds.y * this.factor})`,
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
    const placed: RoutePoint[] = [];
    const pixelsPerUnit = scale * this.factor;
    for (const summary of this.summaries) {
      summary.element.classList.toggle("is-hidden", detail !== "overview");
      summary.element.querySelector("path")!.setAttribute(
        "d",
        routePath(
          summary.points.map((point) => ({
            x: point.x * this.factor,
            y: point.y * this.factor,
          })),
        ),
      );
      const label = summary.element.querySelector("g")!;
      const position =
        summary.labelPositions.find((p) =>
          placed.every(
            (other) =>
              Math.abs(p.x - other.x) * pixelsPerUnit >= badgeWidth + 3 ||
              Math.abs(p.y - other.y) * pixelsPerUnit >= badgeHeight + 3,
          ),
        ) ?? summary.labelPositions[0]!;
      placed.push(position);
      label.setAttribute(
        "transform",
        `translate(${position.x * this.factor} ${position.y * this.factor})`,
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
  }
}
