import path from "node:path";
import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  renameSync,
  readdirSync,
  appendFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import { ensureLearningDirectory } from "./learning-storage.ts";
import { learningShellQuote } from "./learning-setup.ts";
import {
  projectConfiguration,
  projectPreflight,
  inspectProjectEvents,
  type ProjectPhase,
} from "./learning-project-config.ts";
import { runProjectProcess } from "./learning-project-process.ts";
import type { ProjectCodex } from "./learning-project-codex.ts";
import { assertProjectConfigurationBoundary } from "./learning-project-boundary.ts";

export function regularFile(filename: string, maximum = 8_000_000) {
  learningAssert(
    existsSync(filename),
    "A setup-check file is missing; retain the check directory and rerun --check.",
  );
  const state = lstatSync(filename);
  learningAssert(
    state.isFile() && !state.isSymbolicLink() && state.size <= maximum,
    "Project setup state must contain bounded regular files, not symbolic links.",
  );
  return readFileSync(filename, "utf8");
}
function privateJson(filename: string, value: unknown) {
  const stage = `${filename}.${randomUUID()}.tmp`;
  writeFileSync(stage, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  renameSync(stage, filename);
}
function commandText(command: string, args: string[]) {
  return [command, ...args].map(learningShellQuote).join(" ");
}
/** Codex session records prove workers executed commands, beyond coordinator claims. */
export function inspectProjectWorkers(
  profile: string,
  ids: string[],
  parent: string,
  workspace: string,
  model: string,
) {
  const sessions = path.join(profile, "sessions");
  learningAssert(
    existsSync(sessions),
    "The fleet setup check did not retain its worker session records.",
  );
  const files: string[] = [],
    stack = [sessions];
  let inspected = 0;
  while (stack.length) {
    const directory = stack.pop()!;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      learningAssert(
        ++inspected <= 50_000,
        "The session directory is too large for the setup check; retain it and use a fresh course profile.",
      );
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) stack.push(filename);
      else if (
        entry.isFile() &&
        ids.some((id) => entry.name.endsWith(`${id}.jsonl`))
      )
        files.push(filename);
    }
  }
  for (const id of ids) {
    learningAssert(
      /^[a-f0-9-]{36}$/.test(id),
      "The fleet returned an invalid worker identity.",
    );
    const candidates = files.filter((file) => file.endsWith(`${id}.jsonl`));
    learningAssert(
      candidates.length === 1,
      "Each setup worker must have one attributable session record.",
    );
    let rows: any[];
    try {
      rows = regularFile(candidates[0]!)
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
    } catch {
      throw new LearningProblem(
        "A worker session record is incomplete; retain the failed check and retry after diagnosis.",
      );
    }
    const meta = rows.find((row) => row.type === "session_meta")?.payload;
    learningAssert(
      meta?.id === id &&
        meta.model_provider === "aalto" &&
        meta.source?.subagent?.thread_spawn?.parent_thread_id === parent &&
        meta.source.subagent.thread_spawn.depth === 1 &&
        typeof meta.cwd === "string" &&
        realpathSync(meta.cwd) === realpathSync(workspace),
      "Worker attribution, provider or workspace differs from the setup configuration.",
    );
    const turns = rows.filter((row) => row.type === "turn_context");
    learningAssert(
      turns.length > 0 && turns.every((row) => row.payload?.model === model),
      "A setup worker used an unexpected model.",
    );
    const items = rows
      .filter((row) => row.type === "response_item")
      .map((row) => row.payload);
    const calls = items.filter(
      (item) => item.type === "function_call" && item.name === "exec_command",
    );
    learningAssert(
      calls.some((call) =>
        items.some(
          (item) =>
            item.type === "function_call_output" &&
            item.call_id === call.call_id &&
            /Process exited with code 0/.test(String(item.output)),
        ),
      ),
      "A setup worker did not retain a successful command result.",
    );
  }
}

