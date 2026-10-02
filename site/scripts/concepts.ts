import {
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutLabeledOverview,
  labeledOverviewScale,
  neighborhood,
} from "../../shared/concept-graph.ts";

(() => {
  const agentUrl = document.querySelector<HTMLInputElement>(
    "[data-concept-agent-url]",
  );
  const copyGuide = document.querySelector<HTMLButtonElement>(
    "[data-concept-agent-copy]",
  );
  const copyStatus = document.querySelector<HTMLElement>(
    "[data-concept-agent-status]",
  );
  if (agentUrl && copyGuide && copyStatus) {
    copyGuide.hidden = false;
    copyGuide.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(agentUrl.value);
        copyStatus.textContent = "Guide URL copied. Give it to your agent.";
      } catch {
        agentUrl.focus();
        agentUrl.select();
        copyStatus.textContent = "The URL is selected. Copy it to your agent.";
      }
    });
  }
  function initializeGraph(map: HTMLElement) {
    const complete = map.dataset.complete === "true";
    const fixedFocus = map.dataset.focus || "";
    const directory = complete
      ? map
          .closest(".concept-reference")
          ?.querySelector<HTMLElement>(".concept-directory")
      : null;
    const refine = directory?.querySelector<HTMLElement>(
      "[data-concept-refine]",
    );
    if (refine) refine.hidden = false;
    const controls = map.querySelector<HTMLElement>("[data-concept-controls]")!;
    controls.hidden = false;
    const labels = map.querySelector<HTMLInputElement>(
      "[data-concept-labels]",
    )!;
    // A newly opened graph starts uncluttered, including clones of other views.
    labels.checked = false;
    const select = map.querySelector<HTMLSelectElement>("[data-concept-focus]");
    const search = map.querySelector<HTMLInputElement>("[data-concept-search]");
    const reading = map.querySelector<HTMLSelectElement>(
      "[data-concept-reading]",
    );
    const group = map.querySelector<HTMLSelectElement>("[data-concept-group]");
    const groupModes = [
      ...map.querySelectorAll<HTMLInputElement>("[data-concept-group-mode]"),
    ];
    const groupControls = map.querySelector<HTMLFieldSetElement>(
      "[data-concept-group-controls]",
    );
    const groupHelp = map.querySelector<HTMLElement>(
      "[data-concept-group-help]",
    );
    const page = complete
      ? map.closest<HTMLElement>(".concept-reference")
      : null;
    const explorer = page?.querySelector<HTMLDetailsElement>(
      "[data-concept-explorer]",
    );
    const tools = map.querySelector<HTMLDetailsElement>(
      "[data-concept-map-tools]",
    );
    if (tools) tools.hidden = false;
    const lookup = page?.querySelector<HTMLFormElement>(
      "[data-concept-lookup]",
    );
    const lookupInput = lookup?.querySelector<HTMLInputElement>(
      "[data-concept-lookup-input]",
    );
    if (lookup) lookup.hidden = false;
    const params = complete ? new URLSearchParams(location.search) : null;
    const graphic = map.querySelector<HTMLElement>(".concept-map-graphic")!;
    const svg = graphic.querySelector<SVGSVGElement>("svg")!;
    const nodes = [...map.querySelectorAll<SVGAElement>("[data-concept-node]")];
    const edges = [...map.querySelectorAll<SVGGElement>("[data-concept-edge]")];
    const captions = [
      ...map.querySelectorAll<SVGGElement>("[data-concept-edge-label]"),
    ];
    const relationships = edges.map((edge, index) => {
      const [source, target] = edge.dataset.conceptEdge!.split(" ");
      return {
        source: source!,
        target: target!,
        label: captions[index]!.dataset.label!,
      };
    });
    const status = map.querySelector<HTMLElement>("[data-concept-map-status]")!;
    let overviewVisible = complete;
    let labeledOverview = false;
    let zoomWidth = 0;
    let isolatingGroup = false;
    let groupViewport: {
      width: number;
      left: number;
      top: number;
      viewWidth: number;
      viewHeight: number;
      context: string;
    } | null = null;

    function updateContext(size: number) {
      if (!page || !explorer) return;
      const context = page.querySelector<HTMLElement>(
        "[data-concept-context]",
      )!;
      const title = context.querySelector<HTMLElement>(
        "[data-concept-context-title]",
      )!;
      const label = context.querySelector<HTMLElement>(
        "[data-concept-context-label]",
      )!;
      const prompt = context.querySelector<HTMLElement>(
        "[data-concept-context-prompt]",
      )!;
      const link = context.querySelector<HTMLAnchorElement>(
        "[data-concept-context-reading]",
      )!;
      const query = search?.value.trim() || "";
      const readingTitle = reading?.value
        ? reading.selectedOptions[0]!.textContent!
        : "";
      const focusedTitle = select?.selectedOptions[0]?.textContent || "";
      context.hidden = !(
        query ||
        readingTitle ||
        select?.value ||
        group?.value
      );
      label.textContent = readingTitle
        ? "From your reading"
        : "Your exploration";
      title.textContent =
        readingTitle ||
        (query
          ? `Results for “${query}”`
          : select?.value
            ? focusedTitle
            : group?.value || "");
      const reflection = readingTitle
        ? reading!.selectedOptions[0]!.dataset.prompt
        : "";
      prompt.textContent = reflection
        ? `Before you explore: ${reflection}`
        : "";
      prompt.hidden = !reflection;
      link.hidden = !readingTitle;
      link.href = reading?.value || "/concepts/";
      link.textContent = `Continue in ${readingTitle} →`;
      page.querySelector<HTMLElement>(
        "[data-concept-explorer-title]",
      )!.textContent = readingTitle
        ? "Explore this reading"
        : context.hidden
          ? "Explore the whole book"
          : "Explore these concepts";
      page.querySelector<HTMLElement>(
        "[data-concept-explorer-description]",
      )!.textContent =
        `${size} concepts${context.hidden ? " and their connections" : " in this view"}`;
      map.querySelector<HTMLElement>(".concept-map-heading h2")!.textContent =
        readingTitle
          ? "Connections in this reading"
          : "The complete concept graph";
      if (lookupInput) lookupInput.value = search?.value || "";
    }
    function clearFilters() {
      for (const control of [select, search, reading, group])
        if (control) control.value = "";
      groupViewport = null;
      isolatingGroup = false;
    }
    function zoom(width: number) {
      zoomWidth = Math.max(240, Math.min(5000, width));
      svg.style.width = `${zoomWidth}px`;
    }
    function fit() {
      if (!complete) return;
      const bounds = svg.viewBox.baseVal;
      zoom(
        Math.min(
          graphic.clientWidth || 440,
          (graphic.clientHeight * bounds.width) / bounds.height,
          overviewVisible ? 5000 : 640,
        ),
      );
    }
    function update(preserveViewport = false) {
      const focus = select?.value || fixedFocus;
      const query = search?.value.trim().toLowerCase() || "";
      const groupName = group?.value || "";
      if (!groupName && groupModes[0]) groupModes[0].checked = true;
      const onlyGroup = Boolean(
        groupName && groupModes.find((mode) => mode.checked)?.value === "only",
      );
      const highlightingGroup = Boolean(groupName && !onlyGroup);
      const context = `${query}\n${reading?.value || ""}`;
      const restoreGroupViewport =
        isolatingGroup && !onlyGroup && groupViewport?.context === context
          ? groupViewport
          : null;
      if (onlyGroup && !isolatingGroup && zoomWidth) {
        groupViewport = {
          width: zoomWidth,
          left: graphic.scrollLeft,
          top: graphic.scrollTop,
          viewWidth: svg.viewBox.baseVal.width,
          viewHeight: svg.viewBox.baseVal.height,
          context,
        };
      }
      isolatingGroup = onlyGroup;
      if (groupControls) groupControls.disabled = !groupName;
      map.classList.toggle("is-highlighting-group", highlightingGroup);
      const readingIds = reading?.value
        ? new Set(reading.selectedOptions[0]!.dataset.ids!.split(" "))
        : null;
      const focused = focus ? neighborhood(focus, relationships) : null;
      const visibleNodes = nodes.filter((node) =>
        focused
          ? focused.has(node.dataset.conceptNode!)
          : (!readingIds || readingIds.has(node.dataset.conceptNode!)) &&
            (!onlyGroup || groupName === node.dataset.group) &&
            (!query || node.dataset.search!.includes(query)),
      );
      const visible = new Set(
        visibleNodes.map((node) => node.dataset.conceptNode!),
      );
      const members = new Set(
        visibleNodes
          .filter((node) => node.dataset.group === groupName)
          .map((node) => node.dataset.conceptNode!),
      );
      overviewVisible =
        complete && !focus && !query && !reading?.value && !onlyGroup;
      const wasLabeledOverview = labeledOverview;
      labeledOverview = overviewVisible && labels.checked;
      map.classList.toggle("has-connection-labels", labels.checked);
      const layout = overviewVisible
        ? labeledOverview
          ? layoutLabeledOverview(
              nodes.map((node) => ({
                id: node.dataset.conceptNode!,
                x: Number(node.dataset.x),
                y: Number(node.dataset.y),
              })),
              Number(svg.dataset.width),
              Number(svg.dataset.height),
            )
          : null
        : layoutNeighborhood([...visible], focus, labels.checked);
      const points = new Map(
        layout?.points.map((point) => [point.id, point]) || [],
      );
      for (const node of nodes) {
        const id = node.dataset.conceptNode!;
        const shown = visible.has(id);
        node.classList.toggle("is-hidden", !shown);
        node.setAttribute("aria-hidden", String(!shown));
        node.setAttribute("tabindex", shown ? "0" : "-1");
        node.classList.toggle("is-current", id === focus);
        node.classList.toggle("is-group-member", members.has(id));
        node.classList.toggle(
          "is-group-context",
          highlightingGroup && !members.has(id),
        );
        if (members.has(id) && groupHelp)
          node.setAttribute("aria-describedby", groupHelp.id);
        else node.removeAttribute("aria-describedby");
        const point = points.get(id);
        node
          .querySelector("g")!
          .setAttribute(
            "transform",
            `translate(${point?.x ?? node.dataset.x} ${point?.y ?? node.dataset.y})`,
          );
      }
      let count = 0;
      const activeRelationships: typeof relationships = [];
      for (const [index, edge] of edges.entries()) {
        const relation = relationships[index]!;
        const active =
          visible.has(relation.source) &&
          visible.has(relation.target) &&
          (!focus || relation.source === focus || relation.target === focus);
        edge.classList.toggle("is-hidden", !active);
        captions[index]!.classList.toggle("is-hidden", !active);
        edge.classList.toggle("is-related", Boolean(focus) && active);
        const withinGroup =
          members.has(relation.source) && members.has(relation.target);
        const groupBridge =
          !withinGroup &&
          (members.has(relation.source) || members.has(relation.target));
        for (const element of [edge, captions[index]!]) {
          element.classList.toggle("is-group-edge", withinGroup);
          element.classList.toggle("is-group-bridge", groupBridge);
        }
        if (!active) continue;
        count++;
        activeRelationships.push(relation);
        const a = nodes.find(
          (node) => node.dataset.conceptNode === relation.source,
        )!;
        const b = nodes.find(
          (node) => node.dataset.conceptNode === relation.target,
        )!;
        const line = edge.querySelector("line")!;
        const start = points.get(relation.source),
          end = points.get(relation.target);
        line.setAttribute("x1", String(start?.x ?? a.dataset.x));
        line.setAttribute("y1", String(start?.y ?? a.dataset.y));
        line.setAttribute("x2", String(end?.x ?? b.dataset.x));
        line.setAttribute("y2", String(end?.y ?? b.dataset.y));
      }
      if (labels.checked) {
        const graphPoints = visibleNodes.map(
          (node) =>
            points.get(node.dataset.conceptNode!) || {
              id: node.dataset.conceptNode!,
              x: Number(node.dataset.x),
              y: Number(node.dataset.y),
            },
        );
        const captionPositions = layoutEdgeLabels(
          graphPoints,
          activeRelationships,
          layout || {
            width: Number(svg.dataset.width),
            height: Number(svg.dataset.height),
          },
          focus,
        );
        for (const position of captionPositions) {
          const caption = captions.find(
            (item) =>
              item.dataset.conceptEdgeLabel ===
              `${position.source} ${position.target}`,
          )!;
          caption.setAttribute(
            "transform",
            `translate(${position.x} ${position.y})`,
          );
          caption
            .querySelector("line")!
            .setAttribute("x2", String(position.anchorX - position.x));
          caption
            .querySelector("line")!
            .setAttribute("y2", String(position.anchorY - position.y));
        }
      }
      for (const row of map.querySelectorAll<HTMLElement>(
        "[data-concept-relation]",
      )) {
        const ids = row.dataset.conceptRelation!.split(" ");
        row.hidden =
          !ids.every((id) => visible.has(id)) ||
          Boolean(focus && !ids.includes(focus));
      }
      for (const row of directory?.querySelectorAll<HTMLElement>(
        "[data-concept-result]",
      ) || []) {
        const id = row.dataset.conceptResult!;
        row.hidden = !visible.has(id);
        row.classList.toggle("is-group-member", members.has(id));
        const tag = row.querySelector<HTMLElement>("[data-concept-group-tag]");
        if (tag) tag.hidden = !highlightingGroup || !members.has(id);
      }
      const directoryCount = directory?.querySelector<HTMLElement>(
        "[data-concept-directory-count]",
      );
      if (directoryCount)
        directoryCount.textContent = `${visible.size} of ${nodes.length} topics in this view`;
      const empty = directory?.querySelector<HTMLElement>(
        "[data-concept-empty]",
      );
      if (empty) empty.hidden = visible.size !== 0;
      updateContext(visible.size);
      svg.setAttribute(
        "viewBox",
        `0 0 ${layout?.width ?? svg.dataset.width} ${layout?.height ?? svg.dataset.height}`,
      );
      graphic.hidden = visible.size === 0;
      if (groupHelp)
        groupHelp.textContent = !groupName
          ? "Choose a group to highlight its members in context."
          : onlyGroup
            ? `Showing ${members.size} ${groupName} concepts. Connections to other groups are hidden.`
            : members.size
              ? `${members.size} ${groupName} concepts highlighted. Filled nodes are members; dashed lines connect to other groups.`
              : `No ${groupName} concepts in this view. Clear the search or choose another reading to find members.`;
      status.textContent =
        visible.size === 0
          ? "No topics match. Clear the search or reset the view."
          : focus
            ? `${nodes.find((node) => node.dataset.conceptNode === focus)!.dataset.title} · ${count} connections`
            : `${visible.size} concepts · ${count} connections${groupName ? ` · ${onlyGroup ? `${groupName} only` : `${members.size} ${groupName} highlighted`}` : ""}${reading?.value ? ` · ${reading.selectedOptions[0]!.textContent}` : ""}`;
      if (
        complete &&
        preserveViewport &&
        labeledOverview !== wasLabeledOverview
      ) {
        const scale = labeledOverview
          ? labeledOverviewScale
          : 1 / labeledOverviewScale;
        const left =
          (graphic.scrollLeft + graphic.clientWidth / 2) * scale -
          graphic.clientWidth / 2;
        const top =
          (graphic.scrollTop + graphic.clientHeight / 2) * scale -
          graphic.clientHeight / 2;
        zoom(zoomWidth * scale);
        graphic.scrollLeft = left;
        graphic.scrollTop = top;
      }
      if (complete && restoreGroupViewport) {
        const saved = restoreGroupViewport;
        const bounds = svg.viewBox.baseVal;
        zoom((saved.width * bounds.width) / saved.viewWidth);
        graphic.scrollLeft =
          ((saved.left + graphic.clientWidth / 2) * zoomWidth) / saved.width -
          graphic.clientWidth / 2;
        const oldHeight = (saved.width * saved.viewHeight) / saved.viewWidth;
        const newHeight = (zoomWidth * bounds.height) / bounds.width;
        graphic.scrollTop =
          ((saved.top + graphic.clientHeight / 2) * newHeight) / oldHeight -
          graphic.clientHeight / 2;
        groupViewport = null;
      } else if (complete && !preserveViewport) {
        graphic.scrollTop = 0;
        graphic.scrollLeft = 0;
        if (overviewVisible)
          zoom(
            Math.max(graphic.clientWidth, 1000) *
              (labeledOverview ? labeledOverviewScale : 1),
          );
        else fit();
      }
      if (complete) {
        const url = new URL(location.href);
        for (const [key, value] of [
          [
            "view",
            explorer?.open &&
            !focus &&
            !query &&
            !reading?.value &&
            !groupName &&
            !location.hash
              ? "all"
              : "",
          ],
          ["topic", focus],
          ["q", query],
          ["reading", reading?.value],
          ["theme", group?.value],
          ["group-view", groupName ? (onlyGroup ? "only" : "highlight") : ""],
        ] as const) {
          if (value) url.searchParams.set(key, value);
          else url.searchParams.delete(key);
        }
        history.replaceState(history.state, "", url);
      }
    }
    labels.addEventListener("change", () => update(true));
    if (search) search.value = params?.get("q") || "";
    for (const [control, parameter] of [
      [select, "topic"],
      [reading, "reading"],
      [group, "theme"],
    ] as const) {
      const value = params?.get(parameter);
      if (
        control &&
        value &&
        [...control.options].some((option) => option.value === value)
      )
        control.value = value;
    }
    if (params?.get("group-view") === "only" && groupModes[1])
      groupModes[1].checked = true;
    if (explorer) {
      const target = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;
      explorer.open = Boolean(
        search?.value ||
        select?.value ||
        reading?.value ||
        group?.value ||
        params?.get("view") === "all" ||
        (target && explorer.contains(target)),
      );
      if (tools) tools.open = !(reading?.value || search?.value);
      explorer.addEventListener("toggle", () => {
        if (!explorer.open) clearFilters();
        update();
      });
      page!
        .querySelector("[data-concept-all]")
        ?.addEventListener("click", () => {
          clearFilters();
          if (tools) tools.open = true;
          update();
          map
            .querySelector<HTMLElement>(".concept-map-heading h2")!
            .setAttribute("tabindex", "-1");
          map
            .querySelector<HTMLElement>(".concept-map-heading h2")!
            .focus({ preventScroll: true });
        });
      const lookupConcepts = () => {
        const query = lookupInput?.value || "";
        clearFilters();
        if (search) search.value = query;
        explorer.open = Boolean(query.trim());
        if (tools) tools.open = false;
        update();
      };
      lookupInput?.addEventListener("input", lookupConcepts);
      lookup?.addEventListener("submit", (event) => {
        event.preventDefault();
        lookupConcepts();
        if (explorer.open) explorer.scrollIntoView({ block: "start" });
      });
    }
    select?.addEventListener("change", () => {
      if (select.value) {
        if (search) search.value = "";
        if (reading) reading.value = "";
        if (group) group.value = "";
      }
      groupViewport = null;
      isolatingGroup = false;
      update();
    });
    for (const control of [search, reading])
      control?.addEventListener(control === search ? "input" : "change", () => {
        if (select) select.value = "";
        update();
      });
    group?.addEventListener("change", () => {
      const wasFocused = Boolean(select?.value);
      if (select) select.value = "";
      update(!wasFocused && !isolatingGroup);
    });
    for (const mode of groupModes)
      mode.addEventListener("change", () => update());
    map.querySelector("[data-concept-reset]")?.addEventListener("click", () => {
      clearFilters();
      update();
    });
    for (const button of map.querySelectorAll<HTMLElement>(
      "[data-concept-zoom]",
    ))
      button.addEventListener("click", () => {
        const action = button.dataset.conceptZoom;
        if (action === "fit") fit();
        else zoom(zoomWidth * (action === "in" ? 1.25 : 0.8));
      });
    let drag: { x: number; y: number; left: number; top: number } | null = null;
    graphic.addEventListener("pointerdown", (event) => {
      if (
        !complete ||
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        (event.target instanceof Element && event.target.closest("a"))
      )
        return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        left: graphic.scrollLeft,
        top: graphic.scrollTop,
      };
      graphic.setPointerCapture(event.pointerId);
      graphic.classList.add("is-dragging");
    });
    graphic.addEventListener("pointermove", (event) => {
      if (!drag) return;
      graphic.scrollLeft = drag.left - (event.clientX - drag.x);
      graphic.scrollTop = drag.top - (event.clientY - drag.y);
    });
    const stopDrag = () => {
      drag = null;
      graphic.classList.remove("is-dragging");
    };
    graphic.addEventListener("pointerup", stopDrag);
    graphic.addEventListener("pointercancel", stopDrag);
    graphic.addEventListener("lostpointercapture", stopDrag);
    update();
  }

  for (const map of document.querySelectorAll<HTMLElement>(
    "[data-concept-map]",
  ))
    initializeGraph(map);
  if (typeof HTMLDialogElement === "undefined") return;
  const pane = document.createElement("dialog");
  if (typeof pane.showModal !== "function") return;
  pane.className = "concept-pane";
  pane.innerHTML = `<header class="concept-pane-header"><span>Concept reference</span><button type="button" aria-label="Close concept reference">Close ×</button></header><div class="concept-pane-content"></div><footer><a data-concept-page>Open reference page →</a></footer>`;
  document.body.append(pane);
  const content = pane.querySelector<HTMLElement>(".concept-pane-content")!;
  const reference = pane.querySelector<HTMLAnchorElement>(
    "[data-concept-page]",
  )!;
  let opener: HTMLElement | SVGAElement | null = null;
  let previousOverflow = "";
  let libraryPromise: Promise<DocumentFragment> | undefined;
  let request = 0;

  function library(): Promise<DocumentFragment> {
    if (document.querySelector(".concept-reference")) {
      const fragment = document.createDocumentFragment();
      for (const card of document.querySelectorAll(
        ".concept-directory [data-concept-card]",
      ))
        fragment.append(card.cloneNode(true));
      return Promise.resolve(fragment);
    }
    return (libraryPromise ??= fetch("/concepts/library.html")
      .then(async (response) => {
        if (!response.ok) throw new Error("Concept reference unavailable");
        const template = document.createElement("template");
        template.innerHTML = await response.text();
        const source = template.content.querySelector<HTMLTemplateElement>(
          "[data-concept-library]",
        );
        if (!source) throw new Error("Invalid concept reference");
        return source.content;
      })
      .catch((error) => {
        libraryPromise = undefined;
        throw error;
      }));
  }

  const surface =
    ".chapter-main, .case-study-main, .project-main, .concept-reference, .concept-pane";
  for (const link of document.querySelectorAll('main a[href^="/concepts/#"]')) {
    link.classList.add("concept-link");
    link.setAttribute("aria-haspopup", "dialog");
  }
  for (const summary of document.querySelectorAll("[data-concept-select]"))
    summary.setAttribute("aria-haspopup", "dialog");
  document.addEventListener("click", async (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLElement | SVGAElement>(
            "[data-concept-select], a",
          )
        : null;
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.getAttribute("target") && link.getAttribute("target") !== "_self")
    )
      return;
    if (link.hasAttribute("data-concept-page")) {
      pane.close();
      return;
    }
    if (!link.closest(surface)) return;
    const href = link.hasAttribute("data-concept-select")
      ? `/concepts/#${link.dataset.conceptSelect}`
      : link.getAttribute("href");
    if (!href) return;
    const url = new URL(href, location.href);
    const id =
      url.origin === location.origin && url.pathname === "/concepts/"
        ? url.hash.slice(1)
        : "";
    if (!/^[a-z-]+$/.test(id)) {
      if (link.closest(".concept-pane")) pane.close();
      return;
    }
    event.preventDefault();
    const currentRequest = ++request;
    let source: HTMLElement | null;
    try {
      source = (await library()).querySelector<HTMLElement>(
        `[data-concept-card="${CSS.escape(id)}"]`,
      );
    } catch {
      if (currentRequest === request) location.assign(url.href);
      return;
    }
    if (currentRequest !== request) return;
    if (!source) {
      location.assign(url.href);
      return;
    }
    content.replaceChildren(source.cloneNode(true));
    const card = content.querySelector<HTMLElement>(".concept-card")!;
    card.id = `pane-concept-${id}`;
    const title = card.querySelector<HTMLElement>("h2")!;
    title.id = `pane-concept-${id}-title`;
    card.setAttribute("aria-labelledby", title.id);
    // Namespaced heading IDs keep the pane distinct from the static reference.
    const definition = card.querySelector(".concept-passages > div")!;
    const intro = document.createElement("dl");
    intro.className = "concept-passages";
    intro.append(definition);
    const usage = card.querySelector("[data-concept-usage]");
    if (usage) intro.append(usage);
    const graph = card.querySelector<HTMLElement>("[data-concept-map]")!;
    card.querySelector(".concept-neighborhood")!.remove();
    title.after(intro, graph);
    initializeGraph(graph);
    pane.setAttribute("aria-labelledby", title.id);
    reference.href = `/concepts/#${id}`;
    if (!pane.open) {
      opener = link;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      pane.showModal();
    }
    pane.scrollTop = 0;
    title.focus({ preventScroll: true });
  });
  pane.querySelector("button")!.addEventListener("click", () => pane.close());
  pane.addEventListener("click", (event) => {
    if (event.target !== pane) return;
    const rect = pane.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      pane.close();
  });
  pane.addEventListener("close", () => {
    request++;
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
})();
