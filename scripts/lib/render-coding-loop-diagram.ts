const stages = [
  { title: "Constrain", x: 2, y: 2, lines: ["Export title", "and location."] },
  {
    title: "Generate",
    x: 191,
    y: 2,
    lines: ["The first draft", "omits the quotes."],
  },
  {
    title: "Validate",
    x: 191,
    y: 118,
    lines: ["Expected 2 fields.", "Found 4."],
  },
  {
    title: "Revise",
    x: 2,
    y: 118,
    lines: ["Quote the title.", "Keep the test."],
  },
];

export function renderCodingLoopDiagram(): string {
  return `<svg class="book-diagram" data-book-diagram="coding-loop" viewBox="0 0 350 208" role="img" aria-labelledby="coding-loop-title coding-loop-description">
  <title id="coding-loop-title">One iteration of a CSV export</title>
  <desc id="coding-loop-description">Read clockwise. The export should contain a title and a location. The first candidate leaves commas in the title unquoted, so a CSV reader finds four fields. Quote the title and carry that example into the next pass as a test.</desc>
  <defs>
    <marker id="coding-loop-arrow" class="book-diagram-marker" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z"></path>
    </marker>
  </defs>
  <g class="linear-flow-connectors" marker-end="url(#coding-loop-arrow)" aria-hidden="true">
    <path d="M162 46 H187"></path>
    <path d="M269 92 V114"></path>
    <path d="M187 162 H162"></path>
    <path d="M80 114 V92"></path>
  </g>
  ${stages
    .map(
      (
        { title, x, y, lines },
        index,
      ) => `<g class="book-diagram-node" data-diagram-container="${title}" data-diagram-node="${title}" transform="translate(${x} ${y})">
    <rect width="157" height="88" rx="7"></rect>
    <text class="book-diagram-title" x="10" y="28">${index + 1}. ${title}</text>
    <text class="book-diagram-detail" x="10" y="53">${lines[0]}</text>
    <text class="book-diagram-detail" x="10" y="73">${lines[1]}</text>
  </g>`,
    )
    .join("\n")}
</svg>`;
}
