export function renderKnowledgeBoundaryDiagram(): string {
  const id = "shared-knowledge-boundary";
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const markerId = `${id}-arrow`;
  const title = "One knowledge base, two artifact owners";
  const description =
    "An external knowledge base owns immutable documents, collections, relationships, provenance, and reusable user-owned annotations. Slideotter references exact source revisions while owning presentation metadata, outline variants, slide definitions, themes, and approvals. Kirjolab references exact source and annotation revisions while owning manuscripts, claims, evidence links, prose, and review state.";

  return `<svg
  class="book-diagram knowledge-boundary-diagram"
  data-book-diagram="${id}"
  viewBox="0 0 940 520"
  role="img"
  aria-labelledby="${titleId} ${descriptionId}"
  preserveAspectRatio="xMidYMid meet"
>
  <title id="${titleId}">${title}</title>
  <desc id="${descriptionId}">${description}</desc>
  <defs>
    <marker id="${markerId}" class="book-diagram-marker" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
  </defs>

  <g class="book-diagram-node knowledge-boundary-source" data-diagram-container="knowledge-base" data-diagram-node="knowledge-base">
    <rect x="70" y="28" width="800" height="166" rx="13"></rect>
    <text class="book-diagram-kicker" x="94" y="59">REUSABLE SOURCE KNOWLEDGE</text>
    <text class="book-diagram-title knowledge-boundary-source-title" x="94" y="94">External knowledge base owns</text>
    <text class="book-diagram-detail" x="94" y="130">
      <tspan x="94" dy="0">Immutable documents + collections</tspan>
      <tspan x="94" dy="25">Relationships + provenance</tspan>
    </text>
    <text class="book-diagram-detail" x="500" y="130">
      <tspan x="500" dy="0">User-owned annotations</tspan>
      <tspan x="500" dy="25">Explicit sharing between people</tspan>
    </text>
  </g>

  <g class="knowledge-boundary-connectors" aria-hidden="true">
    <path d="M 240 194 L 240 276" marker-end="url(#${markerId})"></path>
    <path d="M 700 194 L 700 276" marker-end="url(#${markerId})"></path>
  </g>

  <g class="knowledge-boundary-link-label" data-diagram-container="slideotter-source-link">
    <rect x="131" y="219" width="218" height="38" rx="19"></rect>
    <text x="240" y="244" text-anchor="middle">REFERENCE EXACT SOURCES</text>
  </g>
  <g class="knowledge-boundary-link-label" data-diagram-container="kirjolab-evidence-link">
    <rect x="568" y="219" width="264" height="38" rx="19"></rect>
    <text x="700" y="244" text-anchor="middle">PIN SOURCE + ANNOTATION REVISION</text>
  </g>

  ${renderProduct({
    id: "slideotter",
    x: 30,
    kicker: "PRESENTATION ARTIFACT",
    title: "Slideotter owns",
    items: [
      "Presentation metadata",
      "Outline variants",
      "Slide definitions + themes",
      "Approval and revision history",
    ],
  })}
  ${renderProduct({
    id: "kirjolab",
    x: 490,
    kicker: "MANUSCRIPT ARTIFACT",
    title: "Kirjolab owns",
    items: [
      "Manuscripts + prose",
      "Claims + evidence links",
      "Exact reviewed revisions",
      "Review and acceptance state",
    ],
  })}
</svg>`;
}

function renderProduct({
  id,
  items,
  kicker,
  title,
  x,
}: {
  id: string;
  items: readonly string[];
  kicker: string;
  title: string;
  x: number;
}): string {
  const top = 286;

  return `<g class="book-diagram-node knowledge-boundary-product is-${id}" data-diagram-container="${id}" data-diagram-node="${id}">
    <rect x="${x}" y="${top}" width="420" height="204" rx="13"></rect>
    <text class="book-diagram-kicker" x="${x + 22}" y="${top + 31}">${kicker}</text>
    <text class="book-diagram-title" x="${x + 22}" y="${top + 68}">${title}</text>
    ${items
      .map((item, index) => {
        const itemY = top + 106 + index * 24;
        return `<circle class="knowledge-boundary-item-mark" cx="${x + 26.5}" cy="${itemY - 4.5}" r="3.5"></circle>
      <text class="book-diagram-detail" x="${x + 42}" y="${itemY}">${item}</text>`;
      })
      .join("\n    ")}
  </g>`;
}
