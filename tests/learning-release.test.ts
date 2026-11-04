import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseReleaseArgs,
  runLearningCompanionRelease,
  type ReleaseCommand,
  type ReleaseCommandResult,
} from "../scripts/lib/learning-release.ts";

const release = { name: "@scalableweb/companion", version: "0.9.7" };
const revision = "a".repeat(40);
const workflow = ".github/workflows/learning-companion.yml";
const repository = "repos/bebraw/scalability_book";
const registry = "https://registry.npmjs.org/@scalableweb%2fcompanion";
const tarball =
  "https://registry.npmjs.org/@scalableweb/companion/-/companion-0.9.7.tgz";
const artifactBytes = Buffer.from(
  "synthetic tested package, no executable content\n",
);
const integrity = (bytes: Uint8Array) =>
  `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const ok = (value: unknown = ""): ReleaseCommandResult => ({
  status: 0,
  stdout: typeof value === "string" ? value : JSON.stringify(value),
  stderr: "",
});
const failed = (): ReleaseCommandResult => ({
  status: 1,
  stdout: "",
  stderr: "Synthetic command failure",
});

function fixture(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), "companion-release-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageDirectory = path.join(root, "packages/learning-companion");
  mkdirSync(packageDirectory, { recursive: true });
  const manifest = path.join(packageDirectory, "package.json");
  writeFileSync(manifest, JSON.stringify(release));
  const output = path.join(root, ".local/companion-release");
  const artifact = path.join(
    output,
    `scalableweb-companion-${release.version}.tgz`,
  );
  const receipt = path.join(output, `release-${release.version}.json`);
  const commands: ReleaseCommand[] = [];
  const requests: { url: string; method: string }[] = [];
  const checked: { artifact: string; bytes: Buffer }[] = [];
  const published: { artifact: string; bytes: Buffer }[] = [];
  const dispatches: Record<string, unknown>[] = [];
  const logs: string[] = [];
  const state = {
    dirty: "",
    branch: "main",
    revision,
    remoteRevision: revision,
    signedIn: true,
    sourceConclusion: "success",
    publishedConclusion: "success",
    sourceRunRevision: revision,
    publishedRunRevision: revision,
    sourceJobs: "success",
    publishedJobs: "success",
    sourceAvailable: true,
    sourceOlderGreen: false,
    sourcePendingPolls: 0,
    sourceDispatched: false,
    dispatchReply: "valid" as "valid" | "missing" | "invalid" | "lost",
    publishStatus: 0,
    registryStatus: 404,
    registryOffline: false,
    latestVersion: "",
    registryBytes: Buffer.from(artifactBytes),
    registryIntegrity: integrity(artifactBytes),
    registryAfterPublish: "matching" as
      | "matching"
      | "absent"
      | "different"
      | "unknown",
    packedRevision: revision,
    packedDirty: false,
  };
  const hooks: {
    beforeCommand?: (command: ReleaseCommand) => void;
    afterCommand?: (command: ReleaseCommand) => void;
    beforeFetch?: (url: string) => void;
  } = {};
  const runInfo = (id: number) => ({
    id,
    head_sha: id !== 201 ? state.sourceRunRevision : state.publishedRunRevision,
    path: workflow,
    event: id !== 201 && !state.sourceDispatched ? "push" : "workflow_dispatch",
    status:
      id === 101 && state.sourcePendingPolls > 0 ? "in_progress" : "completed",
    conclusion:
      id === 100
        ? "success"
        : id === 101
          ? state.sourceConclusion
          : state.publishedConclusion,
    html_url: `https://github.com/bebraw/scalability_book/actions/runs/${id}`,
  });
  const run = async (
    command: ReleaseCommand,
  ): Promise<ReleaseCommandResult> => {
    commands.push(command);
    hooks.beforeCommand?.(command);
    const { args } = command;
    const executable = path.basename(command.file).replace(/\.cmd$/, "");
    let result: ReleaseCommandResult;
    if (
      args.join(" ") === "--version" &&
      ["git", "gh", "npm"].includes(executable)
    ) {
      result = ok("Synthetic command version");
    } else if (executable === "git") {
      if (args[0] === "status") result = ok(state.dirty);
      else if (args.join(" ") === "symbolic-ref --short HEAD")
        result = ok(state.branch);
      else if (args.join(" ") === "rev-parse HEAD") result = ok(state.revision);
      else throw new Error(`Unexpected Git command: ${args.join(" ")}`);
    } else if (executable === "gh" && args[0] === "api") {
      const endpoint = args.find((arg) => arg.startsWith(`${repository}/`));
      assert.ok(endpoint, "GitHub requests must select the release repository");
      const method = args[args.indexOf("--method") + 1];
      assert.ok(method === "GET" || method === "POST");
      if (method === "POST") {
        assert.equal(
          endpoint,
          `${repository}/actions/workflows/learning-companion.yml/dispatches`,
        );
        assert.equal(args[args.indexOf("--input") + 1], "-");
        const input = JSON.parse(command.input!);
        dispatches.push(input);
        const id = input.inputs["verify-published"] ? 201 : 101;
        if (id === 101) {
          state.sourceAvailable = true;
          state.sourceDispatched = true;
        }
        if (state.dispatchReply === "lost")
          throw new Error("Synthetic dispatch response lost");
        result = ok(
          state.dispatchReply === "missing"
            ? {}
            : {
                workflow_run_id:
                  state.dispatchReply === "invalid" ? String(id) : id,
                html_url: runInfo(id).html_url,
              },
        );
      } else if (endpoint === `${repository}/git/ref/heads/main`) {
        result = ok({ object: { sha: state.remoteRevision } });
      } else if (
        endpoint.startsWith(
          `${repository}/actions/workflows/learning-companion.yml/runs?`,
        )
      ) {
        result = ok({
          workflow_runs: state.sourceAvailable
            ? [runInfo(101), ...(state.sourceOlderGreen ? [runInfo(100)] : [])]
            : [],
        });
      } else {
        const match = endpoint.match(
          /\/actions\/runs\/(100|101|201)(\/jobs\?per_page=100)?$/,
        );
        assert.ok(match, `Unexpected GitHub endpoint: ${endpoint}`);
        const id = Number(match[1]);
        if (match[2])
          result = ok({
            total_count: 4,
            jobs: ["ubuntu-latest", "macos-latest"].flatMap((os) =>
              [24, 26].map((node, index) => ({
                name: `package (${os}, ${node})`,
                status: "completed",
                conclusion:
                  index === 0
                    ? id !== 201
                      ? state.sourceJobs
                      : state.publishedJobs
                    : "success",
              })),
            ),
          });
        else {
          if (id === 101 && state.sourcePendingPolls > 0)
            state.sourcePendingPolls--;
          result = ok(runInfo(id));
        }
      }
    } else if (executable === "npm") {
      if (args.join(" ") === "run companion:pack") {
        mkdirSync(output, { recursive: true });
        writeFileSync(artifact, artifactBytes);
        result = ok();
      } else if (args.join(" ") === "run companion:check") {
        const target = command.env?.COMPANION_CHECK_ARTIFACT;
        assert.equal(
          target,
          artifact,
          "The checker must select the release's exact tarball",
        );
        checked.push({ artifact: target!, bytes: readFileSync(target!) });
        result = ok();
      } else if (args[0] === "whoami") {
        result = state.signedIn
          ? ok("synthetic-publisher")
          : { ...failed(), stderr: "npm error code ENEEDAUTH" };
      } else if (args[0] === "login") {
        assert.equal(
          command.inherit,
          true,
          "npm owns interactive login and 2FA prompts",
        );
        state.signedIn = true;
        result = ok();
      } else if (args[0] === "publish") {
        assert.equal(
          command.inherit,
          true,
          "Publishing must preserve npm's browser/2FA prompts",
        );
        assert.equal(args[args.indexOf("--access") + 1], "public");
        const target = path.resolve(command.cwd, args[1]!);
        published.push({ artifact: target, bytes: readFileSync(target) });
        if (state.registryAfterPublish !== "absent") {
          state.registryStatus =
            state.registryAfterPublish === "unknown" ? 503 : 200;
          state.registryBytes =
            state.registryAfterPublish === "different"
              ? Buffer.from("a different registry package")
              : readFileSync(target);
          state.registryIntegrity = integrity(state.registryBytes);
        }
        result = state.publishStatus === 0 ? ok() : failed();
      } else throw new Error(`Unexpected npm command: ${args.join(" ")}`);
    } else if (executable === "tar") {
      assert.equal(args[0], "-xOf");
      assert.equal(path.resolve(command.cwd, args[1]!), artifact);
      assert.equal(args[2], "package/dist/release.json");
      result = ok({
        ...release,
        sourceRevision: state.packedRevision,
        dirty: state.packedDirty,
      });
    } else throw new Error(`Unexpected executable: ${command.file}`);
    hooks.afterCommand?.(command);
    return result;
  };
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ url, method });
    assert.equal(method, "GET", "Registry inspection must never mutate npm");
    hooks.beforeFetch?.(url);
    if (state.registryOffline) throw new Error("Synthetic network unavailable");
    if (url === tarball) return new Response(state.registryBytes);
    assert.ok(
      url === `${registry}/${release.version}` || url === `${registry}/latest`,
      `Unexpected registry URL: ${url}`,
    );
    if (url === `${registry}/latest` && state.latestVersion)
      return Response.json({
        ...release,
        version: state.latestVersion,
        dist: { integrity: state.registryIntegrity, tarball },
      });
    if (state.registryStatus !== 200)
      return new Response("synthetic registry response", {
        status: state.registryStatus,
      });
    return Response.json({
      ...release,
      dist: { integrity: state.registryIntegrity, tarball },
    });
  };
  let time = Date.UTC(2026, 10, 4);
  const sleeps: number[] = [];
  const execute = (dryRun = false, interactive = true) =>
    runLearningCompanionRelease({
      root,
      release,
      dryRun,
      run,
      fetch: fetcher,
      now: () => time,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
        time += milliseconds;
      },
      log: (message) => logs.push(message),
      platform: "linux",
      nodeVersion: "24.0.0",
      interactive,
    });
  return {
    root,
    manifest,
    artifact,
    receipt,
    state,
    hooks,
    commands,
    requests,
    checked,
    published,
    dispatches,
    logs,
    sleeps,
    execute,
  };
}

