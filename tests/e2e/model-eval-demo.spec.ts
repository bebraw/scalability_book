import { expect, test, type Locator } from "@playwright/test";

test.describe("model eval demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demos/#demo-model-evaluation-lab");
    await expect(page.locator("[data-model-eval]")).toBeVisible();
  });

  test("loads the default task and scores both attempts", async ({ page }) => {
    const demo = page.locator("[data-model-eval]");

    await expect(demo.locator("[data-model-eval-step='0']")).toBeVisible();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Paste outputs to score",
    );

    await demo.locator("[data-model-eval-next]").click();
    await expect(demo.locator("[data-model-eval-prompt]")).toHaveValue(
      /Find one likely scaling bottleneck/,
    );

    await demo.locator("[data-model-eval-next]").click();
    await demo.locator("[data-model-eval-sample='y']").click();
    await expect(demo.locator("[data-model-eval-conclusion]")).toHaveText(
      /Paste both model outputs/,
    );
    await demo.locator("[data-model-eval-sample='x']").click();
    await expect(demo.locator("[data-model-output='x']")).toHaveValue(
      /occurred_at/,
    );
    await revealWorked(demo);
    await expect(demo.locator(".model-eval-help")).toHaveCount(6);
    await demo.locator(".model-eval-help").first().focus();
    await expect(demo.getByRole("tooltip").first()).toContainText(
      "Clearly uses the supplied context",
    );
    await expect(demo.locator("[data-model-card='x']")).toBeInViewport();
    await expect(demo.locator("[data-model-card='y']")).toBeInViewport();

    await demo.locator("[data-model-eval-next]").click();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt X: 6/6",
    );
    await expect(demo.locator("[data-model-eval-results]")).toContainText(
      "Attempt Y",
    );
    await expectElementsInsideDemo(demo, [
      "[data-model-eval-results]",
      ".model-eval-note",
    ]);
    await expect(demo.locator("[data-model-eval-next]")).toBeDisabled();
    await expect(demo).toContainText("Reported cost");
    await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
      "Complete the comparison protocol",
    );
    for (const check of await demo.getByRole("checkbox").all()) {
      await expect(check).not.toBeChecked();
      await check.check();
    }
    await expect(
      demo.locator("[data-model-eval-conclusion]"),
    ).not.toContainText("Complete the comparison protocol");
  });

  test("updates task, score, checks, and local conclusion", async ({
    page,
  }) => {
    const demo = page.locator("[data-model-eval]");

    await demo.locator("[data-model-eval-task]").selectOption("benchmark");
    await expect(demo.locator("[data-model-eval-prompt]")).toHaveValue(
      /Propose one benchmark plan/,
    );

    await demo.locator("[data-model-eval-tab='2']").click();
    await demo.locator("[data-model-eval-sample='x']").click();
    await demo.locator("[data-model-eval-sample='y']").click();
    await revealWorked(demo);
    await demo
      .getByRole("slider", {
        name: "Load level score for Attempt Y",
        exact: true,
      })
      .fill("2");

    await demo.locator("[data-model-eval-tab='3']").click();
    for (const check of await demo.getByRole("checkbox").all()) {
      await check.check();
    }
    await demo
      .getByRole("checkbox", {
        name: "Both attempts were scored with the selected task's rubric",
        exact: true,
      })
      .uncheck();

    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt X: 6/6",
    );
    await expect(demo.locator("[data-model-eval-results]")).toContainText(
      "4/6",
    );
    await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
      "scores higher",
    );
    await expect(demo.locator("[data-model-eval-conclusion]")).toContainText(
      "Complete the comparison protocol",
    );

    // A lower score for X can reverse the result; the attempt label is not a rank.
    await demo.locator("[data-model-eval-tab='2']").click();
    await demo
      .getByRole("slider", {
        name: "Workload score for Attempt X",
        exact: true,
      })
      .fill("0");
    await demo
      .getByRole("slider", {
        name: "Load level score for Attempt X",
        exact: true,
      })
      .fill("0");
    await demo.locator("[data-model-eval-tab='3']").click();
    await expect(demo.locator("[data-model-eval-verdict]")).toContainText(
      "Attempt Y: 4/6",
    );
  });

  test("keeps the copied context and scoring criteria aligned with the selected task", async ({
    page,
  }) => {
    const demo = page.locator("[data-model-eval]");
    const prompt = demo.getByRole("textbox", {
      name: "Shared prompt",
      exact: true,
    });
    await demo.getByRole("button", { name: "2 Prompt", exact: true }).click();
    const initialContext = await demo
      .locator("[data-model-eval-context]")
      .textContent();
    expect(await prompt.inputValue()).toContain(initialContext);
    await expect(prompt).toHaveValue(/ORDER BY occurred_at DESC, id DESC/);

    await demo.getByRole("button", { name: "1 Task", exact: true }).click();
    await demo
      .getByLabel("Eval task", { exact: true })
      .selectOption("benchmark");
    await demo.getByRole("button", { name: "2 Prompt", exact: true }).click();
    const benchmarkContext = await demo
      .locator("[data-model-eval-context]")
      .textContent();
    expect(await prompt.inputValue()).toContain(benchmarkContext);
    await expect(prompt).toHaveValue(/20,000 valid work-item creations/);
    await demo.getByRole("button", { name: "3 Score", exact: true }).click();
    await expect(
      demo.getByRole("slider", {
        name: "Load level score for Attempt X",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      demo.getByRole("slider", {
        name: "Measurement score for Attempt X",
        exact: true,
      }),
    ).toHaveCount(0);
    await demo
      .getByRole("button", { name: "Use sample outputs", exact: true })
      .click();
    await demo.getByRole("button", { name: "4 Compare", exact: true }).click();
    for (const check of await demo.getByRole("checkbox").all()) {
      await check.check();
    }

    await demo.getByRole("button", { name: "1 Task", exact: true }).click();
    await demo
      .getByLabel("Eval task", { exact: true })
      .selectOption("data-model");
    await demo.getByRole("button", { name: "2 Prompt", exact: true }).click();
    const modelContext = await demo
      .locator("[data-model-eval-context]")
      .textContent();
    expect(await prompt.inputValue()).toContain(modelContext);
    await expect(prompt).toHaveValue(
      /WorkItem\(id, workspace_id, title, state\)/,
    );
    await demo.getByRole("button", { name: "3 Score", exact: true }).click();
    await expect(
      demo.getByRole("slider", {
        name: "Entities score for Attempt X",
        exact: true,
      }),
    ).toHaveValue("0");
    await expect(
      demo.getByRole("slider", {
        name: "Relationships and lifecycle score for Attempt X",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      demo.getByRole("textbox", { name: "Model output" }).first(),
    ).toHaveValue("");
    await demo
      .getByRole("button", { name: "Use sample outputs", exact: true })
      .click();
    await demo
      .getByRole("button", { name: "Help for Uncertainty", exact: true })
      .first()
      .focus();
    await expect(
      demo
        .getByRole("tooltip")
        .filter({ hasText: "unresolved enforcement question" })
        .first(),
    ).toBeVisible();
    await revealWorked(demo);
    await demo
      .getByRole("slider", {
        name: "Uncertainty score for Attempt X",
        exact: true,
      })
      .fill("0");
    await demo.getByRole("button", { name: "4 Compare", exact: true }).click();
    await expect(demo.locator("[data-model-eval-results]")).toContainText(
      "4/6",
    );
    for (const check of await demo.getByRole("checkbox").all()) {
      await expect(check).not.toBeChecked();
    }
  });
});

async function expectElementsInsideDemo(demo: Locator, selectors: string[]) {
  const overflow = await demo.evaluate(
    (root: HTMLElement, checkedSelectors: string[]) => {
      const rootRect = root.getBoundingClientRect();

      return checkedSelectors.flatMap((selector) =>
        Array.from(root.querySelectorAll(selector)).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const spills =
            rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;

          return spills
            ? [
                {
                  selector,
                  left: rect.left,
                  right: rect.right,
                  rootLeft: rootRect.left,
                  rootRight: rootRect.right,
                },
              ]
            : [];
        }),
      );
    },
    selectors,
  );

  expect(overflow).toEqual([]);
}

async function revealWorked(demo: Locator) {
  for (const button of await demo
    .locator("[data-model-eval-worked]:enabled")
    .all())
    await button.click();
}
