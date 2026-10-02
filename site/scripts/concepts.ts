import {
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutLabeledOverview,
  layoutConnection,
  neighborhood,
} from "../../shared/concept-graph.ts";
import { ConceptViewport, type ViewportState } from "./concept-viewport.ts";

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
    const page = complete
      ? map.closest<HTMLElement>(".concept-reference")
      : null;
    const directory = page?.querySelector<HTMLElement>(".concept-directory");
    const controls = map.querySelector<HTMLElement>("[data-concept-controls]")!;
    controls.hidden = false;
    const labels = map.querySelector<HTMLInputElement>(
      "[data-concept-labels]",
    )!;
    // Small graphs start with their propositions visible. This choice is local.
    labels.checked = !complete;
    const select = map.querySelector<HTMLSelectElement>("[data-concept-focus]");
    const search = page?.querySelector<HTMLInputElement>(
      "[data-concept-lookup-input]",
    );
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
    if (lookup) lookup.hidden = false;
    const params = complete ? new URLSearchParams(location.search) : null;
    const viewTabs = [
      ...map.querySelectorAll<HTMLButtonElement>("[data-concept-view]"),
    ];
    const graphPanel = map.querySelector<HTMLElement>(
      "[data-concept-graph-panel]",
    );
    const labelToggle = labels.closest<HTMLElement>(
      ".concept-map-label-toggle",
    );
    let presentation = params?.get("view") === "list" ? "list" : "graph";
    let needsFit = false;
    map
      .querySelector<HTMLElement>("[data-concept-view-switch]")
      ?.removeAttribute("hidden");
    if (graphPanel) {
      graphPanel.setAttribute("role", "tabpanel");
      graphPanel.setAttribute("aria-labelledby", viewTabs[0]!.id);
    }
    if (directory) {
      directory.setAttribute("role", "tabpanel");
      directory.setAttribute("aria-labelledby", viewTabs[1]!.id);
    }
    const graphic = map.querySelector<HTMLElement>(".concept-map-graphic")!;
    const svg = graphic.querySelector<SVGSVGElement>("svg")!;
    const viewport = complete ? new ConceptViewport(graphic, svg) : null;
    const navigation = map.querySelector<HTMLElement>(
      "[data-concept-navigation]",
    );
    if (navigation) navigation.hidden = false;
    let bounds = {
      width: Number(svg.dataset.width),
      height: Number(svg.dataset.height),
    };
    const expand = map.querySelector<HTMLButtonElement>(
      "[data-concept-expand]",
    );
    if (expand) expand.hidden = false;
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
        direction: edge.dataset.direction!,
        label: captions[index]!.dataset.label!,
      };
    });
    const status = map.querySelector<HTMLElement>("[data-concept-map-status]")!;
    let overviewVisible = complete;
    let labeledOverview = false;
    let isolatingGroup = false;
    let groupViewport: (ViewportState & { context: string }) | null = null;
    let graphPoints: { id: string; x: number; y: number }[] = [];
    let activeRelationships: typeof relationships = [];
    let hoveredNode = "";
    let focusedNode = "";
    let selectedNode = "";
    const practice = map.querySelector<HTMLDetailsElement>(
      ".concept-connection-practice",
    )!;
    const practiceLabels = practice.querySelector<HTMLButtonElement>(
      "[data-concept-practice-labels]",
    )!;
    practiceLabels.hidden = false;
    practiceLabels.addEventListener("click", () => {
      labels.checked = !labels.checked;
      update(true);
    });
    practice.addEventListener("toggle", () => previewConnections());

    function placeCaptions(positions: ReturnType<typeof layoutEdgeLabels>) {
      for (const position of positions) {
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

    function previewConnections() {
      if (!complete) return;
      for (const node of nodes)
        node.classList.toggle(
          "is-selected",
          node.dataset.conceptNode === selectedNode,
        );
      const id = focusedNode || hoveredNode || selectedNode;
      const incident =
        labels.checked || practice.open
          ? []
          : activeRelationships.filter(
              (relation) => relation.source === id || relation.target === id,
            );
      const shown = new Set(
        incident.map((relation) => `${relation.source} ${relation.target}`),
      );
      if (incident.length)
        placeCaptions(layoutEdgeLabels(graphPoints, incident, bounds));
      for (const [index, edge] of edges.entries()) {
        const previewed = shown.has(edge.dataset.conceptEdge!);
        edge.classList.toggle("is-previewed", previewed);
        captions[index]!.classList.toggle("is-previewed", previewed);
      }
    }
    if (complete)
      for (const node of nodes) {
        const id = node.dataset.conceptNode!;
        node.addEventListener("pointerenter", () => {
          hoveredNode = id;
          previewConnections();
        });
        node.addEventListener("pointerleave", () => {
          hoveredNode = "";
          previewConnections();
        });
        node.addEventListener("focus", () => {
          focusedNode = id;
          const point = graphPoints.find((point) => point.id === id);
          if (point) viewport?.reveal(point);
          previewConnections();
        });
        node.addEventListener("blur", () => {
          focusedNode = "";
          previewConnections();
        });
        node.addEventListener("click", () => {
          selectedNode = id;
          previewConnections();
        });
      }

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
        readingTitle ? "Concepts in this reading" : "Concepts and connections";
    }
    function clearFilters() {
      for (const control of [select, search, reading, group])
        if (control) control.value = "";
      groupViewport = null;
      isolatingGroup = false;
      selectedNode = "";
    }
    function zoom(width: number) {
      viewport?.zoom(width);
    }
    function fit() {
      if (!complete) return;
      viewport?.fit(overviewVisible ? Infinity : 640);
    }
    expand?.addEventListener("click", () => {
      const expanded = map.classList.toggle("is-expanded");
      expand.setAttribute("aria-pressed", String(expanded));
      expand.textContent = expanded ? "Restore graph size" : "Expand graph";
      // Expansion reveals more of the same view without losing its location.
      viewport?.render();
    });
    function update(preserveViewport = false) {
      if (complete) {
        for (const tab of viewTabs) {
          const active = tab.dataset.conceptView === presentation;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
        }
        graphPanel!.hidden = presentation !== "graph";
        directory!.hidden = presentation !== "list";
        if (expand) expand.hidden = presentation !== "graph";
        if (labelToggle) labelToggle.hidden = presentation !== "graph";
        map.classList.toggle("is-list-view", presentation === "list");
        if (presentation === "list") {
          hoveredNode = "";
          focusedNode = "";
        }
      }
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
      if (onlyGroup && !isolatingGroup && viewport) {
        groupViewport = {
          ...viewport.snapshot(),
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
      if (!visible.has(selectedNode)) selectedNode = "";
      const members = new Set(
        visibleNodes
          .filter((node) => node.dataset.group === groupName)
          .map((node) => node.dataset.conceptNode!),
      );
      overviewVisible =
        complete && !focus && !query && !reading?.value && !onlyGroup;
      labeledOverview = overviewVisible && labels.checked;
      map.classList.toggle("has-connection-labels", labels.checked);
      practiceLabels.textContent = labels.checked
        ? "Hide labels to try"
        : "Compare with the labels";
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
      activeRelationships = [];
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
        const start = points.get(relation.source) || {
            x: Number(a.dataset.x),
            y: Number(a.dataset.y),
          },
          end = points.get(relation.target) || {
            x: Number(b.dataset.x),
            y: Number(b.dataset.y),
          };
        const connection = layoutConnection(start, end);
        for (const key of ["x1", "y1", "x2", "y2"] as const)
          line.setAttribute(key, String(connection[key]));
        edge
          .querySelector("[data-concept-arrow]")
          ?.setAttribute(
            "transform",
            `translate(${connection.x2} ${connection.y2}) rotate(${connection.angle})`,
          );
      }
      graphPoints = visibleNodes.map(
        (node) =>
          points.get(node.dataset.conceptNode!) || {
            id: node.dataset.conceptNode!,
            x: Number(node.dataset.x),
            y: Number(node.dataset.y),
          },
      );
      if (labels.checked) {
        placeCaptions(
          layoutEdgeLabels(
            graphPoints,
            activeRelationships,
            layout || {
              width: Number(svg.dataset.width),
              height: Number(svg.dataset.height),
            },
            focus,
          ),
        );
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
      bounds = {
        width: layout?.width ?? Number(svg.dataset.width),
        height: layout?.height ?? Number(svg.dataset.height),
      };
      if (viewport) viewport.setBounds(bounds);
      else svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      previewConnections();
      graphic.hidden = visible.size === 0;
      if (navigation) navigation.hidden = visible.size === 0;
      if (groupHelp)
        groupHelp.textContent = !groupName
          ? "Choose a group to highlight its members in context."
          : onlyGroup
            ? `Showing ${members.size} ${groupName} concepts. Connections to other groups are hidden.`
            : members.size
              ? `${members.size} ${groupName} concepts highlighted. ${presentation === "list" ? "Marked cards are group members; other concepts remain available." : "Filled nodes are members; dashed lines connect to other groups."}`
              : `No ${groupName} concepts in this view. Clear the search or choose another reading to find members.`;
      status.textContent =
        visible.size === 0
          ? "No topics match. Clear the search or reset the view."
          : focus
            ? `${nodes.find((node) => node.dataset.conceptNode === focus)!.dataset.title} · ${count} connections`
            : `${visible.size} concepts · ${count} connections${groupName ? ` · ${onlyGroup ? `${groupName} only` : `${members.size} ${groupName} highlighted`}` : ""}${reading?.value ? ` · ${reading.selectedOptions[0]!.textContent}` : ""}`;
      if (complete && restoreGroupViewport) {
        viewport!.restore(restoreGroupViewport);
        groupViewport = null;
      } else if (complete && !preserveViewport) {
        if (presentation === "list") needsFit = true;
        else if (overviewVisible) {
          viewport!.x = bounds.width / 2;
          viewport!.y = bounds.height / 2;
          viewport!.readable();
        } else fit();
      }
      if (complete && presentation === "graph" && needsFit) {
        fit();
        needsFit = false;
      }
      if (complete) {
        const url = new URL(location.href);
        let view = "";
        if (explorer?.open) {
          if (presentation === "list") view = location.hash ? "" : "list";
          else if (
            location.hash ||
            !(focus || query || reading?.value || groupName)
          )
            view = "all";
        }
        for (const [key, value] of [
          ["view", view],
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
      if (
        target &&
        directory?.contains(target) &&
        params?.get("view") !== "all"
      ) {
        presentation = "list";
        clearFilters();
      }
      explorer.open = Boolean(
        search?.value ||
        select?.value ||
        reading?.value ||
        group?.value ||
        params?.get("view") === "all" ||
        params?.get("view") === "list" ||
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
      lookup?.addEventListener("submit", (event) => {
        event.preventDefault();
        explorer.open = true;
        update(true);
        if (explorer.open) explorer.scrollIntoView({ block: "start" });
      });
      window.addEventListener("hashchange", () => {
        const target = document.getElementById(location.hash.slice(1));
        if (!target || !directory?.contains(target)) return;
        presentation = "list";
        clearFilters();
        explorer.open = true;
        update();
        const item = target.closest<HTMLDetailsElement>(
          ".concept-directory-item",
        );
        if (item) item.open = true;
        target.scrollIntoView({ block: "start" });
      });
    }
    for (const [index, tab] of viewTabs.entries()) {
      const activate = (next: HTMLButtonElement) => {
        presentation = next.dataset.conceptView!;
        update(true);
        next.focus({ preventScroll: true });
      };
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", (event) => {
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % viewTabs.length
            : event.key === "ArrowLeft"
              ? (index + viewTabs.length - 1) % viewTabs.length
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? viewTabs.length - 1
                  : -1;
        if (next === -1) return;
        event.preventDefault();
        activate(viewTabs[next]!);
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
        if (
          control === search &&
          explorer &&
          !explorer.open &&
          search?.value.trim()
        ) {
          explorer.open = true;
          if (tools) tools.open = false;
        }
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
        else if (action === "readable") viewport?.readable();
        else zoom(viewport!.width * (action === "in" ? 1.25 : 0.8));
      });
    graphic.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        selectedNode = "";
        focusedNode = "";
        hoveredNode = "";
        previewConnections();
      }
    });
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
