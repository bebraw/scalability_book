import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { runBaseline } from "./runner.mjs";

const args = process.argv.slice(2);
if (!args[0] || args.includes("--help")) {
  console.log(
    "Usage: node cli.mjs <adapter.mjs> <report.json> [seed]\nRuns the fixed baseline; the adapter owns application setup and response validation.",
  );
  process.exit(args.includes("--help") ? 0 : 1);
}
if (!args[1])
  throw new Error(
    "Choose an output path so failed and partial results are retained.",
  );
const output = resolve(args[1]);
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify({
    complete: false,
    status: "Adapter initialization pending",
  }) + "\n",
  { flag: "wx" },
);
let lastReport = { complete: false, runs: [], summaries: [] };
const onUpdate = async (report) => {
  lastReport = report;
  const temporary = output + "." + randomUUID() + ".tmp";
  await writeFile(temporary, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  await rename(temporary, output);
};
try {
  const adapterModule = await import(pathToFileURL(resolve(args[0])).href);
  const adapter = await adapterModule.createAdapter();
  const report = await runBaseline(adapter, {
    seed: args[2] ?? "course-2026",
    onUpdate,
  });
  console.log(
    `Saved ${report.runs.length} runs to ${args[1]}; complete=${report.complete}.`,
  );
  if (
    !report.complete ||
    report.summaries.some(
      (s) =>
        !s.allChecksPassed ||
        !s.allOperationsValid ||
        !s.allResourceProxiesAvailable,
    )
  )
    process.exitCode = 2;
} catch (error) {
  await onUpdate({
    ...lastReport,
    complete: false,
    failure: String(error.message || error),
  });
  console.error(`Benchmark stopped: ${error.message || error}`);
  process.exitCode = 1;
}
