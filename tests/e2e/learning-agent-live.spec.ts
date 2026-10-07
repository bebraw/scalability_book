import {
  activeLearningPanel,
  chooseNotebookTool,
  openAssistantSettings,
} from "./learning-notebook.helpers.ts";
import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

test("real Codex observes and changes the browser demo, resumes and offers a student-reviewed notebook draft", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.LEARNING_CODEX_LIVE !== "1",
    "Opt-in provider verification uses a dedicated authenticated Codex profile.",
  );
  test.setTimeout(180_000);
  const directory = await mkdtemp(path.join(tmpdir(), "book-agent-live-"));
  const child = spawn(
    process.execPath,
    [
      process.env.LEARNING_COMPANION_BIN ?? "scripts/learning-companion.ts",
      "--codex",
      "--codex-home",
      path.resolve(
        process.env.LEARNING_CODEX_HOME ?? ".local/learning-companion/codex",
      ),
      "--directory",
      directory,
      "--port",
      "18889",
      "--origin",
      new URL(baseURL!).origin,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      let text = "";
      const timeout = setTimeout(
        () => reject(new Error("Live companion failed to start")),
        8000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Live companion exited"));
      });
      child.stdout!.on("data", (data) => {
        text += String(data);
        const match = text.match(/Learning companion: http:\/\/127\.0\.0\.1:/);
        if (match) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    await page.goto("/demos/#demo-queue-balance-lab");
    await page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true })
      .click();
    const panel = activeLearningPanel(page);
    await panel.getByLabel("Companion address").fill("http://127.0.0.1:18889");
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText("Connected");
    await chooseNotebookTool(panel, "Connect");
    await expect(
      panel.getByText(
        /Teaching policy scalableweb-study-assistant v1; Codex 0.154.0/,
      ),
    ).toBeVisible();
    await chooseNotebookTool(panel, "Discuss");
    await panel
      .getByLabel("Investigation source")
      .selectOption("demo-queue-balance-lab");
    await panel.getByRole("button", { name: "Save initial thinking" }).click();
    await panel
      .getByLabel("Your thinking")
      .fill(
        "I predict that changing arrivals to 22 while holding time at 0.5 gives an expected queue of 11. I will compare this with the observed queue.",
      );
    await panel.getByRole("button", { name: "Save note", exact: true }).click();
    await chooseNotebookTool(panel, "Notes");
    await panel.getByRole("checkbox").first().check();
    await panel.getByRole("button", { name: "Discuss selected notes" }).click();
    await openAssistantSettings(panel);
    await panel.getByLabel("How I want help").selectOption("check");
    await panel
      .getByLabel("Message to the teaching assistant")
      .fill(
        "Use observe_demo for demo-queue-balance-lab to inspect the actual browser controls, then use change_demo to change only the arrival rate to 22. I have saved and selected my prediction. Afterwards report the actual displayed expected queue and give me one brief question. Do not infer execution from HTML; use both tools.",
      );
    page.on("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: "Send message" }).click();
    try {
      await expect(
        page.locator('[data-little-law-input="arrival"]'),
      ).toHaveValue("22", { timeout: 60_000 });
    } catch {
      throw new Error(
        `Live demo check: ${(await panel.locator(".learning-messages").innerText()).slice(-4000)}; ${await panel.getByRole("status").innerText()}`,
      );
    }
    await expect(
      panel.getByRole("heading", {
        name: "Teaching assistant suggestion",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panel.getByText("Browser observation", { exact: true }),
    ).toHaveCount(2);
    await expect(
      page.locator('[data-little-law-metric="expected"]'),
    ).toHaveText("11.0");
    console.log(
      "Observed teaching reply:",
      await panel
        .locator(".learning-messages article")
        .last()
        .locator("p")
        .first()
        .innerText(),
    );
    await panel.getByText("About this reply", { exact: true }).click();
    await expect(
      panel.getByText(/policy scalableweb-study-assistant v1/),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("teaching-assistant-policy.png"),
    });
    await panel
      .getByRole("button", { name: "Use as a notebook draft" })
      .click();
    await expect(panel.getByRole("status")).toContainText("Choose Save note");
    await panel.getByRole("button", { name: "Save note", exact: true }).click();
    await chooseNotebookTool(panel, "Discuss");
    await panel
      .getByLabel("Message to the teaching assistant")
      .fill(
        "Continue this discussion with one short question about the observation window. Do not change the demo.",
      );
    await panel.getByRole("button", { name: "Send message" }).click();
    await expect(
      panel.getByRole("heading", {
        name: "Teaching assistant suggestion",
        exact: true,
      }),
    ).toHaveCount(2, { timeout: 60_000 });
    console.log(
      "Resumed teaching reply:",
      await panel
        .locator(".learning-messages article")
        .last()
        .locator("p")
        .first()
        .innerText(),
    );
    await panel.getByText("About this reply", { exact: true }).last().click();
    await expect(
      panel.getByText(/policy scalableweb-study-assistant v1/).last(),
    ).toBeVisible();
    await chooseNotebookTool(panel, "Notes");
    await panel.getByText("1 saved revision", { exact: true }).first().click();
    await expect(
      panel.getByText(/Assistant suggestion; conversation/),
    ).toBeVisible();
    await expect(
      panel.getByText(/policy scalableweb-study-assistant v1/),
    ).toBeVisible();
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
