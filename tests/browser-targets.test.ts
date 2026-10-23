import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBrowserBuildTargets } from "../scripts/lib/browser-targets.ts";

test("declared support floors drive browser transforms, including fractional iOS versions", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(getBrowserBuildTargets(manifest.browserslist), [
    "chrome111",
    "edge111",
    "firefox121",
    "safari16.4",
    "ios16.4",
  ]);
  assert.deepEqual(
    getBrowserBuildTargets(["safari >= 17.2", "ios_saf >= 17.2"]),
    ["safari17.2", "ios17.2"],
  );
});

test("ambiguous, moving and unsupported targets fail instead of silently changing browser support", () => {
  for (const queries of [
    [],
    ["defaults"],
    ["last 2 safari versions"],
    ["safari >= 16.4", "not dead"],
    ["node >= 24"],
    ["safari 13-16"],
  ]) {
    assert.throws(() => getBrowserBuildTargets(queries), /explicit/);
  }
});