test("release refuses dirty, unpushed, mismatched or unverified source before publishing", async (t) => {
  for (const gate of [
    "dirty",
    "unpushed",
    "version",
    "source-run",
    "source-matrix",
  ] as const) {
    await t.test(gate, async (t) => {
      const f = fixture(t);
      if (gate === "dirty")
        f.state.dirty = " M shared/learning-connection.ts\n";
      if (gate === "unpushed") f.state.remoteRevision = "b".repeat(40);
      if (gate === "version")
        writeFileSync(
          f.manifest,
          JSON.stringify({ ...release, version: "0.9.8" }),
        );
      if (gate === "source-run") f.state.sourceConclusion = "failure";
      if (gate === "source-matrix") f.state.sourceJobs = "failure";
      const rejection = {
        dirty: /Commit all source changes/,
        unpushed: /pushed GitHub main/,
        version: /manifest and shared release metadata/,
        "source-run": /finished with failure/,
        "source-matrix": /complete.*matrix has not passed/,
      };
      await assert.rejects(f.execute(), rejection[gate]);
      assert.equal(
        f.published.length,
        0,
        "A failed release gate must not reach npm publish",
      );
      assert.equal(
        f.dispatches.filter(
          (dispatch: any) => dispatch.inputs["verify-published"],
        ).length,
        0,
      );
    });
  }
});

