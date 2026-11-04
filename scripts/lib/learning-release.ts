import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const repository = "bebraw/scalability_book";
const workflow = "learning-companion.yml";
const workflowPath = `.github/workflows/${workflow}`;
const registry = "https://registry.npmjs.org";
// npm selects a scope-specific registry before its general --registry setting.
const scopedRegistry = `--@scalableweb:registry=${registry}`;
const expectedJobs = ["ubuntu-latest", "macos-latest"].flatMap((os) =>
  [24, 26].map((node) => `package (${os}, ${node})`),
);

export interface ReleaseCommand {
  file: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  inherit?: boolean;
  input?: string;
  env?: Record<string, string>;
}
export interface ReleaseCommandResult {
  status: number;
  stdout: string;
  stderr: string;
}
export interface LearningReleaseOptions {
  root: string;
  release: { name: string; version: string };
  dryRun?: boolean;
  run?: (command: ReleaseCommand) => Promise<ReleaseCommandResult>;
  fetch?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (message: string) => void;
  platform?: NodeJS.Platform;
  nodeVersion?: string;
  interactive?: boolean;
}
interface Receipt {
  schema: 1;
  name: string;
  version: string;
  sourceRevision: string;
  artifact: string;
  integrity: string;
  sourceRunId?: number;
  publishedRunId?: number;
  uncertainDispatch?: "source" | "published";
  phase: "tested" | "publishing" | "published" | "complete";
}
interface RegistryVersion {
  name: string;
  version: string;
  dist: { integrity: string; tarball: string };
}
interface WorkflowRun {
  id: number;
  head_sha: string;
  path: string;
  event: string;
  status: string;
  conclusion: string | null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function stableVersion(version: string): number[] {
  assert(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version),
    `Release versions must be stable major.minor.patch versions: ${version}.`,
  );
  const parts = version.split(".").map(Number);
  assert(parts.every(Number.isSafeInteger), "Release version is too large.");
  return parts;
}
function olderThan(candidate: string, latest: string): boolean {
  const a = stableVersion(candidate),
    b = stableVersion(latest);
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index]! < b[index]!;
  }
  return false;
}
function integrity(bytes: Uint8Array): string {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

async function execute(command: ReleaseCommand): Promise<ReleaseCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.file, command.args, {
      cwd: command.cwd,
      env: { ...process.env, ...command.env },
      shell: false,
      stdio: command.inherit ? "inherit" : "pipe",
    });
    let stdout = "",
      stderr = "",
      timedOut = false,
      oversized = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      child.kill("SIGTERM");
      killTimer ??= setTimeout(() => child.kill("SIGKILL"), 2_000);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, command.timeoutMs);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 4_000_000) {
        oversized = true;
        stop();
      }
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4_000_000) {
        oversized = true;
        stop();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      reject(new Error(`Cannot run ${command.file}: ${error.message}`));
    });
    child.once("close", (status) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (timedOut)
        reject(new Error(`${command.file} exceeded its time limit.`));
      else if (oversized)
        reject(new Error(`${command.file} exceeded its output limit.`));
      else resolve({ status: status ?? 1, stdout, stderr });
    });
    child.stdin?.end(command.input);
  });
}

export function parseReleaseArgs(args: string[]): {
  help: boolean;
  dryRun: boolean;
} {
  assert(
    args.every((argument) => argument === "--help" || argument === "--dry-run"),
    "Usage: npm run companion:release -- [--dry-run | --help]. Prepare and commit version changes separately.",
  );
  return { help: args.includes("--help"), dryRun: args.includes("--dry-run") };
}

