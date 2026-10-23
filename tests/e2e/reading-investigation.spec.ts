import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  startSyntheticLocalModel,
  localAnswer,
  localCall,
} from "../fixtures/learning-local-server.ts";

for (const native of [false, true])
  test(`the reading comes alive through predictions, actual observations, adapted replies and a reviewed takeaway (${native ? "native tools" : "discussion"})`, async ({
    page,
    baseURL,
  }) => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "book-inline-browser-"),
    );
    const model = await startSyntheticLocalModel((body) => {
      if (native && body.messages.at(-1).role === "user") return localCall();
      if (native)
        expect(JSON.parse(body.messages.at(-1).content)).toMatchObject({
          demoId: "demo-cache-decision-lab",
          version: 1,
        });
      const context = JSON.parse(
        body.messages.findLast((message: any) => message.role === "user")
          .content,
      );
      const turn = context.readingActivity.turn;
      const age = turn.observation.controls.find((control: { label: string }) =>
        control.label.startsWith("Time since response was stored"),
      ).value;
      return localAnswer(
        `For ${turn.system || "your system"}, the browser illustration reports **${age} age-control units**. ${turn.phase === "predict" ? "Try aging the stored asset beyond its freshness window." : "Which real request record would you check next?"}\n\n[Check the source](${context.source.url}#${context.source.anchor})`,
        native,
      );
    });
    const child = spawn(
      process.execPath,
      [
        "scripts/learning-companion.ts",
        "--local",
        "--model",
        model.options.model,
        "--local-url",
        model.url,
        "--local-context",
        "16384",
        "--local-tools",
        native ? "native" : "none",
        "--directory",
        directory,
        "--port",
        "18891",
        "--origin",
        new URL(baseURL!).origin,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Inline companion failed to start")),
          8000,
        );
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Inline companion exited"));
        });
        child.stdout!.on("data", (chunk) => {
          if (String(chunk).includes("Learning companion:")) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      const privateRequests: string[] = [];
      page.on("request", (request) => {
        if (request.url().startsWith("http://127.0.0.1:18891"))
          privateRequests.push(request.url());
      });
      await page.goto("/chapters/architecture/#demo-cache-decision-lab");
      const activity = page.locator("[data-reading-investigation]");
      await expect(
        page.locator('[data-investigate-demo="demo-cache-decision-lab"]'),
      ).toBeVisible();
      expect(privateRequests).toEqual([]);
      await page
        .locator('[data-investigate-demo="demo-cache-decision-lab"]')
        .click();
      await expect(
        activity.getByRole("button", { name: "Discuss my prediction" }),
      ).toBeDisabled();
      await activity
        .getByLabel("Investigation companion address")
        .fill("http://127.0.0.1:18891");
      await activity
        .getByRole("button", { name: "Connect companion", exact: true })
        .click();
      await expect(
        activity.getByRole("button", { name: "Discuss my prediction" }),
      ).toBeEnabled();
      expect(privateRequests.some((url) => /notebook/.test(url))).toBe(false);
      expect(model.requests).toEqual([]);
      await activity
        .getByLabel("A system I want to understand")
        .fill("Cached assets");
      await activity
        .getByLabel("My prediction or uncertainty")
        .fill(
          "The stored asset should require an origin request after 365 days.",
        );
      await activity
        .getByRole("button", { name: "Discuss my prediction" })
        .click();
      await expect(
        activity.locator(".reading-investigation-messages"),
      ).toContainText("For Cached assets");
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("25 age-control units");
      await expect(
        activity.getByRole("button", { name: "Discuss this result" }),
      ).toBeEnabled();
      const sent = model.requests.length;
      await page.locator("[data-cache-age]").fill("100");
      await expect(
        activity.locator(".reading-investigation-observation"),
      ).toContainText(/Time since response was stored.*: 100/);
      expect(model.requests.length).toBe(sent);
      await activity
        .getByLabel("What I noticed")
        .fill(
          "The asset age reached 400 days and the model returned to the origin.",
        );
      await activity
        .getByRole("button", { name: "Discuss this result" })
        .click();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("100 age-control units");
      await expect(
        activity.getByRole("button", { name: "Discuss this result" }),
      ).toBeEnabled();
      const context = JSON.parse(
        model.requests
          .at(-1)
          .messages.findLast((message: any) => message.role === "user").content,
      );
      expect(context.readingActivity.turn).toMatchObject({
        phase: "experiment",
        system: "Cached assets",
        prediction:
          "The stored asset should require an origin request after 365 days.",
        observation: {
          kind: "browser-demo-snapshot",
          demoId: "demo-cache-decision-lab",
          controls: expect.arrayContaining([
            {
              label: expect.stringContaining("Time since response was stored"),
              type: "range",
              value: "100",
            },
          ]),
          visibleText: expect.stringContaining("400 days"),
        },
      });
      expect(context.selectedNotes).toEqual([]);
      const beforeHidden = model.requests.length;
      await page.locator("#demo-cache-decision-lab").evaluate((demo) => {
        demo.hidden = true;
      });
      await activity
        .getByRole("button", { name: "Discuss this result" })
        .click();
      await expect(activity.getByRole("status")).toContainText("Explore tab");
      expect(model.requests.length).toBe(beforeHidden);
      await page.locator("#demo-cache-decision-lab").evaluate((demo) => {
        demo.hidden = false;
      });
      await page.reload();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("100 age-control units");
      // Historical replies persist; a generic demo snapshot does not replay controls.
      await expect(page.locator("[data-cache-age]")).toHaveValue("25");
      await activity.getByText("Conversation history", { exact: true }).click();
      await activity
        .getByRole("button", { name: "Start a new conversation" })
        .click();
      await activity.getByRole("button", { name: "01 / Predict" }).click();
      await activity.getByLabel("My prediction or uncertainty").fill("");
      await activity.getByRole("button", { name: "Explain directly" }).click();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("25 age-control units");
      await expect(
        activity.getByRole("button", { name: "Discuss this result" }),
      ).toBeEnabled();
      const direct = JSON.parse(
        model.requests
          .at(-1)
          .messages.findLast((message: any) => message.role === "user").content,
      );
      expect(direct.helpMode).toBe("explanation");
      expect(direct.readingActivity.turn.prediction).toBe("");
      await activity.getByRole("button", { name: "03 / Reflect" }).click();
      await activity
        .getByLabel("My takeaway", { exact: true })
        .fill(
          "The stored policy and actual age determine whether reuse is permitted.",
        );
      expect(
        (
          await new AxeBuilder({ page })
            .include(".reading-investigation")
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("[data-theme-picker]").selectOption("dark");
      expect(
        await activity.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .include(".reading-investigation")
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath("inline-mobile-dark.png"),
      });
      await activity
        .getByRole("button", { name: "Prepare notebook takeaway" })
        .click();
      const notebook = page.locator("#learning-notebook");
      await expect(notebook.getByLabel("Your thinking")).toHaveValue(
        /The stored policy and actual age/,
      );
      expect(
        privateRequests.filter((url) => /\/notebook\/entries/.test(url)),
      ).toHaveLength(0);
      await notebook
        .getByRole("button", { name: "Save note", exact: true })
        .click();
      await expect(notebook.getByRole("status")).toContainText(
        "Saved in your private notebook",
      );
      await notebook.getByRole("button", { name: "Close notebook" }).click();
      await activity
        .getByRole("button", { name: "Pause this exploration" })
        .click();
      await page.reload();
      await expect(
        page.locator('[data-investigate-demo="demo-cache-decision-lab"]'),
      ).toBeVisible();
      await expect(page.locator(".learning-workspace")).toHaveCount(0);
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit").catch(() => {});
      await model.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

test("direct explanations, incompatible companions and connection failures retain the student's writing", async ({
  page,
}) => {
  await page.goto("/chapters/architecture/#demo-cache-decision-lab");
  const activity = page.locator("[data-reading-investigation]");
  await page
    .locator('[data-investigate-demo="demo-cache-decision-lab"]')
    .click();
  await activity
    .getByLabel("My prediction or uncertainty")
    .fill("I am unsure about the boundary.");
  await page.route("http://127.0.0.1:8788/**", async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": new URL(page.url()).origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    return route.fulfill({
      headers,
      json: route.request().url().endsWith("/connect")
        ? { token: "a".repeat(43), version: 2 }
        : { connected: true, version: 2, provider: "Codex" },
    });
  });
  await activity
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(
    activity.getByText("Restart the companion", { exact: false }),
  ).toBeVisible();
  await expect(
    activity.getByRole("button", { name: "Explain directly" }),
  ).toBeDisabled();
  await page.unroute("http://127.0.0.1:8788/**");
  await page.route("http://127.0.0.1:8788/**", (route) => route.abort());
  await activity.getByRole("button", { name: "Check connection" }).click();
  await expect(activity.getByRole("status")).toContainText("could not reach");
  await expect(activity.getByLabel("My prediction or uncertainty")).toHaveValue(
    "I am unsure about the boundary.",
  );
  await page.reload();
  await expect(activity.getByLabel("My prediction or uncertainty")).toHaveValue(
    "I am unsure about the boundary.",
  );
});
