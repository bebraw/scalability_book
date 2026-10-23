import { expect, test } from "@playwright/test";

test("saturation distinguishes spare capacity, no headroom and excess demand", async ({
  page,
}) => {
  await page.goto("/demos/#demo-saturation-boundary-lab");
  const demo = page.locator("[data-saturation-boundary-demo]");
  await demo.locator("[data-saturation-boundary-load]").fill("105");
  await expect(
    demo.locator('[data-saturation-boundary-metric="headroom"]'),
  ).toHaveText("5 ev/s");
  await expect(
    demo.locator("[data-saturation-boundary-diagnosis]"),
  ).toContainText("spare capacity");

  await demo.locator("[data-saturation-boundary-load]").fill("110");
  await expect(
    demo.locator("[data-saturation-boundary-verdict]"),
  ).toContainText("at capacity");
  await expect(
    demo.locator("[data-saturation-boundary-diagnosis]"),
  ).toContainText("no headroom");
  await expect(
    demo.locator('[data-saturation-boundary-metric="backlog"]'),
  ).toHaveText("0 ev/s");
  await expect(
    demo.locator('[data-saturation-boundary-metric="rejected"]'),
  ).toHaveText("0 ev/s");

  await demo.locator("[data-saturation-boundary-load]").fill("115");
  await expect(
    demo.locator('[data-saturation-boundary-metric="backlog"]'),
  ).toHaveText("5 ev/s");
  await demo.locator("[data-saturation-boundary-backpressure]").check();
  await expect(
    demo.locator('[data-saturation-boundary-metric="backlog"]'),
  ).toHaveText("0 ev/s");
  await expect(
    demo.locator('[data-saturation-boundary-metric="rejected"]'),
  ).toHaveText("5 ev/s");
});

test("latency advice retains the calculated batching saving without ranking unmodeled interventions", async ({
  page,
}) => {
  await page.goto("/demos/#demo-latency-budget-map");
  const demo = page.locator("[data-latency-demo]");
  await demo
    .locator('[data-latency-demo-distance="appDb"]')
    .selectOption("500");
  await expect(demo.locator('[data-latency-demo-metric="total"]')).toHaveText(
    "117 ms",
  );
  await expect(
    demo.locator('[data-latency-demo-metric="avoidable"]'),
  ).toHaveText("28 ms");
  await expect(
    demo.locator("[data-latency-demo-interpretation]"),
  ).toContainText("28 ms");
  await expect(
    demo.locator("[data-latency-demo-interpretation]"),
  ).not.toContainText("larger architectural fix");
  await demo.locator('[data-latency-demo-distance="appDb"]').selectOption("1");
  await expect(demo.locator('[data-latency-demo-metric="total"]')).toHaveText(
    "75 ms",
  );
});

test("a still-rising contention curve does not acquire an optimum at the chart edge", async ({
  page,
}) => {
  await page.goto("/demos/#demo-contention-curve-lab");
  const demo = page.locator("[data-usl-demo]");
  await demo.locator('[data-usl-input="alpha"]').fill("0");
  await demo.locator('[data-usl-input="beta"]').fill("0");
  await demo.locator('[data-usl-input="concurrency"]').fill("32");
  await expect(demo.locator('[data-usl-metric="selected"]')).toHaveText(
    "32.00×",
  );
  await expect(demo.locator("[data-usl-reading]")).toContainText("linear");
  await expect(demo.locator("[data-usl-chart]")).not.toHaveAttribute(
    "aria-label",
    /Peak is/,
  );
  await expect(demo.locator("[data-usl-reading]")).not.toContainText(
    "peaks at 32",
  );

  await demo.locator('[data-usl-input="alpha"]').fill("0.03");
  await expect(demo.locator("[data-usl-reading]")).toContainText(
    "beyond the displayed range",
  );
  await expect(demo.locator("[data-usl-chart]")).not.toHaveAttribute(
    "aria-label",
    /Peak is/,
  );
  await demo.locator('[data-usl-input="beta"]').fill("0.002");
  await expect(demo.locator('[data-usl-metric="peak-n"]')).toHaveText("22");
  await expect(demo.locator("[data-usl-chart]")).toHaveAttribute(
    "aria-label",
    /Peak is/,
  );
});

test("reliability separates an already-met target from absent detection and required repair", async ({
  page,
}) => {
  await page.goto("/demos/#demo-reliability-chain-lab");
  const demo = page.locator("[data-lusser-law-demo]");
  await demo.locator('[data-lusser-law-input="steps"]').fill("1");
  await demo.locator('[data-lusser-law-input="detection"]').fill("0");
  await demo.locator('[data-lusser-law-input="recovery"]').fill("0");
  await expect(demo.locator('[data-lusser-law-metric="correct"]')).toHaveText(
    "95.0%",
  );
  await expect(demo.locator('[data-lusser-law-metric="wrong"]')).toHaveText(
    "5.0%",
  );
  await expect(demo.locator("[data-lusser-law-reading]")).toContainText(
    "already meets",
  );
  await expect(demo.locator("[data-lusser-law-reading]")).not.toContainText(
    "at least 100.0%",
  );
  await demo.locator('[data-lusser-law-input="steps"]').fill("2");
  await expect(demo.locator("[data-lusser-law-reading]")).toContainText(
    "cannot reach",
  );
  await demo.locator('[data-lusser-law-input="detection"]').fill("100");
  await expect(demo.locator("[data-lusser-law-reading]")).toContainText(
    "at least 49.4%",
  );
});
