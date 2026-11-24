import { expect, test } from "@playwright/test";

for (const width of [390, 320]) {
  test(`compact homepage header keeps navigation, learning actions, Account and Theme usable at ${width}px`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.route("**/api/auth/status", (route) =>
      route.fulfill({
        json: { available: true, authenticated: false, admin: false },
      }),
    );
    await page.goto("/");
    const header = page.locator(".site-header");
    const nav = header.getByRole("navigation", { name: "Primary" });
    const brand = header.getByRole("link", {
      name: "Elements of Scalable Web Development",
    });
    const links = ["Contents", "Project", "Cases", "Demos", "Concepts"].map(
      (name) => nav.getByRole("link", { name, exact: true }),
    );
    const buttons = [
      "Learning cockpit",
      "Learning diary",
      "Teaching assistant",
      "Account",
    ].map((name) =>
      header.getByRole(name === "Learning diary" ? "link" : "button", {
        name,
        exact: true,
      }),
    );
    const picker = header.getByRole("combobox", { name: "Theme" });
    for (const button of buttons) await expect(button).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const headerBox = (await header.boundingBox())!;
    if (width === 390) expect(headerBox.height).toBeLessThan(96);
    const brandText = await brand.evaluate((link) => {
      const style = getComputedStyle(link);
      const context = document.createElement("canvas").getContext("2d")!;
      context.font = style.font;
      return {
        available:
          link.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        firstWord: context.measureText("Elements").width,
      };
    });
    expect(brandText.available).toBeGreaterThanOrEqual(brandText.firstWord);

    // On macOS, Option-Tab includes links in Safari’s keyboard navigation.
    const tab =
      browserName === "webkit" && process.platform === "darwin"
        ? "Alt+Tab"
        : "Tab";
    await page.getByRole("link", { name: "Skip to content" }).focus();
    const boxes = [];
    for (const control of [brand, ...links, ...buttons, picker]) {
      await page.keyboard.press(tab);
      await expect(control).toBeFocused();
      await control.click({ trial: true, timeout: 5_000 });
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(
        headerBox.y + headerBox.height,
      );
      boxes.push(box);
    }
    const primary = boxes.slice(0, 1 + links.length);
    const actions = boxes.slice(primary.length);
    expect(
      Math.max(...primary.map((box) => box.y + box.height)),
    ).toBeLessThanOrEqual(Math.min(...actions.map((box) => box.y)));
    for (const row of [primary, actions]) {
      for (const [i, box] of row.slice(1).entries()) {
        const previous = row[i];
        const startsNewLine = box.y >= previous.y + previous.height;
        if (width === 390 || !startsNewLine) {
          expect(box.x).toBeGreaterThanOrEqual(previous.x + previous.width);
        }
      }
    }
    expect((await picker.boundingBox())!.width).toBeLessThanOrEqual(44);
    await page.keyboard.press("d");
    await expect(picker).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}

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
          name: "Concept explorer",
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
