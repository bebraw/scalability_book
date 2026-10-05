import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulationProvisioningFiles } from "./lib/course-simulation-provisioning.ts";

const [id, directory, ...extra] = process.argv.slice(2);
if (!id || !directory || extra.length)
  throw new Error(
    "Usage: node scripts/prepare-course-simulation.ts <environment-id> <output-directory>",
  );
const files = simulationProvisioningFiles(id);
await mkdir(path.dirname(path.resolve(directory)), { recursive: true });
await mkdir(directory);
await writeFile(path.join(directory, "environment.sql"), files.sql, {
  flag: "wx",
});
await writeFile(path.join(directory, "environment.json"), files.marker, {
  flag: "wx",
});
console.log(
  "Wrote simulation initialization files. Apply only to newly created, separate simulation resources; verify the SQL result matches this environment before enabling it.",
);
