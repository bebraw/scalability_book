import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function run(command: string, args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code})`));
    });
  });
}

export async function buildStudy(root: string, output: string) {
  const { repository, revision } = JSON.parse(
    await readFile(path.join(root, "study/exporter.json"), "utf8"),
  ) as { repository: string; revision: string };
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("The study exporter must be pinned to a full Git commit");
  }
  const checkout = path.join(root, ".local/study-exporter", revision);
  const ready = path.join(checkout, ".study-ready");
  const installed = await access(ready).then(
    () => true,
    () => false,
  );
  if (!installed) {
    await mkdir(checkout, { recursive: true });
    await run("git", ["init", "--quiet"], checkout);
    await run("git", ["fetch", "--depth=1", repository, revision], checkout);
    await run("git", ["checkout", "--detach", "FETCH_HEAD"], checkout);
    // Keep the upstream lockfile, including build tools. No install hooks or
    // Studio server run during a site build.
    await run(
      "npm",
      ["ci", "--include=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
      checkout,
    );
    await writeFile(ready, revision + "\n");
  }
  await run(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/export-study.ts",
      path.join(root, "study/pilot/course.json"),
      path.resolve(output),
    ],
    checkout,
  );
}
