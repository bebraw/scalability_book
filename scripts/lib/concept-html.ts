import {
  concepts,
  conceptGroups,
  type Concept,
} from "../../shared/concepts.ts";
import { conceptPages } from "../../shared/concept-pages.ts";
import { conceptRelationships } from "../../shared/concept-relationships.ts";
import {
  layoutNeighborhood,
  layoutEdgeLabels,
  layoutOverview,
  neighborhood,
} from "../../shared/concept-graph.ts";
import { escapeAttribute, escapeHtml } from "./text.ts";

const overview = layoutOverview(concepts, conceptRelationships, conceptGroups);
const byId = new Map(concepts.map((concept) => [concept.id, concept]));
const conceptLink = (concept: Concept) =>
  `<a href="/concepts/#${concept.id}">${escapeHtml(concept.title)}</a>`;

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
  <a class="concept-reference-link" href="/concepts/${page ? `?reading=${encodeURIComponent(page.url)}` : ""}">Explore these topics in the complete book graph →</a>
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
  const related = conceptRelationships.filter(
    (relation) =>
      relation.source === concept.id || relation.target === concept.id,
  );
  const readings = conceptPages.filter((page) =>
    page.concepts.includes(concept.id),
  );
  return `<section class="concept-card" id="${concept.id}" data-concept-card="${concept.id}" aria-labelledby="concept-${concept.id}-title">
  <p class="concept-card-group">${concept.group}</p><h2 id="concept-${concept.id}-title" tabindex="-1">${escapeHtml(concept.title)}</h2>
  <dl class="concept-passages">${sections.map(([label, text]) => `<div><dt>${label}</dt><dd>${escapeHtml(text)}</dd></div>`).join("")}</dl>
  <details class="concept-neighborhood"><summary>Explore this topic's connections</summary>${renderConceptGraph(`topic-${concept.id}`, [...neighborhood(concept.id, conceptRelationships)], concept.id)}</details>
  <h3>Follow the idea</h3>
  <ul class="concept-contexts">${concept.contexts.map((context) => `<li><a href="${escapeAttribute(context.href)}">${escapeHtml(context.label)}</a><p>${escapeHtml(context.description)}</p></li>`).join("")}</ul>
  <h3>Connect the concepts</h3>
  <ul class="concept-relationships">${related
    .map((relation) => {
      const relatedId =
        relation.source === concept.id ? relation.target : relation.source;
      const target = byId.get(relatedId);
      if (!target) throw new Error(`Unknown related concept: ${relatedId}`);
      return `<li>${conceptLink(target)} <span class="concept-relationship-label">${escapeHtml(relation.label)}</span><p>${escapeHtml(relation.explanation)}</p></li>`;
    })
    .join("")}</ul>
  <details class="concept-reading-locations"><summary>Find this idea across the book (${readings.length})</summary><ul>${readings.map((page) => `<li><a href="${page.url}">${escapeHtml(page.title)}</a></li>`).join("")}</ul></details>
</section>`;
}

export function renderConceptLibrary(): string {
  return `<template data-concept-library>${concepts.map(renderConceptCard).join("\n")}</template>`;
}

export function renderConceptPage(): string {
  return `<main class="concept-reference" id="content">
  <header class="concept-reference-header"><p class="eyebrow">The whole book · ${concepts.length} connected ideas</p><h1>Concepts that connect</h1><p>Start with an idea and discover where it leads. Follow a connection across application behavior, development work, and the evidence that lets you compare them.</p><p>The lines are authored teaching connections, not prerequisites or proof of causation. Each has an explanation and links back to the reading.</p></header>
  <section id="concept-graph" aria-label="Explore concept connections">${renderConceptGraph("reference-concepts")}</section>
  <div class="concept-reference-layout"><nav class="concept-directory" aria-label="Concept reference"><p class="concept-index-label">Definitions and examples</p>${conceptGroups
    .map(
      (group) =>
        `<details open><summary>${group}</summary><ul>${concepts
          .filter((concept) => concept.group === group)
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((concept) => `<li>${conceptLink(concept)}</li>`)
          .join("")}</ul></details>`,
    )
    .join(
      "",
    )}</nav><div>${concepts.map(renderConceptCard).join("\n")}</div></div>
</main>`;
}

