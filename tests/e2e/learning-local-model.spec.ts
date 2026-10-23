import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  startSyntheticLocalModel,
  localAnswer,
  localCall,
} from "../fixtures/learning-local-server.ts";
import {
  chooseNotebookTool,
  openAssistantSettings,
} from "./learning-notebook.helpers.ts";

for (const native of [false, true])
  test(`packed local model ${native ? "observes the real demo and respects declined/approved changes" : "shows discussion-only capabilities and reply provenance"}`, async ({
    page,
    baseURL,
  }) => {
    const directory = await mkdtemp(path.join(tmpdir(), "book-local-browser-"));
    const model = await startSyntheticLocalModel((body) => {
      if (!native)
        return localAnswer(
          "Synthetic discussion: use your saved observation to check the prediction.",
        );
      const last = body.messages.at(-1);
      if (last.role === "user") return localCall();
      const previous = body.messages.at(-2).tool_calls[0];
      const result = JSON.parse(last.content);
      if (previous.function.name === "observe_demo") {
        const age = result.controls.find((control: any) =>
          /Time since response was stored/i.test(control.label),
        );
        return localCall("change_demo", {
          demoId: "demo-cache-decision-lab",
          controlId: age.id,
          value: 100,
        });
      }
      return localAnswer(
        result.success === false
          ? "The student declined the proposed change; no changed result was observed."
          : `The actual browser reported: ${result.visibleText}`,
        true,
      );
    });
    const origin = new URL(baseURL!).origin;
    const child = spawn(
      process.execPath,
      [
        process.env.LEARNING_COMPANION_BIN ??
          "packages/learning-companion/bin/companion.mjs",
        "--local",
        "--model",
        model.options.model,
        "--local-url",
        model.url,
        "--local-context",
        "8192",
        "--local-tools",
        native ? "native" : "none",
        "--directory",
        directory,
        "--port",
        "18886",
        "--origin",
        origin,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        let output = "";
        const timer = setTimeout(
          () => reject(new Error("Packed local companion failed to start")),
          8000,
        );
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Packed local companion exited"));
        });
        child.stdout!.on("data", (chunk) => {
          output += String(chunk);
          if (output.includes("Learning companion:")) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      await page.goto("/demos/#demo-cache-decision-lab");
      await page
        .locator('.site-header [data-learning-toggle="notebook"]')
        .click();
      const notebook = page.locator("#learning-notebook"),
        assistant = page.locator("#learning-assistant");
      await notebook
        .getByLabel("Companion address")
        .fill("http://127.0.0.1:18886");
      await notebook
        .getByRole("button", { name: "Connect companion", exact: true })
        .click();
      await expect(notebook.getByRole("status")).toContainText("Connected");
      if (native) {
        await chooseNotebookTool(notebook, "Discuss");
        await assistant
          .getByLabel("Investigation source")
          .selectOption("demo-cache-decision-lab");
        await assistant
          .getByRole("button", { name: "Save initial thinking" })
          .click();
        await notebook
          .getByLabel("Your thinking")
          .fill(
            "I predict that a stored asset aged 400 days is stale under its 365-day policy. I want to inspect the actual response path.",
          );
        await notebook
          .getByRole("button", { name: "Save note", exact: true })
          .click();
        await chooseNotebookTool(notebook, "Notes");
        await notebook.getByRole("checkbox").first().check();
        await notebook
          .getByRole("button", { name: "Discuss selected notes" })
          .click();
      } else await chooseNotebookTool(notebook, "Discuss");
      await openAssistantSettings(assistant);
      if (!native)
        await expect(
          assistant.getByText(/Discussion-only local model. It cannot inspect/),
        ).toBeVisible();
      await assistant
        .getByLabel("Message to the teaching assistant")
        .fill(
          native
            ? "Observe then propose a change; I will decline it."
            : "Discuss my prediction without inspecting a live demo.",
        );
      if (native) page.once("dialog", (dialog) => void dialog.dismiss());
      await assistant.getByRole("button", { name: "Send message" }).click();
      await expect(
        assistant.getByRole("heading", {
          name: "Teaching assistant suggestion",
          exact: true,
        }),
      ).toHaveCount(1, { timeout: 30000 });
      await assistant.getByText("About this reply", { exact: true }).click();
      await expect(
        assistant.getByText(
          /policy scalableweb-study-assistant v1.*synthetic-local-model/,
        ),
      ).toBeVisible();
      if (native) {
        await expect(page.locator("[data-cache-age]")).toHaveValue("25");
        await expect(
          assistant.getByText(
            "The student declined the proposed change; no changed result was observed.",
            { exact: true },
          ),
        ).toBeVisible();
        page.once("dialog", (dialog) => void dialog.accept());
        await assistant
          .getByLabel("Message to the teaching assistant")
          .fill(
            "Observe again and propose the same change; I will approve it.",
          );
        await assistant.getByRole("button", { name: "Send message" }).click();
        await expect(page.locator("[data-cache-age]")).toHaveValue("100", {
          timeout: 30000,
        });
        await expect(page.locator("[data-cache-age-label]")).toHaveText(
          "400 days",
        );
        await expect(
          assistant.getByRole("heading", {
            name: "Teaching assistant suggestion",
            exact: true,
          }),
        ).toHaveCount(2, { timeout: 30000 });
        await expect(
          assistant.getByText("Browser observation", { exact: true }),
        ).toHaveCount(3);
      } else {
        expect(model.requests[0].tools).toBeUndefined();
        await expect(
          assistant.getByText(
            /Discussion-only local model: no live book or demo tools/,
          ),
        ).toBeVisible();
      }
      await page.screenshot({
        path: test.info().outputPath("local-model.png"),
      });
    } finally {
      if (child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      await model.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
