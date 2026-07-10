import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const cssProbe = path.join(
  process.cwd(),
  "site",
  "styles",
  ".dev-hmr-probe.css",
);
const reloadProbe = path.join(
  process.cwd(),
  "site",
  "components",
  ".dev-hmr-probe.html",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const count = Number(sessionStorage.getItem("dev-load-count") || "0");
    sessionStorage.setItem("dev-load-count", String(count + 1));
  });
  await page.goto("/chapters/scaling/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-dev-live",
    "connected",
  );
});

test("hot-swaps CSS without reloading the page", async ({ page }) => {
  const initialRevision = await getRevision(page);
  const initialLoadCount = await getLoadCount(page);

  try {
    await writeFile(cssProbe, `/* HMR probe ${Date.now()} */\n`, "utf8");
    const updatedRevision = await waitForRevision(page, initialRevision);

    await expect
      .poll(() =>
        page
          .locator('link[rel="stylesheet"]')
          .evaluateAll((stylesheets) =>
            stylesheets.some((stylesheet) =>
              new URL((stylesheet as HTMLLinkElement).href).searchParams.has(
                "dev-hmr",
              ),
            ),
          ),
      )
      .toBe(true);
    expect(await getLoadCount(page)).toBe(initialLoadCount);

    await unlink(cssProbe);
    await waitForRevision(page, updatedRevision);
    expect(await getLoadCount(page)).toBe(initialLoadCount);
  } finally {
    await unlink(cssProbe).catch(() => undefined);
  }
});

test("reloads after structural source changes", async ({ page }) => {
  const initialRevision = await getRevision(page);
  const initialLoadCount = await getLoadCount(page);

  try {
    await writeFile(
      reloadProbe,
      `<!-- reload probe ${Date.now()} -->\n`,
      "utf8",
    );
    const updatedRevision = await waitForRevision(page, initialRevision);
    await expect
      .poll(() => getLoadCount(page))
      .toBeGreaterThan(initialLoadCount);

    await unlink(reloadProbe);
    await waitForRevision(page, updatedRevision);
    await expect
      .poll(() => getLoadCount(page))
      .toBeGreaterThan(initialLoadCount + 1);
  } finally {
    await unlink(reloadProbe).catch(() => undefined);
  }
});

async function getRevision(page: import("@playwright/test").Page) {
  return Number(await page.locator("html").getAttribute("data-dev-revision"));
}

async function waitForRevision(
  page: import("@playwright/test").Page,
  previousRevision: number,
) {
  await expect.poll(() => getRevision(page)).toBeGreaterThan(previousRevision);
  return getRevision(page);
}

async function getLoadCount(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Number(sessionStorage.getItem("dev-load-count") || "0"),
  );
}
