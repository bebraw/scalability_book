import { expect, test } from "@playwright/test";

type ThemeFrame = { theme?: string; scheme: string; background: string };
type ThemeWindow = Window & { themeFrames: ThemeFrame[] };

const scenarios = [
  {
    name: "saved dark",
    stored: "dark",
    system: "light",
    theme: "dark",
    scheme: "dark",
    background: "rgb(18, 21, 20)",
  },
  {
    name: "system dark",
    stored: null,
    system: "dark",
    theme: "dark",
    scheme: "dark",
    background: "rgb(18, 21, 20)",
  },
  {
    name: "saved light overrides system dark",
    stored: "light",
    system: "dark",
    theme: "light",
    scheme: "light",
    background: "rgb(248, 246, 240)",
  },
  {
    name: "saved high contrast",
    stored: "contrast",
    system: "light",
    theme: "contrast",
    scheme: "dark",
    background: "rgb(0, 0, 0)",
  },
  {
    name: "invalid saved theme",
    stored: "unknown",
    system: "dark",
    theme: "dark",
    scheme: "dark",
    background: "rgb(18, 21, 20)",
  },
  {
    name: "unavailable storage",
    stored: null,
    system: "dark",
    theme: "dark",
    scheme: "dark",
    background: "rgb(18, 21, 20)",
  },
] as const;

for (const scenario of scenarios) {
  test(`${scenario.name} is applied before the deferred theme bundle on Concepts`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scenario.system });
    await page.addInitScript(
      ({ stored, blocked }) => {
        if (stored) localStorage.setItem("theme", stored);
        if (blocked) {
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new DOMException("Storage disabled", "SecurityError");
            },
          });
        }
        const frames: ThemeFrame[] = [];
        (window as ThemeWindow).themeFrames = frames;
        const sample = () => {
          if (
            document.body &&
            getComputedStyle(document.body).getPropertyValue("--bg")
          ) {
            frames.push({
              theme: document.documentElement.dataset.theme,
              scheme: getComputedStyle(document.documentElement).colorScheme,
              background: getComputedStyle(document.body).backgroundColor,
            });
          }
          if (frames.length < 4) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
      {
        stored: scenario.stored,
        blocked: scenario.name === "unavailable storage",
      },
    );
    // Exercise the reported link navigation as well as cold page loads.
    if (scenario.name === "saved dark") {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    }
    let release!: () => void;
    let requested!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const received = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route(/\/theme(?:\.[a-f0-9]+)?\.js(?:\?|$)/, async (route) => {
      requested();
      await held;
      await route.continue();
    });
    try {
      if (scenario.name === "saved dark") {
        await page.getByRole("link", { name: "Concepts", exact: true }).click({
          noWaitAfter: true,
        });
        await page.waitForURL("**/concepts/", { waitUntil: "commit" });
      } else {
        await page.goto("/concepts/", { waitUntil: "commit" });
      }
      await received;
      await expect(
        page.getByRole("heading", {
          name: "Concepts that connect",
          exact: true,
        }),
      ).toBeVisible();
      await page.waitForFunction(
        () => (window as ThemeWindow).themeFrames.length >= 4,
      );
      const frames = await page.evaluate(
        () => (window as ThemeWindow).themeFrames,
      );
      expect(frames).toEqual(
        Array(4).fill({
          theme: scenario.theme,
          scheme: scenario.scheme,
          background: scenario.background,
        }),
      );
      await expect(page.locator("html")).toHaveCSS(
        "background-color",
        scenario.background,
      );
    } finally {
      release();
      await page.waitForLoadState("domcontentloaded");
    }
    const picker = page.getByRole("combobox", { name: "Theme", exact: true });
    await expect(picker).toHaveValue(scenario.theme);
    await picker.selectOption("sepia");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(244, 236, 217)",
    );
    if (scenario.name !== "unavailable storage")
      expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
        "sepia",
      );
  });
}

test("saved dark sets the browser color scheme before stylesheets arrive", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  let release!: () => void;
  let requested!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const received = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(/\.css(?:\?|$)/, async (route) => {
    requested();
    await held;
    await route.continue();
  });
  try {
    await page.goto("/concepts/", { waitUntil: "commit" });
    await received;
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(() => document.documentElement.style.colorScheme),
    ).toBe("dark");
  } finally {
    release();
    await page.waitForLoadState("domcontentloaded");
  }
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});