test("release publishes the checked bytes and verifies that exact source and integrity on the complete matrix", async (t) => {
  const f = fixture(t);
  const result = await f.execute();
  assert.equal(result.published, true);
  assert.equal(result.version, release.version);
  assert.equal(result.sourceRunId, 101);
  assert.equal(result.publishedRunId, 201);
  assert.equal(f.checked.length, 1);
  assert.equal(f.published.length, 1);
  assert.equal(f.published[0]!.artifact, f.checked[0]!.artifact);
  assert.deepEqual(f.published[0]!.bytes, f.checked[0]!.bytes);
  assert.deepEqual(f.dispatches, [
    {
      ref: "main",
      inputs: {
        "verify-published": true,
        "release-version": release.version,
        "release-integrity": integrity(f.checked[0]!.bytes),
      },
    },
  ]);
  const saved = JSON.parse(readFileSync(result.receiptPath, "utf8"));
  assert.equal(saved.phase, "complete");
  assert.equal(saved.sourceRevision, revision);
  assert.equal(saved.integrity, integrity(f.published[0]!.bytes));
  assert.equal(saved.sourceRunId, 101);
  assert.equal(saved.publishedRunId, 201);
});

test("npm login and publication retain the terminal for browser authentication and 2FA", async (t) => {
  const f = fixture(t);
  f.state.signedIn = false;
  await f.execute();
  const login = f.commands.find((command) => command.args[0] === "login");
  const publish = f.commands.find((command) => command.args[0] === "publish");
  assert.ok(login);
  assert.ok(publish);
  assert.equal(login.inherit, true);
  assert.equal(publish.inherit, true);
  for (const command of [login, publish])
    assert.ok(
      command.args.includes(
        "--@scalableweb:registry=https://registry.npmjs.org",
      ),
      "Ambient npm scope configuration must not redirect authentication or publication",
    );
  assert.equal(publish.args[publish.args.indexOf("--tag") + 1], "latest");
  assert.ok(f.commands.indexOf(login) < f.commands.indexOf(publish));
});

