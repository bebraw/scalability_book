import { downloadedMarkdown } from "./learning-workspace.helpers.ts";
import { test, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import AxeBuilder from "@axe-core/playwright";
import { openLearningNotebook } from "../../scripts/lib/learning-notebook.ts";
import { companionRelease } from "../../shared/learning-connection.ts";

test("export-only recovery downloads all Markdown and a complete notebook archive across a packed companion restart", async ({
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
  const judgment = notebook.saveJudgment({
    conceptId: "cache",
    studied: true,
    understanding: "unsure",
    evidenceIds: [initial.id],
    intention: "Check a different cache lifetime.",
  });
  const revisedJudgment = notebook.saveJudgment({
    ...judgment,
    expected: judgment.revision,
    understanding: "can-explain",
  });
  notebook.close();
  try {
    await start();
    const companion = "http://127.0.0.1:18974";
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === companion)
        requests.push(`${request.method()} ${url.pathname}`);
    });
    await page.goto("/diary/");
    await page
      .getByRole("link", { name: "Notebook recovery", exact: true })
      .click();
    const panel = page.getByRole("region", { name: "Notebook recovery" });
    const connect = async () => {
      await panel.getByLabel("Companion address").fill(companion);
      await panel
        .getByRole("button", { name: "Connect companion", exact: true })
        .click();
      await expect(panel.getByRole("status")).toContainText("Connected");
    };
    await connect();
    await expect(
      panel.getByRole("button", { name: /Save note|Prepare selected notes/ }),
    ).toHaveCount(0);
    await expect(panel.locator('textarea, input[type="file"]')).toHaveCount(0);
    expect(
      requests.filter((request) => /\/(export|notebook)$/.test(request)),
    ).toEqual([]);
    const backup = panel.getByRole("button", {
      name: "Export notebook backup",
    });
    const markdown = panel.getByRole("button", {
      name: "Download previous notes as Markdown",
    });
    const transfer = page.waitForEvent("download");
    await backup.click();
    const archiveDownload = await transfer;
    expect(archiveDownload.suggestedFilename()).toBe("learning-notebook.json");
    const archive = JSON.parse(
      await readFile((await archiveDownload.path())!, "utf8"),
    );
    expect(archive.entries).toHaveLength(2);
    expect(archive.entries).toEqual(
      expect.arrayContaining([latest, privateEntry]),
    );
    expect(archive.judgments).toEqual([revisedJudgment]);
    expect(archive.judgmentHistory).toEqual([judgment, revisedJudgment]);
    expect(requests).toContain("GET /export");

    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await panel.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(390);
    expect(
      (await new AxeBuilder({ page }).include("#notebook-recovery").analyze())
        .violations,
    ).toEqual([]);

    await stop();
    await markdown.click();
    await expect(panel.getByRole("status")).toContainText(
      /could not reach|cannot tell us which/i,
    );
    await start();
    const previous = requests.length;
    await page.reload();
    await connect();
    expect(
      requests
        .slice(previous)
        .filter((request) => /\/(export|notebook)$/.test(request)),
    ).toEqual([]);
    const bulk = await downloadedMarkdown(markdown);
    expect(bulk).toContain(latest.body);
    expect(bulk).toContain(initial.source.url);
    expect(bulk).toContain(privateEntry.body);
    expect(bulk).not.toContain(initial.body);
    expect(requests).toContain("GET /notebook");
    expect(
      requests.filter((request) => /^(POST|PUT|DELETE) /.test(request)),
    ).toEqual(["POST /connect", "POST /connect"]);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
