const demos = document.querySelectorAll<HTMLElement>("[data-demo-anchor][id]");

for (const demo of demos) {
  const labelId = demo.getAttribute("aria-labelledby")?.split(/\s+/)[0];
  const heading = labelId
    ? demo.querySelector<HTMLElement>(`#${CSS.escape(labelId)}`)
    : demo.querySelector<HTMLElement>("h2, h3, h4");

  if (!heading || heading.querySelector("[data-demo-permalink]")) continue;

  const title = heading.textContent?.trim() || "this demo";
  const permalink = document.createElement("a");
  permalink.className = "demo-permalink";
  permalink.dataset.demoPermalink = "";
  permalink.href = `#${demo.id}`;
  permalink.setAttribute("aria-label", `Link to ${title}`);
  permalink.title = "Link to this demo";
  permalink.textContent = "#";
  heading.append(permalink);
}
