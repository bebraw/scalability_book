import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("./", import.meta.url));
const { workspaces } = JSON.parse(
  readFileSync(new URL("package.json", import.meta.url), "utf8"),
);
const mutationModes = [
  "baseline",
  "storage-refactor",
  "authorization-bypass",
  "retry-duplication",
  "archive-write",
];
const [selection, command, ...args] = process.argv.slice(2);

function runNode(parameters, cwd = directory) {
  const result = spawnSync(process.execPath, parameters, {
    cwd,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}

function runExercise(name, action, parameters = []) {
  const cwd = fileURLToPath(new URL(`${name}/`, import.meta.url));
  const manifest = JSON.parse(
    readFileSync(new URL(`${name}/package.json`, import.meta.url), "utf8"),
  );
  if (name === "concern-directed-mutation" && mutationModes.includes(action)) {
    if (parameters.length) {
      console.error("Mutation modes take no additional arguments.");
      return 2;
    }
    return runNode(["run.ts", action], cwd);
  }
  if (!Object.hasOwn(manifest.scripts, action)) {
    console.error(`Unknown command for ${name}: ${action}`);
    console.error(
      `Choose: ${Object.keys(manifest.scripts).join(", ")}${name === "concern-directed-mutation" ? `, ${mutationModes.join(", ")}` : ""}`,
    );
    return 2;
  }
  // npm supplies its own CLI path, avoiding a shell and preserving arguments.
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error(
      "Run exercise commands through npm run lab -- <exercise> <command>.",
    );
    return 2;
  }
  return runNode(
    [npmCli, "--prefix", cwd, "run", action, "--", ...parameters],
    cwd,
  );
}

if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("Use Node 24 or newer before running the workspace.");
  process.exitCode = 2;
} else if (!selection || selection === "--help" || selection === "list") {
  console.log("Independent course exercises (choose one; no required order):");
  for (const name of workspaces) console.log(`  ${name}/README.md`);
  console.log("\nSetup: npm ci; npm run preflight");
  console.log("Browser exercises only: npm run browser:install");
  console.log("Run: npm run lab -- <exercise> <command> [arguments]");
  console.log(
    "Mutation example: npm run lab -- concern-directed-mutation retry-duplication",
  );
} else if (selection === "browser:install") {
  if (command) {
    console.error("browser:install takes no arguments.");
    process.exitCode = 2;
  } else {
    try {
      const cli = createRequire(
        new URL("csv-export/package.json", import.meta.url),
      ).resolve("@playwright/test/cli");
      process.exitCode = runNode([cli, "install", "chromium"]);
    } catch {
      console.error(
        "Playwright is unavailable. Run npm ci at the workspace root first.",
      );
      process.exitCode = 2;
    }
  }
} else if (selection === "preflight") {
  if ((command && !workspaces.includes(command)) || args.length) {
    console.error("Use npm run preflight -- [exercise-directory].");
    process.exitCode = 2;
  } else {
    let failed = false;
    for (const name of command ? [command] : workspaces) {
      console.log(`\nSetup only: ${name}`);
      const status = runExercise(name, "preflight");
      if (status !== 0) failed = true;
    }
    console.log(
      failed
        ? "Setup incomplete; inspect the failing preflight."
        : "Setup checks passed. Implementation gaps remain; no feature completion is claimed.",
    );
    process.exitCode = failed ? 1 : 0;
  }
} else if (workspaces.includes(selection) && command) {
  process.exitCode = runExercise(selection, command, args);
} else {
  console.error(
    "Choose one exercise and command; run npm run lab for the index.",
  );
  process.exitCode = 2;
}
