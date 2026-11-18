// Each mark is placed at its send time and styled by its state just before 1 s.
export function renderArrivalModelsDiagram(): string {
  const plotStart = 19;
  const plotWidth = 320;
  const xAt = (ms: number) => plotStart + (ms / 1000) * plotWidth;
  const inService = (x: number, y: number) =>
    `<circle class="arrival-serving" cx="${x}" cy="${y}" r="4.5"></circle>`;
  const waiting = (x: number, y: number) =>
    `<rect class="arrival-waiting" x="${x - 4.5}" y="${y - 4.5}" width="9" height="9"></rect>`;
  const closed = Array.from({ length: 4 }, (_, i) =>
    inService(xAt(0), 44 + i * 12),
  );
  const open = Array.from({ length: 20 }, (_, i) => {
    const x = xAt(i * 50);
    return i < 4 ? inService(x, 153) : waiting(x, 153);
  });
  const ticks = [0, 250, 500, 750, 1000].map((ms) => {
    const x = xAt(ms);
    return `<path class="arrival-axis" d="M${x} 167 v5"></path>
      <text class="arrival-tick" x="${x}" y="188" text-anchor="middle">${ms}</text>`;
  });
  return `<svg class="book-diagram arrival-models-diagram" data-book-diagram="arrival-models" viewBox="0 0 360 255" role="img" aria-labelledby="arrival-models-title arrival-models-description">
  <title id="arrival-models-title">Open-loop and closed-loop arrivals in the first second</title>
  <desc id="arrival-models-description">The horizontal axis shows when each request was sent, from zero up to but excluding 1,000 milliseconds. Four closed-loop workers send together at zero. All four requests are in service and none are waiting. The open-loop generator sends every 50 milliseconds through 950. Its first four requests are in service and the next sixteen are waiting. The first reply in each run arrives at 1,000 milliseconds.</desc>
  <text class="book-diagram-title" x="8" y="24">Closed loop</text>
  <text class="book-diagram-detail" x="351" y="24" text-anchor="end">4 sent · 0 waiting</text>
  <g aria-hidden="true">
    <path class="arrival-guide" d="M${plotStart} 36 V90 H${xAt(1000)}"></path>
    ${closed.join("\n")}
  </g>
  <text class="book-diagram-detail" x="42" y="59">Four workers send together.</text>
  <text class="book-diagram-detail" x="42" y="80">Each waits for its reply.</text>
  <text class="book-diagram-title" x="8" y="121">Open loop</text>
  <text class="book-diagram-detail" x="351" y="121" text-anchor="end">20 sent · 16 waiting</text>
  <g aria-hidden="true">
    ${open.join("\n")}
    <path class="arrival-axis" d="M${plotStart} 167 H${xAt(1000)}"></path>
  </g>
  ${ticks.join("\n")}
  <text class="book-diagram-detail" x="180" y="210" text-anchor="middle">Time sent (milliseconds)</text>
  ${inService(46, 239)}
  <text class="book-diagram-detail" x="59" y="244">In service</text>
  ${waiting(194, 239)}
  <text class="book-diagram-detail" x="207" y="244">Waiting</text>
</svg>`;
}
