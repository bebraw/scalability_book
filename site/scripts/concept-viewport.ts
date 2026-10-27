type Point = { x: number; y: number };
type Bounds = { width: number; height: number };
export type ViewportState = Bounds & Point & { scale: number };

// The viewBox is a camera, independent of the SVG's document/scroll bounds.
export class ConceptViewport {
  bounds: Bounds;
  x: number;
  y: number;
  scale = 1;
  private pointers = new Map<number, Point>();
  private gesture: {
    point: Point;
    world: Point;
    scale: number;
    distance: number;
  } | null = null;
  private dragged = false;
  private suppressClick = false;
  private printing = false;

  constructor(
    private graphic: HTMLElement,
    private svg: SVGSVGElement,
  ) {
    this.bounds = {
      width: Number(svg.dataset.width),
      height: Number(svg.dataset.height),
    };
    this.x = this.bounds.width / 2;
    this.y = this.bounds.height / 2;
    graphic.classList.add("is-interactive");
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    new ResizeObserver(() => this.render()).observe(graphic);
    window.addEventListener("beforeprint", () => {
      this.printing = true;
      this.render();
    });
    window.addEventListener("afterprint", () => {
      this.printing = false;
      this.render();
    });
    graphic.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const unit =
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? graphic.clientHeight
              : 1;
        if (event.ctrlKey || event.metaKey) {
          this.zoom(
            this.width * Math.exp(-event.deltaY * unit * 0.002),
            this.local(event),
          );
        } else this.pan(-event.deltaX * unit, -event.deltaY * unit);
      },
      { passive: false },
    );
    graphic.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      // Safari suppresses the tap's click when touch pointerdown is cancelled.
      // touch-action: none handles native scrolling and zooming on this surface.
      if (event.pointerType !== "touch") event.preventDefault();
      this.suppressClick = false;
      this.pointers.set(event.pointerId, this.local(event));
      this.beginGesture();
      // Capture after the movement threshold so taps retain their link target.
    });
    graphic.addEventListener("pointermove", (event) => {
      if (!this.pointers.has(event.pointerId) || !this.gesture) return;
      this.pointers.set(event.pointerId, this.local(event));
      const { point, distance } = this.pointerGeometry();
      if (
        !this.dragged &&
        Math.hypot(
          point.x - this.gesture.point.x,
          point.y - this.gesture.point.y,
        ) < 5 &&
        Math.abs(distance - this.gesture.distance) < 5
      )
        return;
      if (!this.dragged) graphic.focus({ preventScroll: true });
      this.dragged = true;
      this.suppressClick = true;
      graphic.classList.add("is-dragging");
      if (!graphic.hasPointerCapture(event.pointerId))
        graphic.setPointerCapture(event.pointerId);
      if (distance && this.gesture.distance)
        this.scale = this.clamp(
          (this.gesture.scale * distance) / this.gesture.distance,
        );
      this.x =
        this.gesture.world.x - (point.x - graphic.clientWidth / 2) / this.scale;
      this.y =
        this.gesture.world.y -
        (point.y - graphic.clientHeight / 2) / this.scale;
      this.render();
    });
    const end = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      if (graphic.hasPointerCapture(event.pointerId))
        graphic.releasePointerCapture(event.pointerId);
      if (this.pointers.size) this.beginGesture();
      else {
        this.gesture = null;
        graphic.classList.remove("is-dragging");
      }
    };
    graphic.addEventListener("pointerup", end);
    graphic.addEventListener("pointercancel", end);
    window.addEventListener("pointerup", (event) => {
      if (this.pointers.has(event.pointerId)) end(event);
    });
    window.addEventListener("pointercancel", (event) => {
      if (this.pointers.has(event.pointerId)) end(event);
    });
    graphic.addEventListener("lostpointercapture", (event) => {
      // A touch starts with implicit capture on an SVG child. Its loss bubbles
      // here when capture moves to the graphic; that transfer is not an end.
      if (event.target === graphic && this.pointers.has(event.pointerId))
        end(event);
    });
    graphic.addEventListener("dragstart", (event) => event.preventDefault());
    graphic.addEventListener(
      "click",
      (event) => {
        if (this.suppressClick && event.detail) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.suppressClick = false;
        } else if (
          event instanceof MouseEvent &&
          event.detail &&
          !(event.target as Element).closest("[data-concept-node]")
        )
          graphic.focus({ preventScroll: true });
      },
      true,
    );
    graphic.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const step = event.shiftKey ? 160 : 60;
      const arrows: Record<string, Point> = {
        ArrowLeft: { x: step, y: 0 },
        ArrowRight: { x: -step, y: 0 },
        ArrowUp: { x: 0, y: step },
        ArrowDown: { x: 0, y: -step },
      };
      if (arrows[event.key])
        this.pan(arrows[event.key]!.x, arrows[event.key]!.y);
      else if (event.key === "+" || event.key === "=")
        this.zoom(this.width * 1.25);
      else if (event.key === "-") this.zoom(this.width * 0.8);
      else if (event.key === "0") this.fit();
      else return;
      event.preventDefault();
    });
    this.render();
  }

  get width() {
    return this.bounds.width * this.scale;
  }
  snapshot(): ViewportState {
    return { ...this.bounds, x: this.x, y: this.y, scale: this.scale };
  }
  restore(state: ViewportState) {
    this.x = (state.x * this.bounds.width) / state.width;
    this.y = (state.y * this.bounds.height) / state.height;
    this.scale = state.scale;
    this.render();
  }
  setBounds(bounds: Bounds) {
    this.x *= bounds.width / this.bounds.width;
    this.y *= bounds.height / this.bounds.height;
    this.bounds = bounds;
    this.render();
  }
  zoom(
    width: number,
    anchor: Point = {
      x: this.graphic.clientWidth / 2,
      y: this.graphic.clientHeight / 2,
    },
  ) {
    const world = this.world(anchor);
    this.scale = this.clamp(width / this.bounds.width);
    this.x = world.x - (anchor.x - this.graphic.clientWidth / 2) / this.scale;
    this.y = world.y - (anchor.y - this.graphic.clientHeight / 2) / this.scale;
    this.render();
  }
  pan(dx: number, dy: number) {
    this.x -= dx / this.scale;
    this.y -= dy / this.scale;
    this.render();
  }
  fit(maxWidth = Infinity) {
    const w = Math.max(1, this.graphic.clientWidth - 48),
      h = Math.max(1, this.graphic.clientHeight - 48);
    this.scale = this.clamp(
      Math.min(w, (h * this.bounds.width) / this.bounds.height, maxWidth) /
        this.bounds.width,
    );
    this.x = this.bounds.width / 2;
    this.y = this.bounds.height / 2;
    this.render();
  }
  readable() {
    this.zoom(this.bounds.width);
  }
  focusBounds(bounds: Bounds & Point) {
    this.scale = this.clamp(
      Math.min(
        (this.graphic.clientWidth - 48) / bounds.width,
        (this.graphic.clientHeight - 48) / bounds.height,
      ),
    );
    this.x = bounds.x + bounds.width / 2;
    this.y = bounds.y + bounds.height / 2;
    this.render();
  }
  reveal(point: Point) {
    const halfWidth = this.graphic.clientWidth / this.scale / 2;
    const halfHeight = this.graphic.clientHeight / this.scale / 2;
    if (
      Math.abs(point.x - this.x) + 110 > halfWidth ||
      Math.abs(point.y - this.y) + 50 > halfHeight
    ) {
      this.x = point.x;
      this.y = point.y;
      this.render();
    }
  }
  render() {
    if (this.printing) {
      this.svg.setAttribute(
        "viewBox",
        `0 0 ${this.bounds.width} ${this.bounds.height}`,
      );
      return;
    }
    const width = (this.graphic.clientWidth || 440) / this.scale;
    const height = (this.graphic.clientHeight || 440) / this.scale;
    this.svg.setAttribute(
      "viewBox",
      `${this.x - width / 2} ${this.y - height / 2} ${width} ${height}`,
    );
    this.graphic.dataset.camera = JSON.stringify(this.snapshot());
    const level = this.graphic.parentElement?.querySelector<HTMLElement>(
      "[data-concept-zoom-level]",
    );
    if (level) level.textContent = `${Math.round(this.scale * 100)}%`;
    this.graphic.dispatchEvent(new Event("concept-camera-change"));
  }
  private clamp(scale: number) {
    return Math.max(0.02, Math.min(4, scale));
  }
  private local(event: { clientX: number; clientY: number }): Point {
    const rect = this.graphic.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - this.graphic.clientLeft,
      y: event.clientY - rect.top - this.graphic.clientTop,
    };
  }
  private world(point: Point): Point {
    return {
      x: this.x + (point.x - this.graphic.clientWidth / 2) / this.scale,
      y: this.y + (point.y - this.graphic.clientHeight / 2) / this.scale,
    };
  }
  private pointerGeometry() {
    const values = [...this.pointers.values()];
    const a = values[0]!,
      b = values[1];
    return {
      point: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
    };
  }
  private beginGesture() {
    const { point, distance } = this.pointerGeometry();
    this.gesture = {
      point,
      world: this.world(point),
      scale: this.scale,
      distance,
    };
    this.dragged = false;
  }
}
