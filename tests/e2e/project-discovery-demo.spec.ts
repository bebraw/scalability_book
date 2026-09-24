import { expect, test } from "@playwright/test";

test.describe("implementation discovery lab", () => {
  test("turns open implementation choices into a reusable direction", async ({
    page,
  }) => {
    await page.goto("/demos/");

    const lab = page.locator("[data-project-fit]");
    await expect(lab).toBeVisible();
    await expect(lab.locator("[data-project-fit-score]")).toHaveText(
      "0/4 choices recorded",
    );
    await expect(lab).not.toContainText("Too thin");

    await lab.locator('[data-project-fit-preset="agents"]').click();
    await expect(lab.locator('[name="workspaceMeaning"]')).toHaveValue(
      "One agent fleet run",
    );

    await lab.locator('[data-project-fit-tab="1"]').click();
    await lab.locator('[data-project-fit-stack="elixir"]').click();
    await lab
      .locator('[name="curiosity"]')
      .fill("We want to examine server-driven interaction and supervision.");

    await lab.locator('[data-project-fit-tab="2"]').click();
    await lab
      .locator('[name="architecture"]')
      .selectOption("An event-oriented core with derived views");
    await lab
      .locator('[name="deployment"]')
      .fill("A documented local container and one validation command");
    await lab
      .locator('[name="boundary"]')
      .fill("Task transitions and their activity events stay atomic");

    await lab.locator('[data-project-fit-tab="3"]').click();
    await lab
      .locator('[name="question"]')
      .fill("Can the event history expose failed agent handoffs clearly?");
    await lab
      .locator('[name="evidence"]')
      .fill("Shared workload, setup time, trace failures, and review notes");
    await lab
      .locator('[name="auditPlan"]')
      .fill("Pinned versions, seed data, setup command, and test command");

    await expect(lab.locator("[data-project-fit-score]")).toHaveText(
      "4/4 choices recorded",
    );
    await lab.locator('[data-project-fit-tab="4"]').click();

    const output = lab.locator("[data-project-fit-output]");
    await expect(output).toHaveValue(
      /# Implementation Direction[\s\S]*Elixir with Phoenix and LiveView/,
    );
    await expect(output).toHaveValue(
      /Can the event history expose failed agent handoffs clearly\?/,
    );
    await expect(lab.locator("[data-project-fit-checks] .is-pass")).toHaveCount(
      4,
    );
  });

  test("keeps the five-step notebook usable on a narrow screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demos/");

    const lab = page.locator("[data-project-fit]");
    await expect(lab.locator("[data-project-fit-tab]")).toHaveCount(5);
    const overflow = await lab.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