export function renderConceptGraph(
  prefix: string,
  ids = concepts.map((concept) => concept.id),
  focus = "",
): string {
  const complete = prefix === "reference-concepts";
  const items = ids.map((id) => byId.get(id)!);
  const relations = conceptRelationships.filter(
    (relation) =>
      ids.includes(relation.source) &&
      ids.includes(relation.target) &&
      (!focus || relation.source === focus || relation.target === focus),
  );
  const layout = complete ? overview : layoutNeighborhood(ids, focus);
  const points = new Map(layout.points.map((point) => [point.id, point]));
  const edges = relations
    .map((relation) => {
      const a = points.get(relation.source)!,
        b = points.get(relation.target)!;
      return `<g data-concept-edge="${relation.source} ${relation.target}"><title>${escapeHtml(`${relation.label}: ${relation.explanation}`)}</title><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/></g>`;
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
      return `<a href="/concepts/#${concept.id}" data-concept-node="${concept.id}" data-title="${escapeAttribute(concept.title)}" data-group="${concept.group}" data-search="${escapeAttribute(`${concept.title} ${concept.definition}`.toLowerCase())}" data-x="${point.x}" data-y="${point.y}"${concept.id === focus ? ' class="is-current"' : ""} aria-label="Explore ${escapeAttribute(concept.title)}"><g transform="translate(${point.x} ${point.y})"><rect x="-95" y="-30" width="190" height="60" rx="12"/><text text-anchor="middle" dominant-baseline="middle">${lines.map((line, index) => `<tspan x="0" y="${(index - (lines.length - 1) / 2) * 19}">${escapeHtml(line)}</tspan>`).join("")}</text></g></a>`;
    })
    .join("");
  return `<div class="concept-map${complete ? " concept-map-complete" : ""}" data-concept-map data-focus="${focus}" data-complete="${complete}">
  <div class="concept-map-heading"><h2>${complete ? "The complete concept graph" : "Explore the connections"}</h2>${complete ? `<a href="#concept-${concepts[0]!.id}-title">Read the reference ↓</a>` : ""}</div>
  <div class="concept-map-controls" hidden data-concept-controls>
    ${complete ? `<label for="${prefix}-search">Search topics<input id="${prefix}-search" type="search" data-concept-search placeholder="Retry, review, latency"></label><label for="${prefix}-reading">Reading<select id="${prefix}-reading" data-concept-reading><option value="">Whole book</option>${conceptPages.map((page) => `<option value="${page.url}" data-ids="${page.concepts.join(" ")}">${escapeHtml(page.title)}</option>`).join("")}</select></label>` : ""}
    ${!focus ? `<label for="${prefix}-focus">Focus on<select id="${prefix}-focus" data-concept-focus><option value="">${complete ? "Complete graph" : "All connections"}</option>${items.map((concept) => `<option value="${concept.id}">${escapeHtml(concept.title)}</option>`).join("")}</select></label>` : ""}
    ${complete ? `<div class="concept-map-actions"><button type="button" data-concept-reset>Reset view</button><button type="button" data-concept-zoom="out" aria-label="Zoom out">−</button><button type="button" data-concept-zoom="in" aria-label="Zoom in">+</button><button type="button" data-concept-zoom="fit">Fit</button></div>` : ""}
    ${complete ? `<div class="concept-map-group-controls"><label for="${prefix}-group">Topic group<select id="${prefix}-group" data-concept-group><option value="">All groups</option>${conceptGroups.map((group) => `<option>${group}</option>`).join("")}</select></label><fieldset class="concept-group-view" data-concept-group-controls disabled aria-describedby="${prefix}-group-help"><legend>Group view</legend><div><label><input type="radio" name="${prefix}-group-view" value="highlight" data-concept-group-mode checked><span>Highlight</span></label><label><input type="radio" name="${prefix}-group-view" value="only" data-concept-group-mode><span>Show only</span></label></div></fieldset><p class="concept-group-help" id="${prefix}-group-help" data-concept-group-help>Choose a group to highlight its members in context.</p></div>` : ""}
    <label class="concept-map-label-toggle"><input type="checkbox" data-concept-labels>Show connection labels</label>
  </div>
  <p>${complete ? "Search or choose a reading to narrow the map. Focus on an idea to see its neighborhood; select a node to read and continue exploring." : "Select a topic to read its definition and discover connections beyond this reading."}</p>
  <div class="concept-map-graphic"${complete ? ' tabindex="0" role="region" aria-label="Scrollable concept graph"' : ""}><svg viewBox="0 0 ${layout.width} ${layout.height}" role="group" aria-label="${complete ? "All concepts in the book" : "Connected concepts"}" data-width="${layout.width}" data-height="${layout.height}">${edges}${captions}${nodes}</svg></div>
  ${complete ? `<p class="concept-map-help">Scroll the map to pan, or drag its background. Use + and − to zoom. Every topic and connection is also available as text below.</p>` : ""}
  <p class="concept-map-status" data-concept-map-status role="status">${focus ? `${escapeHtml(byId.get(focus)!.title)} · ${relations.length} connections` : `${items.length} concepts · ${relations.length} connections`}</p>
  ${complete ? `<ul class="concept-map-results" aria-label="Topics in this view">${items.map((concept) => `<li data-concept-result="${concept.id}">${conceptLink(concept)}<span class="concept-group-tag" data-concept-group-tag hidden>Group member</span></li>`).join("")}</ul>` : ""}
  <details class="concept-map-relationships"><summary>Read the relationships</summary><ul>${relations.map((relation) => `<li data-concept-relation="${relation.source} ${relation.target}"><strong>${conceptLink(byId.get(relation.source)!)} · ${conceptLink(byId.get(relation.target)!)}</strong> <span class="concept-relationship-label">${escapeHtml(relation.label)}</span><p>${escapeHtml(relation.explanation)}</p></li>`).join("")}</ul></details>
  </div>`;
}
