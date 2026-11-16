import { spawn, execFileSync } from "node:child_process";
import { mkdir, lstat, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { LearningProblem } from "../../shared/learning-workspace.ts";

export const projectCodexVersion = "0.154.0";

/** Keep ordinary terminal identity without importing provider or shell injection settings. */
export function sanitizedProjectEnvironment(
  source: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const allowed = new Set([
    "PATH",
    "HOME",
    "USERPROFILE",
    "USER",
    "LOGNAME",
    "SHELL",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "LANG",
    "TERM",
    "COLORTERM",
    "TERM_PROGRAM",
    "TERM_PROGRAM_VERSION",
    "NO_COLOR",
    "FORCE_COLOR",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "NODE_EXTRA_CA_CERTS",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
  ]);
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(source)) {
    if (!value || (!allowed.has(name) && !/^LC_[A-Z_]+$/.test(name))) continue;
    if (/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH)/i.test(name)) continue;
    // A proxy with embedded credentials is not an ordinary nonsecret setting.
    if (/^(?:HTTP|HTTPS)_PROXY$/.test(name)) {
      try {
        const proxy = new URL(value);
        if (proxy.username || proxy.password) continue;
      } catch {
        continue;
      }
    }
    environment[name] = value;
  }
  return environment;
}

export interface ProjectProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  stdio: "inherit" | "capture";
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  onOutput?: ((text: string, stream: "stdout" | "stderr") => void) | undefined;
}

export interface ProjectProcessResult {
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputLimitExceeded: boolean;
}

function supportedPlatform() {
  if (process.platform !== "darwin" && process.platform !== "linux")
    throw new LearningProblem(
      "The managed project launcher currently supports macOS and Linux. Use the manual course harness setup on this platform.",
    );
}

function secretRedactor(environment: Record<string, string | undefined>) {
  const values = Object.entries(environment)
    .filter(
      ([name, value]) =>
        /(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH)/i.test(name) &&
        typeof value === "string" &&
        value.length >= 4,
    )
    .map(([, value]) => value!)
    .sort((a, b) => b.length - a.length);
  return (text: string) => {
    for (const value of values) {
      text = text.replaceAll(value, "[redacted]");
      // A killed or output-limited command can leave an incomplete key at EOF.
      for (
        let length = Math.min(value.length - 1, text.length);
        length >= 4;
        length--
      ) {
        if (text.endsWith(value.slice(0, length))) {
          text = text.slice(0, -length) + "[redacted]";
          break;
        }
      }
    }
    return text;
  };
}

/** Snapshot descendants before terminating their parent so they cannot be lost by reparenting. */
function descendants(parent: number): number[] {
  const output = execFileSync("ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
    timeout: 2000,
    maxBuffer: 2_000_000,
    env: sanitizedProjectEnvironment() as NodeJS.ProcessEnv,
  });
  const rows = output
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number));
  const found = new Set<number>([parent]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pid, ppid] of rows) {
      if (pid && ppid && found.has(ppid) && !found.has(pid)) {
        found.add(pid);
        grew = true;
      }
    }
  }
  return [...found];
}

