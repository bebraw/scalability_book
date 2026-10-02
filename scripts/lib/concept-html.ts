import {
  concepts,
  conceptGroups,
  type Concept,
} from "../../shared/concepts.ts";
import { conceptPages } from "../../shared/concept-pages.ts";
import {
  conceptRelationships,
  type ConceptRelationship,
} from "../../shared/concept-relationships.ts";
import {
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutOverview,
  layoutLabeledOverview,
  layoutConnection,
  neighborhood,
} from "../../shared/concept-graph.ts";
import { escapeAttribute, escapeHtml } from "./text.ts";
import { learningResources } from "../../shared/learning-resources.ts";
import { explorations, explorationUrl } from "../../shared/explorations.ts";

const overview = layoutOverview(concepts, conceptRelationships, conceptGroups);
const byId = new Map(concepts.map((concept) => [concept.id, concept]));
const conceptLink = (concept: Concept) =>
  `<a href="/concepts/#${concept.id}">${escapeHtml(concept.title)}</a>`;

function renderProposition(relation: ConceptRelationship, current = "") {
  const endpoint = (id: string) => {
    const concept = byId.get(id)!;
    return id === current ? escapeHtml(concept.title) : conceptLink(concept);
  };
  const label = `<span class="concept-relationship-label">${escapeHtml(relation.label)}</span>`;
  return relation.direction === "directed"
    ? `${endpoint(relation.source)} ${label} <span aria-hidden="true">→</span> ${endpoint(relation.target)}`
    : `${endpoint(relation.source)} <span aria-hidden="true">—</span> ${endpoint(relation.target)} ${label}`;
}

export function renderConceptIndex(url = ""): string {
  const page = conceptPages.find((page) => page.url === url);
  const items = page ? page.concepts.map((id) => byId.get(id)!) : concepts;
  if (items.some((item) => !item)) throw new Error(`Unknown concept in ${url}`);
  return `<nav class="concept-index" aria-label="Concepts in this reading">
  <p class="concept-index-label">Follow an idea</p>
  <p>Revisit a definition, compare examples, or check a common mistake.</p>
  <ul>${items.map((concept) => `<li>${conceptLink(concept)}</li>`).join("")}</ul>
  ${page?.prompt ? `<p class="concept-connection-prompt"><strong>Try a connection.</strong> ${escapeHtml(page.prompt)}</p>` : ""}
  <details class="concept-map-disclosure"><summary>Explore concept connections</summary>${renderConceptGraph(
    "chapter-concepts",
    items.map((item) => item.id),
  )}</details>
  <a class="concept-reference-link" href="/concepts/${page ? `?reading=${encodeURIComponent(page.url)}` : "?view=all"}">Explore these topics together →</a>
</nav>`;
}

export function attachConceptIndex(content: string, url: string): string {
  if (!conceptPages.some((page) => page.url === url)) return content;
  const index = renderConceptIndex(url);
  const position = content.indexOf("<h2");
  return position < 0
    ? `${content}${index}`
    : `${content.slice(0, position)}${index}${content.slice(position)}`;
}

