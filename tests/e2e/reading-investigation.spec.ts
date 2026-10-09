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
          demoId: "demo-queue-balance-lab",
          version: 1,
        });
      const context = JSON.parse(
        body.messages.findLast((message: any) => message.role === "user")
          .content,
      );
      const turn = context.readingActivity.turn;
      return localAnswer(
        `For ${turn.system || "your system"}, the browser illustration reports **${turn.observation.expected} events** expected. ${turn.phase === "predict" ? "Try doubling average time while holding arrivals steady." : "Which shared observation window would you check next?"}\n\n[Check the source](${context.source.url}#${context.source.anchor})`,
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
        "8192",
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
      await page.goto("/chapters/benchmarking/#demo-queue-balance-lab");
      const activity = page.locator("[data-reading-investigation]");
      await expect(
        activity.getByRole("button", { name: "Explore this idea" }),
      ).toBeVisible();
      expect(privateRequests).toEqual([]);
      await activity.getByRole("button", { name: "Explore this idea" }).click();
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
        .fill("Database requests");
      await activity
        .getByLabel("My prediction or uncertainty")
        .fill("Doubling time should double unfinished work.");
      await activity
        .getByRole("button", { name: "Discuss my prediction" })
        .click();
      await expect(
        activity.locator(".reading-investigation-messages"),
      ).toContainText("For Database requests");
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("10 events");
      await expect(
        activity.getByRole("button", { name: "Discuss this result" }),
      ).toBeEnabled();
      const sent = model.requests.length;
      await page.locator('[data-little-law-input="time"]').fill("1");
      await expect(
        activity.locator(".reading-investigation-observation"),
      ).toContainText("expected 20 events");
      expect(model.requests.length).toBe(sent);
      await activity
        .getByLabel("What I noticed")
        .fill(
          "The expected queue doubled but the observed queue stayed at ten.",
        );
      await activity
        .getByRole("button", { name: "Discuss this result" })
        .click();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("20 events");
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
        system: "Database requests",
        prediction: "Doubling time should double unfinished work.",
        observation: {
          arrival: 20,
          time: 1,
          observed: 10,
          expected: 20,
          gap: -10,
        },
      });
      expect(context.selectedNotes).toEqual([]);
      const beforeHidden = model.requests.length;
      await page.locator("#measurement-boundary-tab-1").click();
      await activity
        .getByRole("button", { name: "Discuss this result" })
        .click();
      await expect(activity.getByRole("status")).toContainText("Explore tab");
      expect(model.requests.length).toBe(beforeHidden);
      await page.locator("#measurement-boundary-tab-0").click();
      await page.reload();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("20 events");
      await expect(page.locator('[data-little-law-input="time"]')).toHaveValue(
        "1",
      );
      await activity.getByText("Conversation history", { exact: true }).click();
      await activity
        .getByRole("button", { name: "Start a new conversation" })
        .click();
      await activity.getByRole("button", { name: "01 / Predict" }).click();
      await activity.getByLabel("My prediction or uncertainty").fill("");
      await activity.getByRole("button", { name: "Explain directly" }).click();
      await expect(
        activity.locator(".reading-investigation-messages strong"),
      ).toHaveText("20 events");
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
        .fill("The three averages must describe the same stable boundary.");
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
        /The three averages must describe/,
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
        activity.getByRole("button", { name: "Explore this idea" }),
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
  await page.goto("/chapters/benchmarking/#demo-queue-balance-lab");
  const activity = page.locator("[data-reading-investigation]");
  await activity.getByRole("button", { name: "Explore this idea" }).click();
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