function send(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

/** Capture runs own a process group; interactive runs retain their foreground terminal. */
export async function runProjectProcess(
  options: ProjectProcessOptions,
): Promise<ProjectProcessResult> {
  supportedPlatform();
  if (options.signal?.aborted)
    return {
      code: null,
      signal: "SIGTERM",
      stdout: "",
      stderr: "",
      timedOut: false,
      outputLimitExceeded: false,
    };
  const capture = options.stdio === "capture";
  if (!capture) {
    try {
      descendants(process.pid);
    } catch {
      throw new LearningProblem(
        "This terminal does not allow the process inspection needed to stop the project agent safely. Use a terminal with normal process permissions.",
      );
    }
  }
  const limit = options.maxOutputBytes ?? 2_000_000;
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new LearningProblem("Choose a positive output capture limit.");
  const timeoutMs = options.timeoutMs ?? (capture ? 180_000 : undefined);
  if (
    timeoutMs !== undefined &&
    (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
  )
    throw new LearningProblem("Choose a positive command timeout.");
  const redact = secretRedactor(options.env);
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env as NodeJS.ProcessEnv,
    shell: false,
    detached: capture,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  let stdout = "",
    stderr = "",
    bytes = 0;
  let timedOut = false,
    outputLimitExceeded = false;
  let cleanup: Promise<void> | undefined;
  let cleanupError: unknown;
  const pending = { stdout: "", stderr: "" };
  const decoders = {
    stdout: new StringDecoder("utf8"),
    stderr: new StringDecoder("utf8"),
  };
  const terminate = () => {
    if (cleanup || !child.pid) return;
    const pid = child.pid;
    cleanup = (async () => {
      const targets = capture ? [-pid] : descendants(pid);
      // The foreground parent goes first; retain the snapshot for hard cleanup.
      for (const target of targets) send(target, "SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      for (const target of targets.slice().reverse()) send(target, "SIGKILL");
    })().catch((error) => {
      cleanupError = error;
      // Always stop the direct process even if descendant inspection failed.
      try {
        child.kill("SIGKILL");
      } catch {
        /* Report the cleanup failure below. */
      }
    });
  };
  const append = (stream: "stdout" | "stderr", text: string) => {
    if (stream === "stdout") stdout += text;
    else stderr += text;
    pending[stream] += text;
    let end: number;
    while ((end = pending[stream].indexOf("\n")) >= 0) {
      const line = pending[stream].slice(0, end + 1);
      pending[stream] = pending[stream].slice(end + 1);
      options.onOutput?.(redact(line), stream);
    }
  };
  const output = (stream: "stdout" | "stderr", data: Buffer) => {
    bytes += data.length;
    if (bytes > limit) {
      outputLimitExceeded = true;
      terminate();
      return;
    }
    append(stream, decoders[stream].write(data));
  };
  child.stdout?.on("data", (data: Buffer) => output("stdout", data));
  child.stderr?.on("data", (data: Buffer) => output("stderr", data));
  options.signal?.addEventListener("abort", terminate, { once: true });
  const sigterm = () => terminate();
  // Inherit preserves the foreground group; terminal SIGINT also reaches Codex.
  const sigint = () => {
    if (capture) terminate();
  };
  process.on("SIGTERM", sigterm);
  process.on("SIGINT", sigint);
  const timer =
    timeoutMs === undefined
      ? undefined
      : setTimeout(() => {
          timedOut = true;
          terminate();
        }, timeoutMs);
  try {
    const result = await new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve, reject) => {
      child.once("error", (error: NodeJS.ErrnoException) =>
        reject(
          new LearningProblem(
            `Could not start ${path.basename(options.command)} (${error.code ?? "process error"}). Check the installed command and workspace.`,
          ),
        ),
      );
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    await cleanup;
    if (cleanupError)
      throw new LearningProblem(
        "The command stopped, but descendant cleanup could not be verified. Check for remaining project commands before retrying.",
      );
    for (const stream of ["stdout", "stderr"] as const) {
      append(stream, decoders[stream].end());
      if (pending[stream]) options.onOutput?.(redact(pending[stream]), stream);
    }
    return {
      ...result,
      stdout: redact(stdout),
      stderr: redact(stderr),
      timedOut,
      outputLimitExceeded,
    };
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", terminate);
    process.off("SIGTERM", sigterm);
    process.off("SIGINT", sigint);
  }
}

async function regular(filename: string, directory: boolean, optional = false) {
  let state;
  try {
    state = await lstat(filename);
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === "ENOENT")
      return false;
    throw new LearningProblem(
      "The managed Codex installation is incomplete or inaccessible. Retain it for inspection and retry setup.",
    );
  }
  if (
    state.isSymbolicLink() ||
    (directory ? !state.isDirectory() : !state.isFile())
  )
    throw new LearningProblem(
      "Use regular directories and files for the managed Codex installation; symbolic links are not accepted.",
    );
  return true;
}

function shown(command: string, args: string[]) {
  return [command, ...args]
    .map((part) =>
      /^[A-Za-z0-9_./:@=-]+$/.test(part)
        ? part
        : `'${part.replaceAll("'", `'"'"'`)}'`,
    )
    .join(" ");
}

export async function ensureProjectCodex(options: {
  directory: string;
  /** Isolate the harness version probe without supplying this profile to npm. */
  profile?: string | undefined;
  log: (message: string) => void;
  env?: Record<string, string | undefined> | undefined;
  signal?: AbortSignal | undefined;
  run?: typeof runProjectProcess | undefined;
}): Promise<{ command: string; args: string[] }> {
  supportedPlatform();
  const run = options.run ?? runProjectProcess;
  const directory = path.resolve(options.directory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await regular(directory, true);
  const versionDirectory = path.join(directory, `codex-${projectCodexVersion}`);
  await mkdir(versionDirectory, { recursive: true, mode: 0o700 });
  await regular(versionDirectory, true);
  const lock = path.join(directory, `codex-${projectCodexVersion}.lock`);
  const owner = randomUUID();
  try {
    await writeFile(lock, JSON.stringify({ pid: process.pid, owner }), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new LearningProblem(
        "Another project setup may be installing Codex. Wait for it to finish; if it was interrupted, confirm no setup is running before removing its managed installation lock.",
      );
    throw error;
  }
  try {
    const packageDirectory = path.join(
      versionDirectory,
      "node_modules",
      "@openai",
      "codex",
    );
    const manifest = path.join(packageDirectory, "package.json");
    const entry = path.join(packageDirectory, "bin", "codex.js");
    const environment = sanitizedProjectEnvironment(options.env);
    for (const folder of [
      path.join(versionDirectory, "node_modules"),
      path.join(versionDirectory, "node_modules", "@openai"),
      packageDirectory,
      path.join(packageDirectory, "bin"),
    ])
      await regular(folder, true, true);
    for (const file of ["package.json", "package-lock.json", ".npmrc"])
      await regular(path.join(versionDirectory, file), false, true);
    if (!(await regular(manifest, false, true))) {
      const args = [
        "install",
        "--prefix",
        versionDirectory,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "--registry=https://registry.npmjs.org",
        `@openai/codex@${projectCodexVersion}`,
      ];
      options.log(
        `Installing the pinned coding harness:\n${shown("npm", args)}`,
      );
      const install = await run({
        command: "npm",
        args,
        cwd: versionDirectory,
        env: environment,
        stdio: "capture",
        signal: options.signal,
        timeoutMs: 180_000,
        maxOutputBytes: 2_000_000,
        onOutput: (text) => options.log(text.trimEnd()),
      });
      if (install.code !== 0 || install.timedOut || install.outputLimitExceeded)
        throw new LearningProblem(
          "The pinned Codex installation did not complete. Check the retained npm output and network access, then retry; no model key was supplied to npm.",
        );
    }
    for (const folder of [
      path.join(versionDirectory, "node_modules"),
      path.join(versionDirectory, "node_modules", "@openai"),
      packageDirectory,
      path.join(packageDirectory, "bin"),
    ])
      await regular(folder, true);
    await regular(manifest, false);
    await regular(entry, false);
    let metadata: { name?: string; version?: string };
    try {
      metadata = JSON.parse(await readFile(manifest, "utf8"));
    } catch {
      throw new LearningProblem(
        "The managed Codex package metadata is unreadable; no harness was launched.",
      );
    }
    if (
      metadata.name !== "@openai/codex" ||
      metadata.version !== projectCodexVersion
    )
      throw new LearningProblem(
        `The managed harness is not @openai/codex@${projectCodexVersion}; no harness was launched. Inspect the installation before retrying.`,
      );
    const command = process.execPath;
    const args = [entry];
    const probeProfile = options.profile
      ? path.resolve(options.profile)
      : undefined;
    if (probeProfile) await regular(probeProfile, true);
    const version = await run({
      command,
      args: [...args, "--version"],
      cwd: probeProfile ?? versionDirectory,
      env: probeProfile
        ? { ...environment, CODEX_HOME: probeProfile }
        : environment,
      stdio: "capture",
      signal: options.signal,
      timeoutMs: 15_000,
      maxOutputBytes: 64_000,
    });
    if (
      version.code !== 0 ||
      version.timedOut ||
      version.outputLimitExceeded ||
      version.stdout.trim() !== `codex-cli ${projectCodexVersion}`
    )
      throw new LearningProblem(
        `The managed Codex executable did not verify as ${projectCodexVersion}. No alternate harness was launched.`,
      );
    options.log(`Verified Codex CLI ${projectCodexVersion}.`);
    return { command, args };
  } finally {
    try {
      const value = JSON.parse(await readFile(lock, "utf8"));
      if (value.owner === owner) await rm(lock);
    } catch {
      /* An externally changed lock is retained. */
    }
  }
}
