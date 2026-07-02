import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import browserslist from "browserslist";

const browsers = browserslist(undefined, { path: process.cwd() });
const es2019SafariTargets = browsers.filter(targetsSafariBefore14);

function targetsSafariBefore14(target: string) {
  const [browser, versionRange] = target.split(" ");

  if (browser !== "ios_saf" && browser !== "safari") {
    return false;
  }

  const firstVersion = versionRange?.split("-")[0] || "";
  const major = Number.parseInt(firstVersion, 10);

  return Number.isFinite(major) && major < 14;
}

test.describe("browser bundle compatibility", () => {
  test("avoids syntax that older mobile Safari fails to parse", async () => {
    expect(
      es2019SafariTargets,
      "package.json browserslist should include Safari/iOS Safari targets that need ES2019-safe demo bundles",
    ).not.toEqual([]);

    const buildDir = path.join(process.cwd(), "build");
    const files = (await readdir(buildDir))
      .filter((file) => file.endsWith(".js"))
      .sort();
    const unsupported: Array<{ file: string; syntax: string }> = [];

    for (const file of files) {
      const source = await readFile(path.join(buildDir, file), "utf8");

      if (source.includes("??")) {
        unsupported.push({ file, syntax: "nullish coalescing (??)" });
      }

      if (/\?\.(?!\d)/.test(source)) {
        unsupported.push({ file, syntax: "optional chaining (?.)" });
      }

      if (/\?\?=|\|\|=|&&=/.test(source)) {
        unsupported.push({ file, syntax: "logical assignment" });
      }
    }

    expect(unsupported).toEqual([]);
  });
});
