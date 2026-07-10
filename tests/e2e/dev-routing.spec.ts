import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);

test("a production build does not remove development-only chapter routes", async ({
  request,
}) => {
  await execFileAsync(process.execPath, ["scripts/build-site.ts"], {
    cwd: process.cwd(),
  });

  const response = await request.get("/chapters/scaling/");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Scaling pressure lab");
});