export async function ensureProjectPreflight(options: {
  root: string;
  phase: ProjectPhase;
  profile: string;
  codex: ProjectCodex;
  env: Record<string, string>;
  force: boolean;
}) {
  const { root, phase, profile, codex, env, force } = options;
  const configuration = projectConfiguration(phase);
  const digest = createHash("sha256")
    .update(
      JSON.stringify({ configuration: configuration.digest, harness: codex }),
    )
    .digest("hex");
  const receiptFile = path.join(profile, "preflight.json");
  let receipt: any;
  if (existsSync(receiptFile)) {
    try {
      receipt = JSON.parse(regularFile(receiptFile, 50_000));
    } catch {
      /* A damaged receipt cannot skip a new check. */
    }
  }
  if (force || receipt?.status !== "passed" || receipt?.digest !== digest) {
    ensureLearningDirectory(path.join(root, "checks"));
    ensureLearningDirectory(path.join(root, "checks", phase));
    const directory = path.join(
      root,
      "checks",
      phase,
      `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`,
    );
    ensureLearningDirectory(directory);
    assertProjectConfigurationBoundary(directory);
    const fixture = projectPreflight(
      phase,
      `Aalto ${phase} setup check ${randomUUID()}\n`,
    );
    writeFileSync(path.join(directory, "input.txt"), fixture.marker, {
      flag: "wx",
      mode: 0o600,
    });
    writeFileSync(path.join(directory, "check.mjs"), fixture.checker, {
      flag: "wx",
      mode: 0o600,
    });
    writeFileSync(path.join(directory, "prompt.txt"), fixture.prompt, {
      flag: "wx",
      mode: 0o600,
    });
    const args = [
      ...codex.args,
      "exec",
      "--strict-config",
      "--skip-git-repo-check",
      "--json",
      "--cd",
      directory,
      fixture.prompt,
    ];
    console.log(
      `\nSetup check in a disposable directory (usually under two minutes):\nCODEX_HOME=${learningShellQuote(profile)} ${commandText(codex.command, args)}\nRetaining the first result in ${directory}`,
    );
    for (const name of ["events.jsonl", "stderr.txt"])
      writeFileSync(path.join(directory, name), "", {
        flag: "wx",
        mode: 0o600,
      });
    const started = Date.now();
    const controller = new AbortController();
    const interrupt = () => controller.abort();
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    try {
      const result = await runProjectProcess({
        command: codex.command,
        args,
        cwd: directory,
        env,
        stdio: "capture",
        timeoutMs: 180_000,
        maxOutputBytes: 8_000_000,
        signal: controller.signal,
        onOutput: (text, stream) =>
          appendFileSync(
            path.join(
              directory,
              stream === "stdout" ? "events.jsonl" : "stderr.txt",
            ),
            text,
          ),
      });
      learningAssert(
        result.code === 0 &&
          !result.timedOut &&
          !result.outputLimitExceeded &&
          !controller.signal.aborted,
        `The setup check stopped or failed. Check Aalto VPN and the retained diagnostics in ${directory}; no project session was opened.`,
      );
      learningAssert(
        regularFile(path.join(directory, "input.txt")) === fixture.marker &&
          regularFile(path.join(directory, "check.mjs")) === fixture.checker,
        "The setup input or checker was changed. The check failed and its files were retained.",
      );
      for (const output of fixture.outputs)
        learningAssert(
          regularFile(
            path.join(directory, output),
            Buffer.byteLength(fixture.marker),
          ) === fixture.marker,
          "The expected file operation did not happen correctly. The setup check failed.",
        );
      const evidence = inspectProjectEvents(result.stdout, phase);
      if (configuration.fleet) {
        const parent = result.stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .find((event) => event.type === "thread.started")?.thread_id;
        learningAssert(
          typeof parent === "string",
          "The fleet setup trace has no coordinator identity.",
        );
        inspectProjectWorkers(
          profile,
          evidence.workers,
          parent,
          directory,
          configuration.model,
        );
      }
      const summary = {
        status: "passed",
        phase,
        configuration: configuration.id,
        digest,
        codex: codex.version,
        harness: codex,
        model: configuration.model,
        checkedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        directory,
        ...evidence,
      };
      privateJson(path.join(directory, "summary.json"), summary);
      privateJson(receiptFile, summary);
      console.log(
        `Setup check passed. Outputs were checked independently${configuration.fleet ? "; both workers ran commands and closed" : ""}.`,
      );
    } catch (error) {
      privateJson(path.join(directory, "summary.json"), {
        status: "failed",
        phase,
        digest,
        codex: codex.version,
        harness: codex,
        elapsedMs: Date.now() - started,
        error:
          error instanceof LearningProblem
            ? error.message
            : "Setup check failed; see retained diagnostics.",
      });
      // An older success must not hide this failed recheck on the next launch.
      privateJson(receiptFile, {
        status: "failed",
        digest,
        codex: codex.version,
        harness: codex,
        directory,
      });
      throw error;
    } finally {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
    }
  } else
    console.log(
      `Reusing the passed setup check from ${receipt.checkedAt}. Run project ${phase} --check${codex.source === "managed" ? " --managed-codex" : ""} to repeat it.`,
    );
}
