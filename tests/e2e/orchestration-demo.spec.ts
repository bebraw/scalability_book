import { expect, test } from "@playwright/test";

test.describe("orchestration control-loop demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chapters/scaling/#orchestration-as-a-control-loop");
    const demo = page.locator("[data-orchestration-lab]");
    await expect(demo).toBeVisible();
    await expect(demo.locator("[data-orchestration-status]")).toContainText(
      "Desired and observed state match",
      { timeout: 20_000 },
    );
  });

  test("routes traffic and reconciles replicas, failure, and a rollout", async ({
    page,
  }) => {
    const demo = page.locator("[data-orchestration-lab]");

    await expect(
      demo.locator("[data-orchestration-metric='desired']"),
    ).toHaveText("3");
    await expect(
      demo.locator("[data-orchestration-metric='running']"),
    ).toHaveText("3");
    await expect(demo.locator("[data-pod-name]")).toHaveCount(3);
    await expect(demo.locator("[data-orchestration-burst]")).toBeEnabled();

    await demo.locator("[data-orchestration-burst]").click();
    await expect(
      demo.locator("[data-orchestration-metric='served']"),
    ).toHaveText("6");
    await expect(demo.locator("[data-orchestration-log]")).toContainText(
      "Service",
    );

    await demo.locator("[data-orchestration-replicas]").fill("5");
    await demo.locator("[data-orchestration-apply]").click();
    await expect(demo.locator("[data-orchestration-status]")).toContainText(
      "Converged at 5 replicas",
      { timeout: 20_000 },
    );
    await expect(
      demo.locator("[data-orchestration-metric='running']"),
    ).toHaveText("5");

    const namesBeforeFailure = await podNames(demo);
    await demo.locator("[data-orchestration-terminate]").click();
    await expect(demo.locator("[data-orchestration-status]")).toContainText(
      "ReplicaSet restored the desired count",
      { timeout: 20_000 },
    );
    await expect(demo.locator("[data-pod-name]")).toHaveCount(5);
    expect(await podNames(demo)).not.toEqual(namesBeforeFailure);

    await demo.locator("[data-orchestration-rollout]").click();
    await expect(demo.locator("[data-orchestration-status]")).toContainText(
      "Release v2 is fully rolled out",
      { timeout: 25_000 },
    );
    await expect(
      demo.locator("[data-orchestration-metric='release']"),
    ).toHaveText("v2");
    await expect(demo.locator("[data-pod-release='v2']")).toHaveCount(5);
    await expect(demo.locator("[data-orchestration-rollout]")).toBeDisabled();

    const overflow = await demo.evaluate((root: HTMLElement) => {
      const rootRect = root.getBoundingClientRect();
      return Array.from(
        root.querySelectorAll(".orchestration-console > *"),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          rootLeft: Math.round(rootRect.left),
          rootRight: Math.round(rootRect.right),
        };
      });
    });
    expect(
      overflow.every(
        ({ left, right, rootLeft, rootRight }) =>
          left >= rootLeft - 1 && right <= rootRight + 1,
      ),
    ).toBe(true);
  });

  test("inherits the active book theme", async ({ page }) => {
    const demo = page.locator("[data-orchestration-lab]");
    const picker = page.locator("[data-theme-picker]");

    const colors: string[] = [];
    for (const theme of ["light", "dark", "sepia", "calm", "contrast"]) {
      await picker.selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      colors.push(
        await demo.evaluate((element) => {
          const style = getComputedStyle(element);
          const button = element.querySelector("button");
          const buttonStyle = button ? getComputedStyle(button) : style;
          return [
            style.backgroundColor,
            style.color,
            style.borderTopColor,
            buttonStyle.backgroundColor,
          ].join("|");
        }),
      );
    }

    expect(new Set(colors).size).toBe(5);
  });
});

async function podNames(demo: import("@playwright/test").Locator) {
  return await demo
    .locator("[data-pod-name]")
    .evaluateAll((pods) =>
      pods.map((pod) => (pod as HTMLElement).dataset.podName ?? "").sort(),
    );
}
