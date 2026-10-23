import { events } from "./fixture.mjs";
import { serializeEvents } from "./export.mjs";

const filter = document.querySelector("#filter");
const body = document.querySelector("#events");
const status = document.querySelector("#status");
const visibleEvents = () => {
  const query = filter.value.toLocaleLowerCase();
  return events.filter((event) =>
    `${event.title} ${event.location}`.toLocaleLowerCase().includes(query),
  );
};
function render() {
  body.replaceChildren(
    ...visibleEvents().map((event) => {
      const row = document.createElement("tr");
      for (const value of [event.title, event.location]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }),
  );
  const count = visibleEvents().length;
  document.querySelector("#count").textContent =
    `${count} visible ${count === 1 ? "record" : "records"}`;
}
filter.addEventListener("input", render);
document.querySelector("#export").addEventListener("click", () => {
  try {
    const csv = serializeEvents(visibleEvents());
    if (typeof csv !== "string")
      throw new Error("serializeEvents must return a string.");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "events.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    status.textContent =
      "Download requested. Inspect events.csv and run the supplied checks.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
});
render();