function renderConceptCard(concept: Concept): string {
  const sections = [
    ["Definition", concept.definition],
    ["Assumptions", concept.assumptions],
    ["Worked example", concept.example],
    ["Common mistake", concept.misconception],
  ];
  const usage = concept.usage
    ? `<div data-concept-usage><dt>Usage in this book</dt><dd>${escapeHtml(concept.usage.note)}${concept.usage.sources?.length ? `<ul>${concept.usage.sources.map((source) => `<li><a href="${escapeAttribute(source.href)}">${escapeHtml(source.label)}</a></li>`).join("")}</ul>` : ""}</dd></div>`
    : "";
  const related = conceptRelationships.filter(
    (relation) =>
      relation.source === concept.id || relation.target === concept.id,
  );
  const readings = conceptPages.filter((page) =>
    page.concepts.includes(concept.id),
  );
  const resources = learningResources.filter(
    (resource) =>
      resource.id !== "graph-complete" &&
      resource.conceptIds.includes(concept.id),
  );
  const activities = explorations.filter((activity) =>
    activity.conceptIds.includes(concept.id),
  );
  return `<section class="concept-card" id="${concept.id}" data-concept-card="${concept.id}" aria-labelledby="concept-${concept.id}-title">
  <p class="concept-card-group">${concept.group}</p><h2 id="concept-${concept.id}-title" tabindex="-1">${escapeHtml(concept.title)}</h2>
  <dl class="concept-passages">${sections.map(([label, text], index) => `<div><dt>${label}</dt><dd>${escapeHtml(text)}</dd></div>${index === 0 ? usage : ""}`).join("")}</dl>
  <details class="concept-neighborhood"><summary>Explore this topic's connections</summary>${renderConceptGraph(`topic-${concept.id}`, [...neighborhood(concept.id, conceptRelationships)], concept.id)}</details>
  <details class="concept-learning-resources"><summary>Diagrams and experiments (${resources.length})</summary><ul>${resources.map((resource) => `<li><a href="${escapeAttribute(resource.url)}">${escapeHtml(resource.title)}</a><p>${escapeHtml(resource.caption)}</p><p><a href="${resource.images.png}">${resource.kind === "demo" ? "Static preview" : "Image (PNG)"}</a>${resource.images.svg ? ` · <a href="${resource.images.svg}">Vector image (SVG)</a>` : ""}</p>${resource.experiment ? `<p><strong>Predict first.</strong> ${escapeHtml(resource.experiment.predict)}</p>` : ""}</li>`).join("")}</ul></details>
  <h3>Follow the idea</h3>
  ${activities.length ? `<details class="concept-learning-resources"><summary>Explore through a course task (${activities.length})</summary><ul>${activities.map((activity) => `<li><a href="${explorationUrl(activity.id)}">${escapeHtml(activity.title)}</a><p>${escapeHtml(activity.summary)}</p></li>`).join("")}</ul></details>` : ""}
  <ul class="concept-contexts">${concept.contexts.map((context) => `<li><a href="${escapeAttribute(context.href)}">${escapeHtml(context.label)}</a><p>${escapeHtml(context.description)}</p></li>`).join("")}</ul>
  <h3>Connect the concepts</h3>
  <ul class="concept-relationships">${related
    .map((relation) => {
      const relatedId =
        relation.source === concept.id ? relation.target : relation.source;
      const target = byId.get(relatedId);
      if (!target) throw new Error(`Unknown related concept: ${relatedId}`);
      return `<li>${renderProposition(relation, concept.id)}<p>${escapeHtml(relation.explanation)}</p></li>`;
    })
    .join("")}</ul>
  <details class="concept-reading-locations"><summary>Find this idea across the book (${readings.length})</summary><ul>${readings.map((page) => `<li><a href="${page.url}">${escapeHtml(page.title)}</a></li>`).join("")}</ul></details>
</section>`;
}

export function renderConceptLibrary(): string {
  return `<template data-concept-library>${concepts.map(renderConceptCard).join("\n")}</template>`;
}

function renderConceptSummary(concept: Concept): string {
  const description = concept.definition.split(/(?<=\.)\s/)[0]!;
  return `<li data-concept-result="${concept.id}"><details class="concept-directory-item">
  <summary data-concept-select="${concept.id}" aria-labelledby="summary-${concept.id}-title" aria-describedby="summary-${concept.id}-description">
    <span class="concept-summary-heading"><span class="concept-summary-title" id="summary-${concept.id}-title">${escapeHtml(concept.title)}</span><span class="concept-summary-group">${concept.group}</span></span>
    <span class="concept-summary-description" id="summary-${concept.id}-description">${escapeHtml(description)}</span>
    <span class="concept-summary-action">Explore concept <span aria-hidden="true">→</span><span class="concept-group-tag" data-concept-group-tag hidden>Group member</span></span>
  </summary>
  ${renderConceptCard(concept)}
  </details></li>`;
}

