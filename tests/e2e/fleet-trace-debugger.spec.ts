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
    await expect(lab.locator("[data-fleet-trace-verdict]")).toHaveText(
      "5 of 5 ledger rows assigned",
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
    await expect(lab.locator("[data-fleet-trace-verdict]")).toHaveText(
      "0 of 5 ledger rows assigned",
    );
    await expect(lab.locator("[data-fleet-trace-reconcile]")).toBeDisabled();
    const resetValues = await lab
      .locator("[data-fleet-trace-map]")
      .evaluateAll((selects) =>
        selects.map((select) => (select as HTMLSelectElement).value),
      );
    expect(resetValues).toEqual(["", "", "", "", ""]);
  });

  test("keeps linking evidence and its mapping control together on a phone", async ({
    page,
  }) => {
    const lab = page.locator("[data-fleet-trace]");
    await page.setViewportSize({ width: 390, height: 844 });
    const logs = lab.getByText("Inspect orchestration and gateway logs");
    await logs.click();
    await expect(lab.locator("[data-fleet-trace-gateway]")).toContainText(
      "GW-501",
    );
    await expect(lab.locator("[data-fleet-trace-orchestration]")).toContainText(
      "RunCancelled",
    );
    for (const source of await lab.locator(".fleet-trace-source").all()) {
      expect(
        await source
          .locator("table")
          .evaluate(
            (table) =>
              table.getBoundingClientRect().width <=
              table.parentElement!.clientWidth + 1,
          ),
      ).toBe(true);
    }
    await logs.click();

    const records = lab.locator("[data-fleet-trace-row]");
    await expect(records).toHaveCount(5);
    const firstMap = records.first().getByRole("combobox");
    const firstIsWithinOneScreen = await firstMap.evaluate(
      (control) =>
        control.getBoundingClientRect().bottom -
          control.closest("[data-demo-anchor]")!.getBoundingClientRect().top <=
        innerHeight,
    );
    expect(firstIsWithinOneScreen).toBe(true);
    for (const record of await records.all()) {
      const fits = await record.evaluate((item) => {
        const bounds = item.getBoundingClientRect();
        const evidence = item.querySelector("code")!.getBoundingClientRect();
        const control = item.querySelector("select")!.getBoundingClientRect();
        return [evidence, control].every(
          (part) =>
            part.left >= bounds.left &&
            part.right <= bounds.right &&
            part.left >= 0 &&
            part.right <= innerWidth,
        );
      });
      expect(fits).toBe(true);
    }

    await mapRows(lab, correctMappings);
    await lab.locator("[data-fleet-trace-reconcile]").click();
    await expect(lab.locator("[data-fleet-trace-results]")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
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