test("a failed publish response recognizes matching registry bytes and a retry never rebuilds or republishes", async (t) => {
  const f = fixture(t);
  f.state.publishStatus = 1;
  f.state.publishedConclusion = "failure";
  await assert.rejects(f.execute());
  assert.equal(f.published.length, 1);
  assert.equal(
    f.state.registryStatus,
    200,
    "The simulated registry accepted the artifact despite the failed response",
  );
  const before = readFileSync(f.artifact);
  const partial = JSON.parse(readFileSync(f.receipt, "utf8"));
  assert.notEqual(partial.phase, "complete");
  f.state.publishedConclusion = "success";
  const result = await f.execute();
  assert.equal(result.published, true);
  assert.equal(
    f.published.length,
    1,
    "Retrying a published version must not call npm publish again",
  );
  assert.equal(
    f.commands.filter(
      (command) => command.args.join(" ") === "run companion:pack",
    ).length,
    1,
  );
  assert.deepEqual(
    readFileSync(f.artifact),
    before,
    "Retries retain the exact tested artifact",
  );
  assert.equal(
    JSON.parse(readFileSync(result.receiptPath, "utf8")).phase,
    "complete",
  );
});

test("registry collisions and unavailable registry state never authorize publishing", async (t) => {
  for (const registryState of [
    "different",
    "network",
    "forbidden",
    "offline",
  ] as const) {
    await t.test(registryState, async (t) => {
      const f = fixture(t);
      f.state.registryStatus =
        registryState === "different"
          ? 200
          : registryState === "network"
            ? 503
            : 403;
      f.state.registryIntegrity = integrity(
        Buffer.from("someone else's package"),
      );
      f.state.registryOffline = registryState === "offline";
      await assert.rejects(f.execute());
      assert.equal(f.published.length, 0);
    });
  }
});

test("an uncertain or mismatched registry result after publishing stays incomplete and cannot trigger a second publish", async (t) => {
  for (const registryResult of ["different", "unknown"] as const) {
    await t.test(registryResult, async (t) => {
      const f = fixture(t);
      f.state.publishStatus = 1;
      f.state.registryAfterPublish = registryResult;
      await assert.rejects(f.execute());
      assert.equal(f.published.length, 1);
      assert.notEqual(
        JSON.parse(readFileSync(f.receipt, "utf8")).phase,
        "complete",
      );
      await assert.rejects(f.execute());
      assert.equal(
        f.published.length,
        1,
        "Uncertainty is not permission to republish",
      );
    });
  }
});

