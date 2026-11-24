import {
  downloadedMarkdown,
  chooseNotebookTool,
} from "./learning-notebook.helpers.ts";
import { test, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import AxeBuilder from "@axe-core/playwright";
import { openLearningNotebook } from "../../scripts/lib/learning-notebook.ts";
import { companionRelease } from "../../shared/learning-connection.ts";

test("an existing packed companion recovers selected diary Markdown and a full backup across restart", async ({
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
    "18974",
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
  // Seed an existing private notebook before the browser connects to it.
  const notebook = openLearningNotebook(data);
  const initial = notebook.saveEntry({
    kind: "attempt",
    title: "My cache prediction",
    body: "I predict the asset will be stale.",
    source: {
      url: "https://scalableweb.dev/chapters/benchmarking/#which-requests-counted",
      title: "Which requests counted?",
      kind: "passage",
      anchor: "which-requests-counted",
      excerpt: "A synthetic observation.",
      revision: "synthetic",
      conceptIds: [],
    },
  });
  const latest = notebook.saveEntry({
    ...initial,
    expected: initial.revision,
    body: "At 400 days the asset was stale.",
  });
  const privateEntry = notebook.saveEntry({
    ...initial,
    id: undefined,
    title: "Keep private",
    body: "An unrelated private reflection.",
  });
  notebook.close();
  try {
    await start();
    await page.goto("/diary/");
    await page
      .getByRole("link", { name: "Notebook recovery", exact: true })
      .click();
    const panel = page.locator("#learning-notebook");
    await panel.getByLabel("Companion address").fill("http://127.0.0.1:18974");
    await expect(panel.getByLabel("Pairing code")).toHaveCount(0);
    const connect = () =>
      panel
        .getByRole("button", { name: "Connect companion", exact: true })
        .click();
    await connect();
    await expect(panel.getByRole("status")).toContainText("Connected");
    await chooseNotebookTool(panel, "Connect");
    await expect(
      panel.getByText(
        `Companion ${companionRelease.version}; protocol ${companionRelease.protocol}; no assistant provider.`,
      ),
    ).toBeVisible();
    const transfer = page.waitForEvent("download");
    await panel.getByRole("button", { name: "Export notebook backup" }).click();
    const file = await (await transfer).path();
    const archive = JSON.parse(await readFile(file!, "utf8"));
    expect(archive.entries).toEqual(
      expect.arrayContaining([latest, privateEntry]),
    );
    expect(latest.history.map((item) => item.body)).toEqual([
      initial.body,
      latest.body,
    ]);
    const bulk = await downloadedMarkdown(
      panel.getByRole("button", {
        name: "Download previous notes as Markdown",
      }),
    );
    expect(bulk).toContain(latest.body);
    expect(bulk).toContain(privateEntry.body);

    await page.setViewportSize({ width: 390, height: 844 });
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
    await connect();
    await expect(panel.getByRole("status")).toContainText("Connected");
    await chooseNotebookTool(panel, "Notes");
    await panel.getByLabel("Notes to show").selectOption("all");
    const saved = panel
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: initial.title, exact: true }),
      });
    await saved.getByRole("button", { name: "Edit", exact: true }).click();
    const edited = "The stale response validated my prediction at 400 days.";
    await panel.getByLabel("Your thinking").fill(edited);
    await panel.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Saved");
    await chooseNotebookTool(panel, "Notes");
    await panel.getByLabel("Notes to show").selectOption("all");
    await panel
      .getByLabel("Select My cache prediction", { exact: true })
      .check();
    await panel.getByRole("button", { name: "Prepare selected notes" }).click();
    await panel.getByRole("button", { name: "Build submission draft" }).click();
    await expect(
      panel.getByLabel("Review and revise your submission material"),
    ).toHaveValue(/400 days/);
    const markdown = await downloadedMarkdown(
      panel.getByRole("button", { name: "Download Markdown" }),
    );
    expect(markdown).toContain(edited);
    expect(markdown).toContain(initial.source.url);
    expect(markdown).not.toContain(privateEntry.body);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
