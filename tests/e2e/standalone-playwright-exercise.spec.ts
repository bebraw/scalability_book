import { expect, test } from "@playwright/test";

test("standalone exercise filters recorded events", async ({ page }) => {
  await page.setContent(`
    <label>
      Filter events
      <input type="search" data-filter />
    </label>
    <ul aria-label="Events">
      <li>event.created</li>
      <li>storage.retry</li>
      <li>event.observed</li>
    </ul>
    <script>
      const filter = document.querySelector("[data-filter]");
      const events = [...document.querySelectorAll("li")];

      filter.addEventListener("input", () => {
        const query = filter.value.toLowerCase();
        for (const event of events) {
          event.hidden = !event.textContent.toLowerCase().includes(query);
        }
      });
    </script>
  `);

  await page.getByRole("searchbox", { name: "Filter events" }).fill("retry");
  await expect(page.locator("li:visible")).toHaveText(["storage.retry"]);
});