test("successful CI for another commit cannot certify this release", async (t) => {
  for (const phase of ["source", "distribution"] as const) {
    await t.test(phase, async (t) => {
      const f = fixture(t);
      if (phase === "source") f.state.sourceRunRevision = "d".repeat(40);
      else f.state.publishedRunRevision = "d".repeat(40);
      await assert.rejects(f.execute());
      assert.equal(f.published.length, phase === "source" ? 0 : 1);
      if (existsSync(f.receipt))
        assert.notEqual(
          JSON.parse(readFileSync(f.receipt, "utf8")).phase,
          "complete",
        );
    });
  }
});

test("packaged provenance must identify the clean source that passed CI", async (t) => {
  for (const provenance of ["dirty", "wrong-revision"] as const) {
    await t.test(provenance, async (t) => {
      const f = fixture(t);
      if (provenance === "dirty") f.state.packedDirty = true;
      else f.state.packedRevision = "e".repeat(40);
      await assert.rejects(f.execute());
      assert.equal(f.published.length, 0);
      assert.equal(f.checked.length, 0);
    });
  }
});

test("artifact and source changes after verification refuse publication", async (t) => {
  for (const mutation of ["artifact", "source", "dirty"] as const) {
    await t.test(mutation, async (t) => {
      const f = fixture(t);
      let changed = false;
      f.hooks.beforeFetch = (url) => {
        if (
          changed ||
          !f.checked.length ||
          url !== `${registry}/${release.version}` ||
          !f.commands.some((command) => command.args[0] === "whoami")
        )
          return;
        changed = true;
        if (mutation === "artifact")
          writeFileSync(f.artifact, "tampered after the checker passed");
        if (mutation === "source") f.state.revision = "c".repeat(40);
        if (mutation === "dirty")
          f.state.dirty = " M scripts/build-learning-companion.ts\n";
      };
      await assert.rejects(f.execute());
      assert.equal(
        changed,
        true,
        "The mutation must occur after artifact verification, before publishing",
      );
      assert.equal(f.published.length, 0);
    });
  }
});

test("dry-run cannot login, publish or dispatch remote workflows", async (t) => {
  const f = fixture(t);
  f.state.signedIn = false;
  f.state.sourceAvailable = false;
  await f.execute(true);
  assert.equal(f.published.length, 0);
  assert.equal(f.dispatches.length, 0);
  assert.equal(
    f.commands.some((command) => command.args[0] === "login"),
    false,
  );
  if (existsSync(f.receipt))
    assert.notEqual(
      JSON.parse(readFileSync(f.receipt, "utf8")).phase,
      "complete",
    );
});

test("a published registry artifact with a failed distribution job remains incomplete", async (t) => {
  const f = fixture(t);
  f.state.publishedJobs = "failure";
  await assert.rejects(f.execute());
  assert.equal(f.published.length, 1);
  assert.equal(f.state.registryStatus, 200);
  assert.notEqual(
    JSON.parse(readFileSync(f.receipt, "utf8")).phase,
    "complete",
  );
});

test("dry-run checks an existing registry version without authorizing republication", async (t) => {
  const f = fixture(t);
  f.state.registryStatus = 200;
  f.state.registryIntegrity = integrity(
    Buffer.from("a previously published artifact"),
  );
  const result = await f.execute(true);
  assert.equal(result.published, false);
  assert.equal(f.checked.length, 1);
  assert.equal(f.published.length, 0);
  assert.equal(f.dispatches.length, 0);
  assert.equal(existsSync(f.receipt), false);
  assert.ok(
    f.logs.some((message) =>
      /cannot republish the existing version/.test(message),
    ),
  );
  await assert.rejects(f.execute(), /already exists in npm without a matching/);
  assert.equal(f.published.length, 0);
});

test("a newer failed source run cannot fall back to an older green run or silently dispatch again", async (t) => {
  const f = fixture(t);
  f.state.sourceConclusion = "failure";
  f.state.sourceOlderGreen = true;
  await assert.rejects(f.execute(), /Workflow 101 finished with failure/);
  assert.equal(f.published.length, 0);
  assert.equal(f.dispatches.length, 0);
});

