import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { LearningProblem } from "../../shared/learning-workspace.ts";
import {
  ensureProjectCodex,
  projectCodexVersion,
  runProjectProcess,
  sanitizedProjectEnvironment,
} from "./learning-project-process.ts";

export type ProjectCodex = {
  command: string;
  args: string[];
  version: string;
  source: "installed" | "managed";
  executable: string;
};

function stableVersion(output: string) {
  const match = /^codex-cli (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(
    output.trim(),
  );
  if (!match) return undefined;
  const parts = match.slice(1).map(Number);
  if (!parts.every(Number.isSafeInteger)) return undefined;
  return { version: parts.join("."), parts };
}

function meetsMinimum(parts: number[]) {
  const minimum = projectCodexVersion.split(".").map(Number);
  for (let index = 0; index < minimum.length; index++) {
    if (parts[index] !== minimum[index]) return parts[index]! > minimum[index]!;
  }
  return true;
}

async function installedExecutable(environment: Record<string, string>) {
  if (environment.PATH === undefined) return undefined;
  for (const folder of environment.PATH.split(path.delimiter)) {
    // Freeze PATH resolution now: later checks and project runs have other cwd values.
    const command = path.resolve(folder || ".", "codex");
    try {
      if (!(await stat(command)).isFile()) continue;
      await access(command, constants.X_OK);
      // Keep the invocation path for shims; canonical identity also detects retargeted links.
      return { command, executable: await realpath(command) };
    } catch {
      // Shell PATH lookup likewise moves past absent, broken or inaccessible entries.
    }
  }
  return undefined;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new LearningProblem(
      "Codex selection was cancelled; no coding session was opened.",
    );
}

/** A recent version is eligible for reuse; the phase preflight checks actual compatibility. */
export async function selectProjectCodex(options: {
  directory: string;
  profile: string;
  env?: Record<string, string | undefined> | undefined;
  signal?: AbortSignal | undefined;
  forceManaged?: boolean | undefined;
  log: (message: string) => void;
  run?: typeof runProjectProcess | undefined;
}): Promise<ProjectCodex> {
  if (process.platform !== "darwin" && process.platform !== "linux")
    throw new LearningProblem(
      "The project launcher currently supports macOS and Linux. Use the manual course harness setup on this platform.",
    );
  assertNotAborted(options.signal);
  const run = options.run ?? runProjectProcess;
  const environment = sanitizedProjectEnvironment(options.env);
  if (!options.forceManaged) {
    const installed = await installedExecutable(environment);
    assertNotAborted(options.signal);
    if (installed) {
      let fallback = "The installed Codex version check failed";
      try {
        const result = await run({
          command: installed.command,
          args: ["--version"],
          cwd: path.resolve(options.profile),
          env: { ...environment, CODEX_HOME: path.resolve(options.profile) },
          stdio: "capture",
          signal: options.signal,
          timeoutMs: 15_000,
          maxOutputBytes: 64_000,
        });
        assertNotAborted(options.signal);
        if (
          !result.timedOut &&
          !result.outputLimitExceeded &&
          (result.signal === "SIGINT" || result.signal === "SIGTERM")
        )
          throw new LearningProblem(
            "Codex selection was interrupted; no coding session was opened.",
          );
        if (
          result.code === 0 &&
          !result.timedOut &&
          !result.outputLimitExceeded
        ) {
          const parsed = stableVersion(result.stdout);
          if (parsed && meetsMinimum(parsed.parts)) {
            options.log(
              `Using installed Codex CLI ${parsed.version} at ${JSON.stringify(installed.command)}. The course setup check verifies this version before project work.`,
            );
            return {
              ...installed,
              args: [],
              version: parsed.version,
              source: "installed",
            };
          }
          fallback = parsed
            ? `Installed Codex ${parsed.version} is older than ${projectCodexVersion}`
            : "The installed Codex did not report a supported stable version";
        }
      } catch (error) {
        assertNotAborted(options.signal);
        if (
          error instanceof LearningProblem &&
          (/selection was interrupted/.test(error.message) ||
            /descendant cleanup could not be verified/.test(error.message))
        )
          throw error;
        // Do not relay an arbitrary executable's diagnostics or error text.
      }
      options.log(`${fallback}; using the private pinned installation.`);
    } else
      options.log(
        "Codex was not found on PATH; using the private pinned installation.",
      );
  } else
    options.log("Using the private pinned Codex installation as requested.");
  assertNotAborted(options.signal);
  const managed = await ensureProjectCodex({
    directory: options.directory,
    profile: options.profile,
    env: environment,
    signal: options.signal,
    log: options.log,
    run,
  });
  assertNotAborted(options.signal);
  return {
    ...managed,
    version: projectCodexVersion,
    source: "managed",
    executable: await realpath(managed.args[0]!),
  };
}