export async function runLearningCompanionRelease(
  options: LearningReleaseOptions,
) {
  const root = path.resolve(options.root),
    { name, version } = options.release,
    run = options.run ?? execute,
    fetcher = options.fetch ?? globalThis.fetch,
    sleep =
      options.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))),
    now = options.now ?? Date.now,
    log = options.log ?? console.log,
    interactive =
      options.interactive ??
      Boolean(process.stdin.isTTY && process.stdout.isTTY);
  assert(
    name === "@scalableweb/companion",
    "Unexpected Companion package name.",
  );
  stableVersion(version);
  assert(
    ["darwin", "linux"].includes(options.platform ?? process.platform),
    "Companion releases require macOS or Linux.",
  );
  assert(
    [24, 26].includes(
      Number(
        (options.nodeVersion ?? process.versions.node)
          .replace(/^v/, "")
          .split(".")[0],
      ),
    ),
    "Companion releases require Node.js 24 or 26.",
  );
  const command = async (
    file: string,
    args: string[],
    extra: Partial<ReleaseCommand> = {},
  ) => run({ file, args, cwd: root, timeoutMs: 30_000, ...extra });
  const checked = async (
    file: string,
    args: string[],
    extra: Partial<ReleaseCommand> = {},
  ) => {
    const result = await command(file, args, extra);
    assert(
      result.status === 0,
      `${file} ${args[0] ?? ""} failed (exit ${result.status}).`,
    );
    return result.stdout.trim();
  };
  const api = async (endpoint: string, body?: unknown) =>
    JSON.parse(
      await checked(
        "gh",
        [
          "api",
          "--hostname",
          "github.com",
          "-H",
          "Accept: application/vnd.github+json",
          "-H",
          "X-GitHub-Api-Version: 2026-03-10",
          "--method",
          body ? "POST" : "GET",
          endpoint,
          ...(body ? ["--input", "-"] : []),
        ],
        body ? { input: JSON.stringify(body) } : {},
      ),
    );
  for (const file of ["git", "gh", "npm"]) await checked(file, ["--version"]);
  const manifest = JSON.parse(
    readFileSync(
      path.join(root, "packages/learning-companion/package.json"),
      "utf8",
    ),
  );
  assert(
    manifest.name === name && manifest.version === version,
    "Package manifest and shared release metadata disagree.",
  );
  const sourceRevision = await checked("git", ["rev-parse", "HEAD"]);
  assert(
    /^[a-f0-9]{40}$/.test(sourceRevision),
    "Cannot identify the source commit.",
  );
  const cleanSource = async () => {
    assert(
      (await checked("git", ["symbolic-ref", "--short", "HEAD"])) === "main",
      "Release from a non-detached main branch.",
    );
    assert(
      !(await checked("git", [
        "status",
        "--porcelain",
        "--untracked-files=normal",
      ])),
      "Commit all source changes before releasing.",
    );
    assert(
      (await checked("git", ["rev-parse", "HEAD"])) === sourceRevision,
      "The source commit changed during release; stop and review it.",
    );
    const remote = await api(`repos/${repository}/git/ref/heads/main`);
    assert(
      remote.object?.sha === sourceRevision,
      "Local HEAD must match the pushed GitHub main branch.",
    );
  };
  await cleanSource();

  const directory = path.join(root, ".local/companion-release"),
    artifact = path.join(directory, `scalableweb-companion-${version}.tgz`),
    receiptPath = path.join(directory, `release-${version}.json`),
    lockPath = path.join(directory, "release.lock");
  mkdirSync(directory, { recursive: true });
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, "utf8"));
    assert(
      Number.isSafeInteger(pid) && pid > 0,
      `Invalid release lock; inspect ${lockPath}.`,
    );
    try {
      process.kill(pid, 0);
      throw new Error(`Another release is running (PID ${pid}).`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      unlinkSync(lockPath);
    }
  }
  const lock = openSync(lockPath, "wx");
  writeFileSync(lock, String(process.pid));
  closeSync(lock);
  let receipt: Receipt | undefined;
  const save = () => {
    writeFileSync(
      `${receiptPath}.tmp`,
      JSON.stringify(receipt, null, 2) + "\n",
    );
    renameSync(`${receiptPath}.tmp`, receiptPath);
  };
  const registryVersion = async (
    requested: string,
  ): Promise<RegistryVersion | undefined> => {
    const response = await fetcher(
      `${registry}/@scalableweb%2fcompanion/${encodeURIComponent(requested)}`,
      {
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
        cache: "no-store",
      },
    );
    if (response.status === 404) return undefined;
    assert(
      response.ok,
      `Registry state is unknown (HTTP ${response.status}); publishing stopped.`,
    );
    const value = (await response.json()) as RegistryVersion;
    assert(
      value.name === name &&
        typeof value.version === "string" &&
        (requested === "latest" || value.version === requested) &&
        typeof value.dist?.integrity === "string" &&
        /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(value.dist.integrity) &&
        typeof value.dist.tarball === "string",
      "Registry returned invalid package metadata; publishing stopped.",
    );
    return value;
  };
  const validateRun = (value: WorkflowRun, dispatched: boolean) => {
    assert(
      Number.isSafeInteger(value.id) &&
        value.id > 0 &&
        value.head_sha === sourceRevision &&
        value.path?.split("@")[0] === workflowPath &&
        (dispatched
          ? value.event === "workflow_dispatch"
          : ["push", "workflow_dispatch"].includes(value.event)),
      "GitHub workflow run does not match the expected source and workflow.",
    );
  };
  const checkJobs = async (runId: number) => {
    const jobs = await api(
      `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
    );
    assert(
      jobs.total_count === 4 &&
        Array.isArray(jobs.jobs) &&
        jobs.jobs.length === 4 &&
        expectedJobs.every(
          (name) =>
            jobs.jobs.filter(
              (job: { name: string; status: string; conclusion: string }) =>
                job.name === name &&
                job.status === "completed" &&
                job.conclusion === "success",
            ).length === 1,
        ),
      "The complete macOS/Linux × Node 24/26 package matrix has not passed.",
    );
  };
  const existingSourceRun = async (): Promise<WorkflowRun | undefined> => {
    const result = await api(
      `repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${sourceRevision}&per_page=100`,
    );
    assert(
      Array.isArray(result.workflow_runs),
      "Invalid GitHub workflow listing.",
    );
    const candidate = result.workflow_runs[0] as WorkflowRun | undefined;
    if (candidate) {
      validateRun(candidate, false);
      return candidate;
    }
    return undefined;
  };
  const waitRun = async (id: number, dispatched = true) => {
    const deadline = now() + 45 * 60_000;
    let previous = "";
    for (let poll = 0; poll < 270 && now() < deadline; poll++) {
      const value = (await api(
        `repos/${repository}/actions/runs/${id}`,
      )) as WorkflowRun;
      validateRun(value, dispatched);
      assert(value.id === id, "GitHub returned a different workflow run.");
      if (value.status !== previous) {
        log(
          `Workflow ${id}: ${value.status}. https://github.com/${repository}/actions/runs/${id}`,
        );
        previous = value.status;
      }
      if (value.status === "completed") {
        assert(
          value.conclusion === "success",
          `Workflow ${id} finished with ${value.conclusion}. Review and rerun that GitHub run, then rerun the release command: https://github.com/${repository}/actions/runs/${id}`,
        );
        await checkJobs(id);
        return;
      }
      await sleep(10_000);
    }
    throw new Error(
      `Workflow ${id} is still pending after 45 minutes. Rerun this command to resume: https://github.com/${repository}/actions/runs/${id}`,
    );
  };
  const ensureCi = async (published: boolean) => {
    const key = published ? "publishedRunId" : "sourceRunId";
    let id = receipt![key];
    if (id) {
      await waitRun(id, published);
      return;
    }
    if (!published) id = (await existingSourceRun())?.id;
    if (!id) {
      await cleanSource();
      receipt!.uncertainDispatch = published ? "published" : "source";
      save();
      const dispatched = await api(
        `repos/${repository}/actions/workflows/${workflow}/dispatches`,
        {
          ref: "main",
          inputs: published
            ? {
                "verify-published": true,
                "release-version": version,
                "release-integrity": receipt!.integrity,
              }
            : { "verify-published": false },
        },
      );
      assert(
        Number.isSafeInteger(dispatched.workflow_run_id) &&
          dispatched.workflow_run_id > 0,
        "Workflow dispatch did not return a run ID. Inspect GitHub Actions before retrying; dispatch may have succeeded.",
      );
      const dispatchedId: number = dispatched.workflow_run_id;
      receipt![key] = dispatchedId;
      delete receipt!.uncertainDispatch;
      save();
      await waitRun(dispatchedId);
    } else {
      receipt![key] = id;
      save();
      await waitRun(id, false);
    }
  };
  try {
    if (existsSync(receiptPath)) {
      receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
      assert(
        receipt?.schema === 1 &&
          receipt.name === name &&
          receipt.version === version &&
          receipt.sourceRevision === sourceRevision &&
          receipt.artifact === artifact &&
          typeof receipt.integrity === "string" &&
          ["tested", "publishing", "published", "complete"].includes(
            receipt.phase,
          ),
        `Release receipt does not match this source/version. Inspect ${receiptPath}; do not overwrite a published release.`,
      );
      assert(
        !receipt.uncertainDispatch,
        `A previous ${receipt.uncertainDispatch} workflow dispatch has an unknown outcome. Inspect https://github.com/${repository}/actions and ${receiptPath} before retrying; no workflow will be redispatched automatically.`,
      );
    }
    let registered = await registryVersion(version);
    assert(
      registered ||
        !receipt ||
        !["published", "complete"].includes(receipt.phase),
      "A previously verified release is missing from the registry; inspect npm before retrying.",
    );
    const latest = await registryVersion("latest");
    assert(
      !latest || !olderThan(version, latest.version),
      `Version ${version} is older than npm latest ${latest?.version}; refusing to move latest backwards.`,
    );
    assert(
      !registered || receipt,
      `Version ${version} already exists in npm without a matching local release receipt. It will not be republished.`,
    );
    if (receipt) {
      assert(
        existsSync(artifact) &&
          integrity(readFileSync(artifact)) === receipt.integrity,
        "The saved release artifact is missing or changed; preserve the exact tested tarball before retrying.",
      );
    } else {
      log(`Building ${name}@${version} from ${sourceRevision}.`);
      await checked("npm", ["run", "companion:pack"], {
        inherit: true,
        timeoutMs: 10 * 60_000,
      });
    }
    const packed = JSON.parse(
      await checked("tar", ["-xOf", artifact, "package/dist/release.json"]),
    );
    assert(
      packed.name === name &&
        packed.version === version &&
        packed.sourceRevision === sourceRevision &&
        packed.dirty === false,
      "Tarball release metadata does not match the clean source commit.",
    );
    const testedIntegrity = integrity(readFileSync(artifact));
    await checked("npm", ["run", "companion:check"], {
      inherit: true,
      timeoutMs: 15 * 60_000,
      env: { COMPANION_CHECK_ARTIFACT: artifact },
    });
    assert(
      integrity(readFileSync(artifact)) === testedIntegrity,
      "The artifact changed during testing; publishing stopped.",
    );
    await cleanSource();
    if (options.dryRun) {
      const sourceRun = await existingSourceRun();
      const passed =
        sourceRun?.status === "completed" && sourceRun.conclusion === "success";
      if (passed) await checkJobs(sourceRun.id);
      assert(
        !sourceRun || sourceRun.status !== "completed" || passed,
        `Source workflow ${sourceRun?.id} finished with ${sourceRun?.conclusion}; review its logs before releasing.`,
      );
      log(
        `Dry run passed local artifact checks. ${passed ? `Source matrix passed in run ${sourceRun.id}.` : sourceRun ? `Source workflow ${sourceRun.id} is ${sourceRun.status}; a real release will wait for it.` : "Source CI is missing; a real release will dispatch it."} No login, workflow dispatch or publication was performed.`,
      );
      return {
        version,
        receiptPath,
        published: false,
        sourceRunId: sourceRun?.id,
        publishedRunId: undefined,
      };
    }
    receipt ??= {
      schema: 1,
      name,
      version,
      sourceRevision,
      artifact,
      integrity: testedIntegrity,
      phase: "tested",
    };
    assert(
      receipt.integrity === testedIntegrity,
      "Release receipt integrity does not match the tested artifact.",
    );
    if (registered)
      assert(
        registered.dist.integrity === receipt.integrity,
        "This version is already published with different bytes; it cannot be replaced.",
      );
    save();
    await ensureCi(false);
    if (!registered) {
      assert(
        interactive,
        "Publishing needs an interactive terminal for npm authentication and 2FA. Run npm run companion:release in a terminal.",
      );
      const identity = await command("npm", ["whoami", "--registry", registry]);
      if (identity.status !== 0) {
        assert(
          /ENEEDAUTH|E401|401 Unauthorized/.test(
            identity.stderr + identity.stdout,
          ),
          "Cannot verify npm authentication; check the registry connection before retrying.",
        );
        await checked(
          "npm",
          [
            "login",
            "--scope=@scalableweb",
            "--registry",
            registry,
            scopedRegistry,
          ],
          { inherit: true, timeoutMs: 10 * 60_000 },
        );
        await checked("npm", ["whoami", "--registry", registry]);
      }
      await cleanSource();
      assert(
        integrity(readFileSync(artifact)) === receipt.integrity,
        "The tested artifact changed before publication.",
      );
      registered = await registryVersion(version);
      const currentLatest = await registryVersion("latest");
      assert(
        !currentLatest || !olderThan(version, currentLatest.version),
        "A newer npm release appeared; refusing to move latest backwards.",
      );
      if (!registered) {
        await cleanSource();
        receipt.phase = "publishing";
        save();
        log(
          `Publishing the tested ${name}@${version} tarball. Complete npm's authentication prompts.`,
        );
        assert(
          integrity(readFileSync(artifact)) === receipt.integrity,
          "The tested artifact changed before publication.",
        );
        let publishError: unknown;
        try {
          await checked(
            "npm",
            [
              "publish",
              artifact,
              "--access",
              "public",
              "--registry",
              registry,
              scopedRegistry,
              "--tag",
              "latest",
            ],
            { inherit: true, timeoutMs: 10 * 60_000 },
          );
        } catch (error) {
          publishError = error;
        }
        const deadline = now() + 2 * 60_000;
        let registryError: unknown;
        for (let attempt = 0; attempt < 12 && now() < deadline; attempt++) {
          try {
            registered = await registryVersion(version);
            registryError = undefined;
          } catch (error) {
            registryError = error;
          }
          if (registered) break;
          await sleep(10_000);
        }
        assert(
          registered,
          `Publication could not be confirmed. ${publishError instanceof Error ? publishError.message : registryError instanceof Error ? registryError.message : "The version is not visible yet."} The release receipt was retained; rerun this command to reconcile with npm.`,
        );
      }
    }
    assert(
      registered.dist.integrity === receipt.integrity,
      "Registry integrity differs from the tested tarball; this published version cannot be replaced.",
    );
    const downloadUrl = new URL(registered.dist.tarball);
    assert(
      downloadUrl.protocol === "https:" &&
        downloadUrl.hostname === "registry.npmjs.org" &&
        !downloadUrl.port &&
        !downloadUrl.username &&
        !downloadUrl.password,
      "Registry returned an unexpected tarball host.",
    );
    const download = await fetcher(downloadUrl.href, {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
      cache: "no-store",
    });
    assert(
      download.ok,
      `Cannot download the published tarball (HTTP ${download.status}); retry to finish verification.`,
    );
    assert(
      integrity(new Uint8Array(await download.arrayBuffer())) ===
        receipt.integrity,
      "Downloaded registry tarball does not match the tested artifact.",
    );
    receipt.phase = "published";
    save();
    await ensureCi(true);
    receipt.phase = "complete";
    save();
    log(
      `Published and verified ${name}@${version}.\nInstall: npx --yes ${name}@${version} setup\nRelease receipt: ${receiptPath}`,
    );
    return {
      version,
      receiptPath,
      published: true,
      sourceRunId: receipt.sourceRunId,
      publishedRunId: receipt.publishedRunId,
    };
  } finally {
    unlinkSync(lockPath);
  }
}
