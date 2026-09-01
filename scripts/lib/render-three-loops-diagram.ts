type LoopCard = {
  detail: string;
  id: string;
  kicker: string;
  sequence: readonly string[];
  title: string;
};

const cards: readonly LoopCard[] = [
  {
    id: "application-loop",
    kicker: "KEEP BEHAVIOR USEFUL",
    title: "Application loop",
    detail: "Respond to pressure",
    sequence: [
      "Pressure → challenged assumption",
      "Limit → signal → response",
      "New trade-off → next pressure",
    ],
  },
  {
    id: "development-loop",
    kicker: "PRESERVE OPTIONALITY",
    title: "Development loop",
    detail: "Preserve the ability to change",
    sequence: [
      "Intent → implementation",
      "Validation → accepted change",
      "Project memory → next change",
    ],
  },
  {
    id: "agentic-loop",
    kicker: "BOUND EXECUTION",
    title: "Agentic loop",
    detail: "Turn activity into accepted change",
    sequence: [
      "Authority → execution → trace",
      "Accept or reject → correction",
      "Next bounded delegation",
    ],
  },
];

export function renderThreeLoopsDiagram(): string {
  const id = "three-connected-loops";
  const markerId = `${id}-arrow`;
  const sharedMarkerId = `${id}-shared-arrow`;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const cardWidth = 320;
  const cardHeight = 200;
  const cardGap = 46;
  const left = 34;
  const top = 180;
  const centers = cards.map(
    (_card, index) => left + index * (cardWidth + cardGap) + cardWidth / 2,
  );

  return `<svg
  class="book-diagram three-loops-diagram"
  data-book-diagram="${id}"
  viewBox="0 0 1120 500"
  role="img"
  aria-labelledby="${titleId} ${descriptionId}"
  preserveAspectRatio="xMidYMid meet"
>
  <title id="${titleId}">Three connected scalability loops</title>
  <desc id="${descriptionId}">Architecture, evidence, and human judgment support three connected feedback loops. Application pressure creates development work, the development system frames bounded agent execution, and accepted change returns to alter the application and its next likely limit.</desc>
  <defs>
    <marker id="${markerId}" class="book-diagram-marker" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
    <marker id="${sharedMarkerId}" class="three-loops-shared-marker" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z"></path>
    </marker>
  </defs>

  <g class="three-loops-shared" data-diagram-container="shared-foundation">
    <rect x="70" y="24" width="980" height="112" rx="12"></rect>
    <text class="book-diagram-kicker" x="94" y="56">SHARED ACROSS THE LOOPS</text>
    <text class="book-diagram-title" x="94" y="89">Architecture, evidence, and judgment connect the loops</text>
    <text class="book-diagram-detail" x="94" y="116">Boundaries locate pressure · observations challenge claims · people choose and accept responses</text>
  </g>

  <g class="three-loops-shared-links" aria-hidden="true">
    ${centers
      .map(
        (center) =>
          `<path d="M ${center} 136 L ${center} ${top - 10}" marker-end="url(#${sharedMarkerId})"></path>`,
      )
      .join("\n    ")}
  </g>

  <g class="three-loops-connections" aria-hidden="true">
    <path d="M ${left + cardWidth} ${top + cardHeight / 2} L ${left + cardWidth + cardGap - 10} ${top + cardHeight / 2}" marker-end="url(#${markerId})"></path>
    <path d="M ${left + 2 * cardWidth + cardGap} ${top + cardHeight / 2} L ${left + 2 * (cardWidth + cardGap) - 10} ${top + cardHeight / 2}" marker-end="url(#${markerId})"></path>
    <path d="M ${centers[2]} ${top + cardHeight} L ${centers[2]} 451 L ${centers[0]} 451 L ${centers[0]} ${top + cardHeight + 10}" marker-end="url(#${markerId})"></path>
  </g>

  <g class="three-loops-cards">
    ${cards
      .map((card, index) =>
        renderCard(card, left + index * (cardWidth + cardGap), top),
      )
      .join("\n    ")}
  </g>

  <g class="three-loops-return-label" data-diagram-container="accepted-change-return">
    <rect x="312" y="430" width="496" height="40" rx="20"></rect>
    <text x="560" y="455" text-anchor="middle">ACCEPTED CHANGE ALTERS THE APPLICATION AND ITS NEXT LIMIT</text>
  </g>
</svg>`;

  function renderCard(card: LoopCard, x: number, y: number): string {
    return `<g class="book-diagram-node three-loops-card is-${card.id}" data-diagram-container="${card.id}" data-diagram-node="${card.id}">
      <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="12"></rect>
      <text class="book-diagram-kicker" x="${x + 20}" y="${y + 31}">${card.kicker}</text>
      <text class="book-diagram-title" x="${x + 20}" y="${y + 70}">${card.title}</text>
      <text class="book-diagram-detail three-loops-purpose" x="${x + 20}" y="${y + 100}">${card.detail}</text>
      <text class="three-loops-sequence" x="${x + 20}" y="${y + 135}">
        ${card.sequence
          .map(
            (line, index) =>
              `<tspan x="${x + 20}" dy="${index === 0 ? 0 : 23}">${line}</tspan>`,
          )
          .join("\n        ")}
      </text>
    </g>`;
  }
}
