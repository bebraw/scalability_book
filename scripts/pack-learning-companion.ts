import { mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, ".local/companion-release");
mkdirSync(output, { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
// npm.cmd is invoked only for the fixed build command on Windows; no student input.
execFileSync(npm, ["pack", "--ignore-scripts", "--pack-destination", output], {
  cwd: path.join(root, "packages/learning-companion"),
  stdio: "inherit",
  shell: process.platform === "win32",
});
