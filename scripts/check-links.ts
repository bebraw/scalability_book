import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectPublishedLinks, checkExternalLinks } from "./lib/link-check.ts";
import { parseJsonc } from "./lib/text.ts";

const config = parseJsonc(await readFile("site.config.jsonc", "utf8")) as {
  domain: string;
};
const directory = path.resolve(process.env.BUILD_DIR || "build");
const local = await inspectPublishedLinks(
  directory,
  `https://${config.domain}/`,
);
const localOnly = process.argv.includes("--local-only");
const external = localOnly ? [] : await checkExternalLinks(local.external);
const missing = external.filter((result) => result.outcome === "missing");
const inconclusive = external.filter(
  (result) => result.outcome === "inconclusive",
);
const reportPath = ".local/link-check/report.json";
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      directory,
      pages: local.pages,
      localLinks: local.localLinks,
      localErrors: local.errors,
      externalSkipped: localOnly,
      external,
    },
    null,
    2,
  ) + "\n",
);
for (const issue of local.errors)
  console.error(
    `ERROR ${issue.detail}: ${issue.url} (from ${issue.sources.join(", ")})`,
  );
for (const result of missing)
  console.error(
    `ERROR HTTP ${result.status}: ${result.url} (from ${result.sources.join(", ")})`,
  );
for (const result of inconclusive)
  console.warn(`INCONCLUSIVE ${result.status ?? result.detail}: ${result.url}`);
console.log(
  `${local.pages} pages, ${local.localLinks} local links, ${external.length} external URLs: ${local.errors.length + missing.length} broken, ${inconclusive.length} inconclusive. Report: ${reportPath}`,
);
if (local.errors.length || missing.length) process.exitCode = 1;
