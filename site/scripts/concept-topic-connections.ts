export type TopicConnections = {
  description: string;
  relations: ReadonlySet<string>;
};

// The fitted map counts cross-topic relationships. Use the existing authored
// list so activating a count keeps the original propositions and reading links.
export function bindTopicConnections(map: HTMLElement, rows: HTMLElement[]) {
  const list = map.querySelector<HTMLDetailsElement>(
    ".concept-map-relationships",
  )!;
  const summary = list.querySelector("summary")!;
  const defaultTitle = summary.textContent;
  const showAll = list.querySelector<HTMLButtonElement>(
    "[data-concept-all-relations]",
  )!;
  let opener: SVGElement | null = null;

  function reset() {
    if (!opener) return;
    opener = null;
    summary.textContent = defaultTitle;
    showAll.hidden = true;
    for (const row of rows) row.hidden = false;
  }

  map.addEventListener("concept-topic-connections", (event) => {
    const { description, relations } = (event as CustomEvent<TopicConnections>)
      .detail;
    opener = event.target as SVGElement;
    for (const row of rows)
      row.hidden = !relations.has(row.dataset.conceptRelation!);
    summary.textContent = description;
    showAll.hidden = false;
    list.open = true;
    summary.focus({ preventScroll: true });
    list.scrollIntoView({ block: "start" });
  });
  showAll.addEventListener("click", () => {
    reset();
    summary.focus();
  });
  list.addEventListener("toggle", () => {
    if (list.open || !opener) return;
    const badge = opener;
    reset();
    if (document.activeElement === summary && badge.getClientRects().length)
      badge.focus();
  });
  return reset;
}