test("pending source CI is awaited on the same run before publishing", async (t) => {
  const f = fixture(t);
  f.state.sourcePendingPolls = 2;
  const result = await f.execute();
  assert.equal(result.sourceRunId, 101);
  assert.ok(
    f.sleeps.length > 0,
    "Pending CI must be observed again before publishing",
  );
  assert.equal(f.published.length, 1);
  assert.equal(f.dispatches.length, 1);
  assert.equal(
    (f.dispatches[0]!.inputs as Record<string, unknown>)["verify-published"],
    true,
  );
});

test("a lost workflow dispatch response retains uncertainty and retry cannot launch another run", async (t) => {
  for (const response of ["missing", "invalid", "lost"] as const) {
    await t.test(response, async (t) => {
      const f = fixture(t);
      f.state.sourceAvailable = false;
      f.state.dispatchReply = response;
      await assert.rejects(
        f.execute(),
        response === "lost"
          ? /dispatch response lost/
          : /dispatch did not return a run ID/,
      );
      assert.equal(f.dispatches.length, 1);
      assert.notEqual(
        JSON.parse(readFileSync(f.receipt, "utf8")).phase,
        "complete",
      );
      await assert.rejects(f.execute(), /dispatch has an unknown outcome/);
      assert.equal(f.dispatches.length, 1);
      assert.equal(f.published.length, 0);
    });
  }
});

test("release argument parsing accepts documented inspection flags and rejects unknown options", () => {
  assert.deepEqual(parseReleaseArgs([]), { help: false, dryRun: false });
  assert.deepEqual(parseReleaseArgs(["--help"]), { help: true, dryRun: false });
  assert.deepEqual(parseReleaseArgs(["--dry-run"]), {
    help: false,
    dryRun: true,
  });
  assert.deepEqual(parseReleaseArgs(["0.3.1"]), {
    help: false,
    dryRun: false,
    version: "0.3.1",
  });
  assert.deepEqual(parseReleaseArgs(["--dry-run", "0.3.1"]), {
    help: false,
    dryRun: true,
    version: "0.3.1",
  });
  for (const flag of ["--yes", "--skip-ci"])
    assert.throws(() => parseReleaseArgs([flag]), /Usage:/);
  for (const args of [
    ["0.3.1", "0.3.2"],
    ["0.3.1-rc.1"],
    ["01.3.1"],
    ["publish"],
  ])
    assert.throws(() => parseReleaseArgs(args));
});

test("the global release lease rejects an active owner and recovers an abandoned owner", async (t) => {
  for (const owner of ["active", "abandoned"] as const) {
    await t.test(owner, async (t) => {
      const f = fixture(t);
      mkdirSync(path.dirname(f.receipt), { recursive: true });
      const lock = path.join(path.dirname(f.receipt), "release.lock");
      writeFileSync(
        lock,
        String(owner === "active" ? process.pid : 2_147_483_647),
      );
      if (owner === "active") {
        await assert.rejects(f.execute(), /Another release is running/);
        assert.equal(f.published.length, 0);
        assert.equal(readFileSync(lock, "utf8"), String(process.pid));
      } else {
        assert.equal((await f.execute()).published, true);
        assert.equal(existsSync(lock), false);
      }
    });
  }
});

test("a release cannot move npm latest backwards or start interactive publication in a pipe", async (t) => {
  await t.test("older version", async (t) => {
    const f = fixture(t);
    f.state.latestVersion = "0.9.8";
    await assert.rejects(f.execute(), /older than npm latest/);
    assert.equal(f.published.length, 0);
  });
  await t.test("noninteractive", async (t) => {
    const f = fixture(t);
    f.state.signedIn = false;
    await assert.rejects(f.execute(false, false), /interactive terminal/);
    assert.equal(f.published.length, 0);
    assert.equal(
      f.commands.some((command) =>
        ["whoami", "login"].includes(command.args[0]!),
      ),
      false,
    );
  });
});
