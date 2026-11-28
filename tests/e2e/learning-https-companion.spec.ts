import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assistantPanel,
  chooseAssistantTool,
  openAssistantSettings,
} from "./learning-workspace.helpers.ts";

test("an HTTPS reading connects to the HTTP companion with local-network permission", async ({
  page,
  context,
  baseURL,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "This is the supported Chromium connection path.",
  );
  const website = "https://companion-reading.test";
  const companion = "http://127.0.0.1:18897";
  const directory = await mkdtemp(path.join(tmpdir(), "book-https-companion-"));
  const child = spawn(
    process.execPath,
    [
      "scripts/learning-companion.ts",
      "start",
      "--notebook",
      "--directory",
      directory,
      "--port",
      "18897",
      "--origin",
      website,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  try {
    await expect
      .poll(() => output)
      .toContain(`Learning companion: ${companion}`);
    // Fulfill only the website's resources. The browser retains an HTTPS origin,
    // but this fixture does not exercise TLS certificates or the deployed host.
    // Companion requests remain real HTTP fetches with ordinary browser security.
    await page.route(`${website}/**`, async (route) => {
      const source = new URL(route.request().url());
      // The development server's endless reload stream is not a reading asset.
      if (source.pathname === "/api/dev/events") {
        await route.fulfill({ status: 204 });
        return;
      }
      const response = await route.fetch({
        url: new URL(source.pathname + source.search, baseURL).href,
      });
      await route.fulfill({ response });
    });
    await context.grantPermissions(["local-network-access"], {
      origin: website,
    });
    const requests: { path: string; method: string }[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).origin === companion)
        requests.push({
          path: new URL(request.url()).pathname,
          method: request.method(),
        });
    });
    await page.goto(`${website}/chapters/benchmarking/?assistant=1`);
    expect(
      await page.evaluate(() => ({
        origin: location.origin,
        secure: window.isSecureContext,
      })),
    ).toEqual({ origin: website, secure: true });
    const panel = assistantPanel(page);
    await panel.getByLabel("Companion address").fill(companion);
    const connected = page.waitForResponse(`${companion}/connect`);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    const response = await connected;
    expect(response.status()).toBe(200);
    expect(await response.request().headerValue("origin")).toBe(website);
    expect(await response.headerValue("access-control-allow-origin")).toBe(
      website,
    );
    await expect(panel.getByRole("status")).toHaveText(
      "Connected to your local companion.",
    );

    await openAssistantSettings(panel);
    await panel.getByRole("button", { name: "Save initial thinking" }).click();
    const body = "My private observation survives a new browser session token.";
    await panel.getByLabel("My initial thinking").fill(body);
    await panel.getByRole("button", { name: "Save private attempt" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "Initial thinking saved in your local companion.",
    );
    await chooseAssistantTool(panel, "Connect");
    await panel
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText("Disconnected");
    await page.reload();
    await panel.getByLabel("Companion address").fill(companion);
    await panel
      .getByRole("button", { name: "Connect companion", exact: true })
      .click();
    await expect(panel.getByRole("status")).toHaveText(
      "Connected to your local companion.",
    );
    await openAssistantSettings(panel);
    await panel
      .getByRole("button", { name: "Load my saved attempts for this reading" })
      .click();
    await expect(
      panel.getByRole("checkbox", { name: `Include my attempt: ${body}` }),
    ).not.toBeChecked();
    expect(
      requests.filter(
        ({ path, method }) => path === "/connect" && method === "POST",
      ),
    ).toHaveLength(2);
    expect(requests).toEqual(
      expect.arrayContaining([
        { path: "/entries", method: "POST" },
        { path: "/notebook", method: "GET" },
        { path: "/disconnect", method: "POST" },
      ]),
    );
    expect(
      requests.filter(
        ({ path, method }) =>
          method === "POST" && path.startsWith("/agent/conversations"),
      ),
    ).toEqual([]);
  } finally {
    if (child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      await stopped;
    }
    if (testInfo.status !== testInfo.expectedStatus)
      await testInfo.attach("companion-startup", {
        body: output,
        contentType: "text/plain",
      });
    await rm(directory, { recursive: true, force: true });
  }
});
