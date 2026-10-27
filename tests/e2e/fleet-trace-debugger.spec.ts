import { expect, test } from "@playwright/test";

const correctMappings = {
  "A-4101": "R41",
  "A-4102": "R41",
  "A-4103": "R41",
  "T-4201": "R42",
  "A-X901": "unmatched",
} as const;

test.describe("fleet trace debugger", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/appendices/agent-system-security/#fleet-trace-debugger");
    await expect(page.locator("[data-fleet-trace]")).toBeVisible();
  });

  test("joins retries and fallback once and rolls up the fixed cohort", async ({
    page,
    context,
  }, testInfo) => {
    const lab = page.locator("[data-fleet-trace]");
    const reconcile = lab.locator("[data-fleet-trace-reconcile]");

    await expect(reconcile).toBeDisabled();
    await mapRows(lab, {
      "A-4101": "R41",
      "A-4102": "R41",
      "A-4103": "R41",
      "T-4201": "R42",
    });
    await expect(reconcile).toBeDisabled();
    await lab
      .locator("[data-fleet-trace-map='A-X901']")
      .selectOption("unmatched");
    await expect(lab.locator("[data-fleet-trace-progress]")).toHaveText(
      "5 / 5 mapped",
    );
    await expect(reconcile).toBeEnabled();

    await reconcile.click();
    await expect(lab).toHaveAttribute("data-fleet-trace-state", "reconciled");
    await expect(lab.locator("[data-fleet-trace-results]")).toBeVisible();
    await expectMetric(lab, "rows", "5");
    await expectMetric(lab, "accepted", "1");
    await expectMetric(lab, "cost", "0.44 EUR + 1 unpriced");
    await expectMetric(lab, "cost-per-accepted", "0.44 EUR + 1 unpriced");

    const r41 = lab.locator("[data-fleet-trace-rollup='R41']");
    await expect(r41).toContainText("Accepted");
    await expect(r41).toContainText("3");
    await expect(r41).toContainText("small-v3 retry");
    await expect(r41).toContainText("strong-v5 fallback");
    await expect(r41).toContainText("0.38 EUR");
    await expect(
      lab.locator("[data-fleet-trace-finding='retry-fallback']"),
    ).toContainText("timed-out cheap call");

    await expect(lab.locator("[data-fleet-trace-artifact]")).toHaveValue(
      /A-4101 -> R41/,
    );
    await expect(lab.locator("[data-fleet-trace-artifact]")).toHaveValue(
      /A-4102 -> R41/,
    );
    await expect(lab.locator("[data-fleet-trace-artifact]")).toHaveValue(
      /Cost per accepted run: 0.44 EUR \+ 1 unpriced resource row/,
    );

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await lab
      .getByText("Export the reconciliation record", { exact: true })
      .click();
    await lab.locator("[data-fleet-trace-copy]").click();
    await expect(lab.locator("[data-fleet-trace-copy]")).toHaveText("Copied");
    const copiedRecord = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    await testInfo.attach("copied-fleet-trace-record", {
      body: copiedRecord,
      contentType: "text/plain",
    });
    expect(copiedRecord).toBe(
      await lab.locator("[data-fleet-trace-artifact]").inputValue(),
    );
    expect(copiedRecord).toMatch(/fixed synthetic teaching packet/i);
    expect(copiedRecord).toMatch(/no models or tools execute/i);
    expect(copiedRecord).toContain(
      "https://scalableweb.dev/appendices/agent-system-security/#fleet-trace-debugger",
    );
  });

  test("keeps the direct-provider row unmatched using positive bypass evidence", async ({
    page,
  }) => {
    const lab = page.locator("[data-fleet-trace]");

    await mapRows(lab, { ...correctMappings, "A-X901": "R41" });
    await lab.locator("[data-fleet-trace-reconcile]").click();

    await expect(lab).toHaveAttribute("data-fleet-trace-state", "conflict");
    await expect(lab.locator("[data-fleet-trace-results]")).toBeHidden();
    await expect(lab.locator("[data-fleet-trace-verdict]")).toHaveText(
      "1 mapping conflict",
    );
    const directRow = lab.locator("[data-fleet-trace-row='A-X901']");
    await expect(directRow).toHaveAttribute(
      "data-fleet-trace-status",
      "conflict",
    );
    await expect(directRow.locator("[data-fleet-trace-check]")).toContainText(
      "direct network path",
    );
    await expect(directRow.locator("[data-fleet-trace-check]")).toContainText(
      "complete gateway export",
    );

    await directRow.locator("[data-fleet-trace-map]").selectOption("unmatched");
    await lab.locator("[data-fleet-trace-reconcile]").click();
    await expect(lab.locator("[data-fleet-trace-results]")).toBeVisible();
    const bypass = lab.locator("[data-fleet-trace-finding='bypass']");
    await expect(bypass).toContainText("network_path=provider-direct");
    await expect(bypass).toContainText("credential=direct-prod-2");
    await expect(bypass).toContainText("gateway export is declared complete");
  });

  test("preserves the cancelled outcome beside the late tool effect and resets", async ({
    page,
  }) => {
    const lab = page.locator("[data-fleet-trace]");

    await mapRows(lab, correctMappings);
    await lab.locator("[data-fleet-trace-reconcile]").click();

    const lateEffect = lab.locator("[data-fleet-trace-finding='late-effect']");
    await expect(lateEffect).toContainText("09:16:06");
    await expect(lateEffect).toContainText("09:16:09");
    await expect(lateEffect).toContainText("R42 remains cancelled");
    const r42 = lab.locator("[data-fleet-trace-rollup='R42']");
    await expect(r42).toContainText("Cancelled; late effect observed");
    await expect(r42).toContainText("Unpriced");

    await lab.locator("[data-fleet-trace-reset]").click();
    await expect(lab).toHaveAttribute("data-fleet-trace-state", "mapping");
    await expect(lab.locator("[data-fleet-trace-results]")).toBeHidden();
    await expect(lab.locator("[data-fleet-trace-progress]")).toHaveText(
      "0 / 5 mapped",
    );
    await expect(lab.locator("[data-fleet-trace-reconcile]")).toBeDisabled();
    const resetValues = await lab
      .locator("[data-fleet-trace-map]")
      .evaluateAll((selects) =>
        selects.map((select) => (select as HTMLSelectElement).value),
      );
    expect(resetValues).toEqual(["", "", "", "", ""]);
  });

  test("contains wide evidence tables on a mobile viewport", async ({
    page,
  }) => {
    const lab = page.locator("[data-fleet-trace]");

    await page.setViewportSize({ width: 390, height: 844 });
    await mapRows(lab, correctMappings);
    await lab.locator("[data-fleet-trace-reconcile]").click();
    await expect(lab.locator("[data-fleet-trace-results]")).toBeVisible();

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);

    const physicalOverflow = await lab
      .locator(".fleet-trace-physical-wrap")
      .evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
        overflow: getComputedStyle(element).overflowX,
      }));
    expect(physicalOverflow.scroll).toBeGreaterThan(physicalOverflow.client);
    expect(physicalOverflow.overflow).toBe("auto");
  });
});

async function mapRows(
  lab: import("@playwright/test").Locator,
  mappings: Partial<Record<keyof typeof correctMappings, string>>,
) {
  for (const [attempt, run] of Object.entries(mappings)) {
    await lab.locator(`[data-fleet-trace-map='${attempt}']`).selectOption(run);
  }
}

async function expectMetric(
  lab: import("@playwright/test").Locator,
  metric: string,
  value: string,
) {
  await expect(lab.locator(`[data-fleet-trace-metric='${metric}']`)).toHaveText(
    value,
  );
}
