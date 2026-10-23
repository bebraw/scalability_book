import {
  activeLearningPanel,
  chooseNotebookTool,
} from "./learning-notebook.helpers.ts";
import { test, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import AxeBuilder from "@axe-core/playwright";
import { companionRelease } from "../../shared/learning-connection.ts";

test("a packed companion supports an optional first investigation and retains the student's original work after restart", async ({
  page,
  baseURL,
}) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "book-onboarding-browser-"),
  );
  const artifact = path.resolve(
    process.env.COMPANION_CHECK_ARTIFACT ??
      `.local/companion-release/scalableweb-companion-${companionRelease.version}.tgz`,
  );
  execFileSync(
    "npm",
    [
      "install",
      "--prefix",
      directory,
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
      artifact,
    ],
    { encoding: "utf8" },
  );
  const binary = path.join(
    directory,
    "node_modules/@scalableweb/companion/bin/companion.mjs",
  );
  const data = path.join(directory, "data");
  const args = [
    "--directory",
    data,
    "--origin",
    new URL(baseURL!).origin,
    "--port",
    "18896",
  ];
  let child: ReturnType<typeof spawn> | null = null;
  const start = async () => {
    child = spawn(process.execPath, [binary, "start", ...args], {
      cwd: directory,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return await new Promise<void>((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(new Error("Packed companion failed to start")),
        8000,
      );
      child!.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Companion exited"));
      });
      child!.stdout!.on("data", (chunk) => {
        output += String(chunk);
        const match = output.match(
          /Learning companion: http:\/\/127\.0\.0\.1:/,
        );
        if (match) {
          clearTimeout(timer);
          expect(output).not.toMatch(/Pairing code \(single use/);
          resolve();
        }
      });
    });
  };
  const stop = async () => {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    child = null;
  };
  try {
    await start();
    await page.goto("/demos/#demo-cache-decision-lab");
    await page
      .locator(".site-header")
      .getByRole("button", { name: "Notebook", exact: true })
      .click();
    const panel = activeLearningPanel(page);
    await panel.getByLabel("Companion address").fill("http://127.0.0.1:18896");
    await expect(panel.getByLabel("Pairing code")).toHaveCount(0);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await expect(panel.getByRole("status")).toHaveText(
      "Connected to your private notebook.",
    );
    await chooseNotebookTool(panel, "Connect");
    await expect(
      panel.getByText(
        `Companion ${companionRelease.version}; protocol ${companionRelease.protocol}; notebook-only.`,
      ),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Explore this reading" }).click();
    await expect(
      panel.getByRole("button", { name: "Save demo result" }),
    ).toBeDisabled();
    await expect(
      panel.getByText(
        "Save a prediction or uncertainty to enable Save demo result.",
        { exact: true },
      ),
    ).toBeVisible();
    await panel
      .getByLabel("My prediction or uncertainty")
      .fill(
        "I expect the fresh asset to need an origin request when its age exceeds365days.",
      );
    await panel.getByRole("button", { name: "Save my starting point" }).click();
    await page.locator("[data-cache-age]").fill("100");
    await page.locator("[data-cache-age]").dispatchEvent("input");
    await panel.getByRole("button", { name: "Save demo result" }).click();
    await expect(
      panel.getByRole("status").filter({ hasText: "Demo result saved" }),
    ).toBeVisible();
    await expect(panel.locator(".learning-observation")).toContainText(
      "Inputs saved:",
    );
    await panel
      .getByLabel("My reflection on this check")
      .fill(
        "At400days the stored asset is stale. I still need actual browser records before making a claim about my application.",
      );
    await panel.getByRole("button", { name: "Save my reflection" }).click();
    await panel.getByRole("button", { name: "Review my saved notes" }).click();
    await expect(
      panel.getByRole("heading", {
        name: "Cache decision lab: initial thinking",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", {
        name: "Cache decision lab: reflection",
        exact: true,
      }),
    ).toBeVisible();
    await chooseNotebookTool(panel, "Connect");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(390);
    expect(
      (await new AxeBuilder({ page }).include(".learning-workspace").analyze())
        .violations,
    ).toEqual([]);
    await stop();
    await panel.getByRole("button", { name: "Check connection" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "cannot tell us which",
    );
    await start();
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await chooseNotebookTool(panel, "Notes");
    await expect(
      panel.getByRole("heading", {
        name: "Cache decision lab: initial thinking",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", {
        name: "Cache decision lab: reflection",
        exact: true,
      }),
    ).toBeVisible();
    await chooseNotebookTool(panel, "Connect");
    await panel
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    // Reconnection in the same process requires no restart or copied code.
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await chooseNotebookTool(panel, "Notes");
    await expect(
      panel.getByRole("heading", {
        name: "Cache decision lab: reflection",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