export function renderConceptPage(
  siteUrl = "https://scalableweb.dev/",
): string {
  const guideUrl = new URL("/concepts/agent-guide.md", siteUrl).href;
  return `<main class="concept-reference" id="content">
  <header class="concept-reference-header"><p class="eyebrow">Ideas across the book</p><h1>Concepts that connect</h1><p>Follow an idea through the book, or bring your own question and agent to the knowledge graph.</p><details class="concept-reference-notes"><summary>About the definitions and connections</summary><p>Definitions use established vocabulary where it fits. Some terms, especially around coding agents and harnesses, are still developing or vary between sources. “Usage in this book” notes explain our working definitions, course protocols, and broader applications of a term.</p><p>The lines are authored teaching connections. Read an arrow as a statement from its source, through the label, to its target. The label and explanation establish the meaning; an arrow alone does not establish causation or a prerequisite. Comparisons and associations use plain lines. Each connection links back to the reading.</p></details></header>
  <form class="concept-lookup" role="search" aria-label="Concept lookup" data-concept-lookup hidden><label for="concept-lookup">Find a concept</label><div><input id="concept-lookup" type="search" placeholder="Retry, review, latency" data-concept-lookup-input><button type="submit">Search</button></div></form>
  <section class="concept-agent" aria-labelledby="concept-agent-title">
    <div class="concept-agent-introduction"><p class="concept-context-label">Your question · your tools</p><h2 id="concept-agent-title">Explore with your own agent</h2><p>Start from your course task, current reading, or a question of your own. <a href="/explore/">Choose a task starting point</a>, or give your agent the guide below to explore ideas and experiments through the graph.</p></div>
    <div class="concept-agent-access"><label for="concept-agent-guide-url">Give your agent this guide</label><div class="concept-agent-copy"><input id="concept-agent-guide-url" type="text" inputmode="url" value="${escapeAttribute(guideUrl)}" readonly data-concept-agent-url><button type="button" data-concept-agent-copy hidden>Copy URL</button></div><p class="concept-agent-status" data-concept-agent-status role="status"></p><p class="concept-agent-files"><a href="/concepts/agent-guide.md">Read the guide</a><a href="/concepts/graph.json">Graph as JSON</a><a href="/concepts/graph.md">Graph as Markdown</a></p></div>
    <details class="concept-agent-setup"><summary>Connect it, then check it</summary><ol><li><strong>Connect your tools.</strong> Use an agent that can fetch URLs. If it works with files instead, download the guide and either graph format and add them to its context. The guide describes the data and how to follow connections.</li><li><strong>Pick a starting point.</strong> If you are unsure, ask “Read this guide and help me get started.” Choose one of the suggested activities, or bring your own question. State a guess or prediction before asking for an explanation.</li><li><strong>Check the explanation.</strong> Follow a citation yourself. Compare the answer with the passage and its assumptions, and distinguish the book’s connections from connections your agent proposes. Keep a short record of what you accepted, challenged, or could not verify.</li></ol><p>Connecting the graph and judging what your agent retrieves are part of the learning. You can also explore it directly below.</p></details>
  </section>
  <details class="concept-explorer" id="concept-explorer" data-concept-explorer><summary><span data-concept-explorer-title>Explore the whole book</span><span class="concept-explorer-description" data-concept-explorer-description>${concepts.length} concepts and their connections</span></summary>
  <section class="concept-exploration-context" data-concept-context hidden aria-labelledby="concept-context-title"><div class="concept-exploration-heading"><div><p class="concept-context-label" data-concept-context-label></p><h2 id="concept-context-title" tabindex="-1" data-concept-context-title></h2></div><button type="button" data-concept-all>Explore the whole book →</button></div><p class="concept-prediction" data-concept-context-prompt></p><a data-concept-context-reading></a></section>
  <section id="concept-graph" aria-label="Explore concept connections">${renderConceptGraph("reference-concepts")}</section>
  <section class="concept-directory" id="concept-directory" aria-labelledby="concept-directory-title">
    <header class="concept-directory-heading"><div><h2 id="concept-directory-title">Concept list</h2><p data-concept-directory-count>${concepts.length} topics</p></div></header>
    <p class="concept-directory-help">Choose an idea for its definition, examples, and connections.</p>
    <p class="concept-directory-empty" data-concept-empty hidden>No topics match. Clear the search or reset the view above.</p>
    <ul class="concept-directory-list">${[...concepts]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(renderConceptSummary)
      .join("\n")}</ul>
  </section>
  </details>
</main>`;
}

