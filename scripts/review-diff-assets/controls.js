const files = [...document.querySelectorAll("details.file")];
const filter = document.querySelector("#filter");
const status = document.querySelector("#filter-status");

function applyFilter() {
  const query = filter.value.toLowerCase();
  for (const file of files) {
    file.hidden = !file.dataset.path.toLowerCase().includes(query);
  }
  for (const heading of document.querySelectorAll(".group-title")) {
    let sibling = heading.nextElementSibling;
    let visible = false;
    while (sibling && !sibling.classList.contains("group-title")) {
      if (sibling.classList.contains("file") && !sibling.hidden) visible = true;
      sibling = sibling.nextElementSibling;
    }
    heading.hidden = !visible;
  }
  status.textContent = query
    ? `${files.filter((file) => !file.hidden).length} of ${files.length} files`
    : "";
}

filter.addEventListener("input", applyFilter);
document.querySelector("#expand").addEventListener("click", () => {
  for (const file of files) if (!file.hidden) file.open = true;
});
document.querySelector("#collapse").addEventListener("click", () => {
  for (const file of files) if (!file.hidden) file.open = false;
});
document.querySelector("#mode").addEventListener("click", (event) => {
  const enabled = document.body.classList.toggle("after-only");
  event.currentTarget.textContent = enabled
    ? "Show before + after"
    : "Read revised text only";
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
});

function revealHash() {
  const file = document.getElementById(location.hash.slice(1));
  if (!file?.classList.contains("file")) return;
  filter.value = "";
  applyFilter();
  file.open = true;
}
window.addEventListener("hashchange", revealHash);
for (const link of document.querySelectorAll("nav a")) {
  link.addEventListener("click", () => {
    filter.value = "";
    applyFilter();
    document.getElementById(link.hash.slice(1)).open = true;
  });
}
revealHash();
