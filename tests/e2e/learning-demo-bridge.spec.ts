import { test, expect, type Page } from "@playwright/test";
import { demoResources } from "../../shared/learning-resources.ts";

async function openDemoBridge(page: Page, id: string) {
  await page.goto(`/demos/#${id}`);
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "My learning notebook" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
}

async function observeDemo(page: Page, id: string) {
  return page.evaluate((demoId) => {
    const bridge = (
      window as unknown as {
        BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
      }
    ).BookLearningWorkspace;
    return bridge.observeLearningDemo(demoId);
  }, id);
}

async function changeDemoControl(
  page: Page,
  id: string,
  controlId: unknown,
  value: unknown,
) {
  return page.evaluate(
    async (args) => {
      const bridge = (
        window as unknown as {
          BookLearningWorkspace: typeof import("../../site/scripts/learning-demos.ts");
        }
      ).BookLearningWorkspace;
      return bridge.changeLearningDemo(args.id, {
        controlId: args.controlId,
        value: args.value,
      });
    },
    { id, controlId, value },
  );
}

test("assistant button action submits the ACID trace form", async ({
  page,
}) => {
  const id = "demo-acid-transaction-lab";
  await openDemoBridge(page, id);
  const demo = page.locator(`#${id}`);
  await expect(demo).toHaveAttribute("data-acid-result", "ready");
  await demo.evaluate((root) => {
    const externalForm = document.createElement("form");
    externalForm.id = "synthetic-external-form";
    document.body.append(externalForm);
    for (const [label, form] of [
      ["Submit external form", externalForm.id],
      ["Submit without a form", "synthetic-absent-form"],
    ]) {
      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = label!;
      button.setAttribute("form", form!);
      root.append(button);
    }
  });

  const before = await observeDemo(page, id);
  expect(before.controls.map((control) => control.label)).not.toContain(
    "Submit external form",
  );
  expect(before.controls.map((control) => control.label)).not.toContain(
    "Submit without a form",
  );
  const run = before.controls.find(
    (control) => control.label === "Reveal modeled trace",
  );
  expect(run).toMatchObject({ type: "button" });
  const after = await changeDemoControl(page, id, run!.id, null);

  await expect(demo).toHaveAttribute("data-acid-result", "broken");
  await expect(demo.locator("[data-acid-item-state]")).toHaveText("Finished");
  await expect(demo.locator("[data-acid-events]")).toContainText(
    "No activity events stored",
  );
  expect(after.visibleText).toContain("Finished");
  await expect(page).toHaveURL(`/demos/#${id}`);
});

test("assistant button action respects the tail-latency prediction gate", async ({
  page,
}) => {
  const id = "demo-tail-latency-simulator";
  const runLabel = "Test prediction on 60 requests";
  await openDemoBridge(page, id);
  const demo = page.locator(`#${id}`);
  await expect(demo.getByRole("button", { name: runLabel })).toBeDisabled();

  const before = await observeDemo(page, id);
  expect(before.controls.some((control) => control.label === runLabel)).toBe(
    false,
  );
  const prediction = before.controls.find(
    (control) => control.label === "Average passes; p95 fails",
  );
  expect(prediction).toMatchObject({ type: "radio", value: false });
  const predicted = await changeDemoControl(page, id, prediction!.id, true);
  const run = predicted.controls.find((control) => control.label === runLabel);
  expect(run).toMatchObject({ type: "button" });
  const after = await changeDemoControl(page, id, run!.id, null);

  await expect(demo.locator("[data-benchmark-demo-verdict]")).toHaveText(
    "Prediction confirmed — average passes; p95 fails",
  );
  await expect(demo.locator("[data-benchmark-demo-chart] i")).toHaveCount(60);
  expect(after.visibleText).toContain("217 ms");
  expect(after.controls.some((control) => control.id === run!.id)).toBe(false);
  await expect(page).toHaveURL(`/demos/#${id}`);
});

test("assistant button action completes five browser-performance trials", async ({
  page,
}) => {
  const id = "demo-browser-performance-workbench";
  await openDemoBridge(page, id);
  const demo = page.locator(`#${id}`);
  await expect(demo.locator("[data-browser-performance-status]")).toHaveText(
    "Ready for five local runs",
  );

  const before = await observeDemo(page, id);
  const workload = before.controls.find((control) =>
    String(control.label).startsWith("Rendered events"),
  );
  expect(workload).toMatchObject({ type: "select" });
  const configured = await changeDemoControl(page, id, workload!.id, "250");
  const run = configured.controls.find(
    (control) => control.label === "Run five trials",
  );
  expect(run).toMatchObject({ type: "button" });
  await changeDemoControl(page, id, run!.id, null);

  await expect(demo.locator("[data-browser-performance-status]")).toContainText(
    "Five runs complete",
    { timeout: 15_000 },
  );
  await expect(demo.locator(".browser-performance-run")).toHaveCount(5);
  await expect(
    demo.locator('[data-browser-performance-metric="median"]'),
  ).toContainText("ms");
  const after = await observeDemo(page, id);
  expect(after.visibleText).toContain("250 events produced");
  expect(after.controls).toContainEqual(
    expect.objectContaining({ id: run!.id, type: "button" }),
  );
  await expect(page).toHaveURL(`/demos/#${id}`);
});

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
