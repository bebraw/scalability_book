import { test, expect } from "@playwright/test";
import { demoResources } from "../../shared/learning-resources.ts";
test("every authored demo declares live observations and bounded controls", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/demos/");
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "My learning notebook" }),
  ).toBeVisible();
  await expect(page.locator("[data-orchestration-replicas]")).toBeEnabled({
    timeout: 15_000,
  });
  const report = await page.evaluate(
    async (ids) => {
      const bridge = (
        window as unknown as {
          BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
        }
      ).BookLearningWorkspace;
      const result = [];
      for (const id of ids) {
        const before = bridge.observeLearningDemo(id);
        const control = before.controls[0]!;
        if (!control) throw new Error(`${id} has no declared controls`);
        let invalidRejected = false;
        try {
          await bridge.changeLearningDemo(id, {
            controlId: "forged-selector",
            value: null,
          });
        } catch {
          invalidRejected = true;
        }
        let value: unknown;
        if (control.type === "checkbox" || control.type === "radio")
          value = !control.value;
        else if (control.type === "select") {
          const options = control.options as { value: string }[];
          value = (
            options.find((option) => option.value !== control.value) ??
            options[0]!
          ).value;
        } else if (control.type === "range" || control.type === "number") {
          const min = Number(control.min),
            max = Number(control.max),
            step = Number(control.step ?? 1);
          value =
            Number(control.value) + step <= max
              ? Number(control.value) + step
              : min;
        } else if (control.type === "button") value = null;
        else
          value = "Synthetic changed scenario".slice(
            0,
            Number(control.maxLength),
          );
        const after = await bridge.changeLearningDemo(id, {
          controlId: control.id,
          value,
        });
        result.push({
          id,
          version: before.version,
          inputCount: before.controls.length,
          text: after.visibleText.length,
          invalidRejected,
        });
      }
      return result;
    },
    demoResources.map((demo) => demo.id),
  );
  expect(report).toHaveLength(demoResources.length);
  for (const demo of report) {
    expect(demo.version).toBe(1);
    expect(demo.inputCount).toBeGreaterThan(0);
    expect(demo.text).toBeGreaterThan(0);
    expect(demo.invalidRejected).toBe(true);
  }
  const cache = await page.evaluate(() => {
    const bridge = (
      window as unknown as {
        BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
      }
    ).BookLearningWorkspace;
    return bridge.observeLearningDemo("demo-cache-decision-lab");
  });
  expect(cache.assumptions).toContain("Warm browser and shared entries");
  expect(cache.visibleText).toContain("Cache-Control");
});
