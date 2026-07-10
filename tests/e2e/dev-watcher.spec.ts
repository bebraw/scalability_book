import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const probe = path.join(
  process.cwd(),
  "site",
  "styles",
  ".dev-watch-probe.css",
);

test("rebuilds development output when site styles change", async ({
  request,
}) => {
  const initialRevision = await getBuildRevision(request);

  try {
    await writeFile(probe, `/* watcher probe ${Date.now()} */\n`, "utf8");
    const rebuiltRevision = await waitForNewerBuild(request, initialRevision);

    await unlink(probe);
    await waitForNewerBuild(request, rebuiltRevision);

    const response = await request.get("/chapters/scaling/");
    expect(response.status()).toBe(200);
  } finally {
    await unlink(probe).catch(() => undefined);
  }
});

async function getBuildRevision(request: APIRequestContext) {
  const response = await request.get("/api/editor/status");
  expect(response.status()).toBe(200);
  return Number((await response.json()).buildRevision);
}

async function waitForNewerBuild(
  request: APIRequestContext,
  previousRevision: number,
) {
  let revision = previousRevision;

  await expect
    .poll(async () => {
      revision = await getBuildRevision(request);
      return revision;
    })
    .toBeGreaterThan(previousRevision);

  return revision;
}