export function renderConceptGraph(
  prefix: string,
  ids = concepts.map((concept) => concept.id),
  focus = "",
  labelledOverview = false,
): string {
  const complete = prefix === "reference-concepts";
  const items = ids.map((id) => byId.get(id)!);
  const relations = conceptRelationships.filter(
    (relation) =>
      ids.includes(relation.source) &&
      ids.includes(relation.target) &&
      (!focus || relation.source === focus || relation.target === focus),
  );
  const layout = complete
    ? labelledOverview
      ? layoutLabeledOverview(overview.points, overview.width, overview.height)
      : overview
    : layoutNeighborhood(ids, focus, true);
  const points = new Map(layout.points.map((point) => [point.id, point]));
  const edges = relations
    .map((relation) => {
      const a = points.get(relation.source)!,
        b = points.get(relation.target)!;
      const line = layoutConnection(a, b);
      const proposition =
        relation.direction === "directed"
          ? `${byId.get(relation.source)!.title} ${relation.label} ${byId.get(relation.target)!.title}`
          : `${byId.get(relation.source)!.title} — ${byId.get(relation.target)!.title}: ${relation.label}`;
      return `<g data-concept-edge="${relation.source} ${relation.target}" data-direction="${relation.direction}"><title>${escapeHtml(`${proposition}. ${relation.explanation}`)}</title><line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"/>${relation.direction === "directed" ? `<path data-concept-arrow d="M -8 -4 L 0 0 L -8 4 Z" transform="translate(${line.x2} ${line.y2}) rotate(${line.angle})" aria-hidden="true"/>` : ""}</g>`;
    })
    .join("");
  const captions = layoutEdgeLabels(layout.points, relations, layout, focus)
    .map(
      (caption) =>
        `<g class="concept-edge-label" data-concept-edge-label="${caption.source} ${caption.target}" data-label="${escapeAttribute(caption.label)}" aria-hidden="true" transform="translate(${caption.x} ${caption.y})"><line x1="0" y1="0" x2="${caption.anchorX - caption.x}" y2="${caption.anchorY - caption.y}"/><rect x="${-caption.width / 2}" y="-11" width="${caption.width}" height="22" rx="5"/><text text-anchor="middle" dominant-baseline="middle">${escapeHtml(caption.label)}</text></g>`,
    )
    .join("");
  const nodes = items
    .map((concept) => {
      const point = points.get(concept.id)!;
      const words = concept.title.split(" ");
      const lines = [""];
      for (const word of words) {
        const current = lines.at(-1)!;
        const candidate = current ? `${current} ${word}` : word;
        // Leave room around the label instead of filling the node edge to edge.
        if (current && candidate.length > 17) lines.push(word);
        else lines[lines.length - 1] = candidate;
      }
      return `<a href="/concepts/#${concept.id}" data-concept-node="${concept.id}" data-title="${escapeAttribute(concept.title)}" data-group="${concept.group}" data-search="${escapeAttribute(`${concept.title} ${concept.definition} ${concept.usage?.note ?? ""}`.toLowerCase())}" data-x="${point.x}" data-y="${point.y}"${concept.id === focus ? ' class="is-current"' : ""} aria-label="Explore ${escapeAttribute(concept.title)}"><g transform="translate(${point.x} ${point.y})"><rect x="-95" y="-30" width="190" height="60" rx="12"/><text text-anchor="middle" dominant-baseline="middle">${lines.map((line, index) => `<tspan x="0" y="${(index - (lines.length - 1) / 2) * 19}">${escapeHtml(line)}</tspan>`).join("")}</text></g></a>`;
    })
    .join("");
  return `<div class="concept-map${complete ? " concept-map-complete" : " has-connection-labels"}" data-concept-map data-focus="${focus}" data-complete="${complete}">
  <div class="concept-map-heading"><h2>${complete ? "Concepts and connections" : "Explore the connections"}</h2>${complete ? `<div class="concept-map-heading-actions"><button type="button" data-concept-expand aria-pressed="false" aria-controls="${prefix}-graphic" hidden>Expand graph</button><div class="concept-view-switch" role="tablist" aria-label="Concept view" data-concept-view-switch hidden><button type="button" role="tab" id="${prefix}-view-graph" aria-controls="${prefix}-graph-panel" aria-selected="true" data-concept-view="graph">Graph</button><button type="button" role="tab" id="${prefix}-view-list" aria-controls="concept-directory" aria-selected="false" tabindex="-1" data-concept-view="list">List</button></div></div>` : ""}</div>
  ${complete ? `<details class="concept-map-tools" data-concept-map-tools hidden open><summary>Adjust the graph and filters</summary>` : ""}
  <div class="concept-map-controls" hidden data-concept-controls>
    ${complete ? `<label for="${prefix}-reading">Reading<select id="${prefix}-reading" data-concept-reading><option value="">Whole book</option>${conceptPages.map((page) => `<option value="${page.url}" data-ids="${page.concepts.join(" ")}" data-prompt="${escapeAttribute(page.prompt || "")}">${escapeHtml(page.title)}</option>`).join("")}</select></label>` : ""}
    ${!focus ? `<label for="${prefix}-focus">Focus on<select id="${prefix}-focus" data-concept-focus><option value="">${complete ? "All concepts" : "All connections"}</option>${items.map((concept) => `<option value="${concept.id}">${escapeHtml(concept.title)}</option>`).join("")}</select></label>` : ""}
    ${complete ? `<div class="concept-map-actions"><button type="button" data-concept-reset>Reset view</button></div>` : ""}
    ${complete ? `<div class="concept-map-group-controls"><label for="${prefix}-group">Topic group<select id="${prefix}-group" data-concept-group><option value="">All groups</option>${conceptGroups.map((group) => `<option>${group}</option>`).join("")}</select></label><fieldset class="concept-group-view" data-concept-group-controls disabled aria-describedby="${prefix}-group-help"><legend>Group view</legend><div><label><input type="radio" name="${prefix}-group-view" value="highlight" data-concept-group-mode checked><span>Highlight</span></label><label><input type="radio" name="${prefix}-group-view" value="only" data-concept-group-mode><span>Show only</span></label></div></fieldset><p class="concept-group-help" id="${prefix}-group-help" data-concept-group-help>Choose a group to highlight its members in context.</p></div>` : ""}
    <label class="concept-map-label-toggle"><input type="checkbox" data-concept-labels${complete ? "" : " checked"}>Show connection labels</label>
  </div>
  ${complete ? "</details>" : ""}
  ${complete ? `<p class="concept-map-status" data-concept-map-status role="status">${items.length} concepts · ${relations.length} connections</p><div id="${prefix}-graph-panel" data-concept-graph-panel>` : ""}
  <p${complete ? " data-concept-map-intro" : ""}>${complete ? "Search or choose a reading to narrow both views. Focus on an idea to see its neighborhood; select a node to read and continue exploring." : "Select a topic to read its definition and discover connections beyond this reading."}</p>
  ${complete ? `<div class="concept-map-canvas"><div class="concept-map-navigation" role="group" aria-label="Graph navigation" data-concept-navigation hidden><span data-concept-zoom-level>100%</span><button type="button" data-concept-zoom="out" aria-label="Zoom out">−</button><button type="button" data-concept-zoom="in" aria-label="Zoom in">+</button><button type="button" data-concept-zoom="fit">Fit</button><button type="button" data-concept-zoom="readable" aria-label="Use readable graph size">Readable</button></div>` : ""}
  <div class="concept-map-graphic"${complete ? ` id="${prefix}-graphic" tabindex="0" role="region" aria-label="Interactive concept graph" aria-describedby="${prefix}-help"` : ""}><svg viewBox="0 0 ${layout.width} ${layout.height}" role="group" aria-label="${complete ? "All concepts in the book" : "Connected concepts"}" data-width="${layout.width}" data-height="${layout.height}">${edges}${captions}${nodes}</svg></div>
  ${complete ? `</div><p class="concept-map-help" id="${prefix}-help">Drag anywhere or scroll to move the map. Ctrl/⌘ + scroll or pinch to zoom. Fit shows the whole map; Readable restores the text size. With the map focused, arrow keys move it, +/− zoom, and 0 fits. Every topic and connection is also available as text below.</p>` : ""}
  <p class="concept-map-legend">Read arrows as topic → relationship → topic. Plain lines connect comparisons and associations.${complete ? " Hover or focus a topic to reveal its relationship labels. A selected topic keeps its labels visible; press Escape in the map to clear them." : ""}</p>
  ${!complete ? `<p class="concept-map-status" data-concept-map-status role="status">${focus ? `${escapeHtml(byId.get(focus)!.title)} · ${relations.length} connections` : `${items.length} concepts · ${relations.length} connections`}</p>` : ""}
  <details class="concept-map-relationships"><summary>Read the relationships</summary><ul>${relations.map((relation) => `<li data-concept-relation="${relation.source} ${relation.target}"><strong>${renderProposition(relation)}</strong><p>${escapeHtml(relation.explanation)}</p></li>`).join("")}</ul></details>
  <details class="concept-connection-practice"><summary>Try explaining a connection</summary><p>Hide the labels and choose two connected topics. Write a linking phrase and decide whether the statement needs a direction. Read it as a complete sentence, then compare it with the authored label and explanation. Which assumption makes it hold, and when might it fail?</p><button type="button" data-concept-practice-labels hidden>${complete ? "Compare with the labels" : "Hide labels to try"}</button></details>
  ${complete ? "</div>" : ""}
  </div>`;
}
