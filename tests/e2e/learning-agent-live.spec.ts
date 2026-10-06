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
      "scripts/learning-companion.ts",
      "--codex",
      "--codex-home",
      path.resolve(".local/learning-companion/codex"),
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
    const code = await new Promise<string>((resolve, reject) => {
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
        const match = text.match(/Pairing code .*: ([A-Za-z0-9_-]+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]!);
        }
      });
    });
    await page.goto("/demos/#demo-queue-balance-lab");
    await page.getByRole("button", { name: "Notebook", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "My learning notebook" });
    await panel.getByLabel("Companion address").fill("http://127.0.0.1:18889");
    await panel.getByLabel("Pairing code").fill(code);
    await panel.getByRole("button", { name: "Pair companion" }).click();
    await panel.getByRole("button", { name: "Agent", exact: true }).click();
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
    await panel.getByRole("button", { name: "Notes", exact: true }).click();
    await panel.getByRole("checkbox").first().check();
    await panel.getByRole("button", { name: "Agent", exact: true }).click();
    await panel.getByLabel("How I want help").selectOption("check");
    await panel
      .getByLabel("Message to my agent")
      .fill(
        "Use observe_demo for demo-queue-balance-lab to inspect the actual browser controls, then use change_demo to change only the arrival rate to 22. I have saved and selected my prediction. Afterwards report the actual displayed expected queue and give me one brief question. Do not infer execution from HTML; use both tools.",
      );
    page.on("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: "Send to my agent" }).click();
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
      panel.getByRole("heading", { name: "Agent suggestion", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panel.getByText("Browser observation", { exact: true }),
    ).toHaveCount(2);
    await panel
      .getByRole("button", { name: "Use as a notebook draft" })
      .click();
    await expect(panel.getByRole("status")).toContainText("Review and revise");
    await panel.getByRole("button", { name: "Save note", exact: true }).click();
    await panel.getByRole("button", { name: "Agent", exact: true }).click();
    await panel
      .getByLabel("Message to my agent")
      .fill(
        "Continue this discussion with one short question about the observation window. Do not change the demo.",
      );
    await panel.getByRole("button", { name: "Send to my agent" }).click();
    await expect(
      panel.getByRole("heading", { name: "Agent suggestion", exact: true }),
    ).toHaveCount(2, { timeout: 60_000 });
    await panel.getByRole("button", { name: "Notes", exact: true }).click();
    await panel.getByText("1 saved revision", { exact: true }).first().click();
    await expect(
      panel.getByText(/Codex suggestion; conversation/),
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
