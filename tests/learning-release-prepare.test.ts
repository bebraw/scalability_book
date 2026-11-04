import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareLearningCompanionRelease } from "../scripts/lib/learning-release-prepare.ts";
import type {
  ReleaseCommand,
  ReleaseCommandResult,
} from "../scripts/lib/learning-release.ts";

const name = "@scalableweb/companion";
const currentVersion = "0.3.0";
const nextVersion = "0.3.1";
const sourceFiles = [
  "packages/learning-companion/package.json",
  "shared/learning-connection.ts",
  "packages/learning-companion/README.md",
];
const unchangedFiles = ["package-lock.json", "docs/student-guide.md"];
const initialManifest = {
  name,
  version: currentVersion,
  description: "Keep this package field",
  dependencies: { "@napi-rs/keyring": "2.1.2" },
};
const initialShared = `// Keep schema and unrelated versions unchanged.
export const companionRelease = {
  name: "@scalableweb/companion",
  version: "0.3.0",
  protocol: 2,
  notebookSchema: 1,
} as const;
export const otherVersion = "0.3.0";
`;
const initialReadme = `# Companion

npx --yes @scalableweb/companion@0.3.0 setup
npx --yes @scalableweb/companion@0.3.0 start

## Version 0.3.0

Historical explanation of protocol 2. Prior release 0.2.0 used pairing.
Unrelated package: example-package@0.3.0.
`;

function fixture(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), "companion-prepare-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const content = new Map([
    [sourceFiles[0]!, JSON.stringify(initialManifest, null, 2) + "\n"],
    [sourceFiles[1]!, initialShared],
    [sourceFiles[2]!, initialReadme],
    [unchangedFiles[0]!, '{"version":"0.3.0","mustRemain":true}\n'],
    [unchangedFiles[1]!, "Student announcements stay separately reviewed.\n"],
  ]);
  for (const [file, bytes] of content) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), bytes);
  }
  const snapshot = () =>
    Object.fromEntries(
      [...content.keys()].map((file) => [
        file,
        readFileSync(path.join(root, file), "utf8"),
      ]),
    );
  const initial = snapshot();
  let committed = initial;
  let staged: string[] = [];
  const commands: ReleaseCommand[] = [];
  const requests: string[] = [];
  const state = {
    currentVersion,
    branch: "main",
    dirty: "",
    origin: "git@github.com:bebraw/scalability_book.git",
    pushOrigin: "git@github.com:bebraw/scalability_book.git",
    registryStatus: 404,
    latestVersion: currentVersion,
    offline: false,
    unavailableTool: "",
    failedPushes: 0,
    revision: "a".repeat(40),
    parent: "a".repeat(40),
    committedPaths: [...sourceFiles],
    commitHook: "none" as "none" | "bytes" | "files" | "parent",
  };
  const success = (stdout = ""): ReleaseCommandResult => ({
    status: 0,
    stdout,
    stderr: "",
  });
  const run = async (
    command: ReleaseCommand,
  ): Promise<ReleaseCommandResult> => {
    commands.push(command);
    assert.equal(command.cwd, root);
    const args = command.args;
    if (
      args.join(" ") === "--version" &&
      ["git", "gh", "npm"].includes(command.file)
    )
      return command.file === state.unavailableTool
        ? { status: 1, stdout: "", stderr: "Synthetic unavailable tool" }
        : success("Synthetic tool version");
    assert.equal(
      command.file,
      "git",
      "Preparation must not invoke npm publication or workflow dispatch",
    );
    if (args.join(" ") === "symbolic-ref --short HEAD")
      return success(state.branch);
    if (args.join(" ") === "status --porcelain --untracked-files=normal")
      return success(
        state.dirty ||
          sourceFiles
            .filter((file) => snapshot()[file] !== committed[file])
            .map((file) => ` M ${file}`)
            .join("\n"),
      );
    if (args.join(" ") === "rev-parse HEAD") return success(state.revision);
    if (args.join(" ") === "rev-parse HEAD^") return success(state.parent);
    if (args.join(" ") === "diff-tree --no-commit-id --name-only -r HEAD")
      return success(state.committedPaths.join("\n"));
    if (args.join(" ") === "remote get-url origin")
      return success(state.origin);
    if (args.join(" ") === "remote get-url --push --all origin")
      return success(state.pushOrigin);
    if (args[0] === "add") {
      staged = args.slice(args.indexOf("--") + 1);
      return success();
    }
    if (args.join(" ") === "diff --cached --name-only --")
      return success(staged.join("\n"));
    if (args[0] === "commit") {
      if (state.commitHook === "bytes") {
        const readme = path.join(root, sourceFiles[2]!);
        writeFileSync(
          readme,
          readFileSync(readme, "utf8") +
            "\nSynthetic hook changed these committed bytes.\n",
        );
      }
      if (state.commitHook === "files") {
        state.committedPaths.push(unchangedFiles[1]!);
        writeFileSync(
          path.join(root, unchangedFiles[1]!),
          "Synthetic hook committed an unrelated file.\n",
        );
      }
      state.currentVersion = JSON.parse(
        readFileSync(path.join(root, sourceFiles[0]!), "utf8"),
      ).version;
      committed = snapshot();
      state.parent =
        state.commitHook === "parent" ? "c".repeat(40) : state.revision;
      state.revision = "b".repeat(40);
      return success();
    }
    if (args[0] === "push") {
      assert.deepEqual(
        args,
        ["push", "origin", "main"],
        "Version preparation may never force-push or select another destination",
      );
      if (state.failedPushes > 0) {
        state.failedPushes--;
        return { status: 1, stdout: "", stderr: "Synthetic push rejected" };
      }
      return success();
    }
    throw new Error(`Unexpected preparation command: ${args.join(" ")}`);
  };
  const fetcher: typeof fetch = async (input, options) => {
    const url = String(input);
    requests.push(url);
    assert.match(
      url,
      /^https:\/\/registry\.npmjs\.org\/@scalableweb%2fcompanion\/(?:\d+\.\d+\.\d+|latest)$/,
    );
    assert.equal(options?.method ?? "GET", "GET");
    if (state.offline) throw new Error("Synthetic registry unavailable");
    if (url.endsWith("/latest"))
      return Response.json({ name, version: state.latestVersion });
    return state.registryStatus === 200
      ? Response.json({
          name,
          version: url.split("/").at(-1),
          dist: {
            integrity: "sha512-synthetic",
            tarball: "https://registry.npmjs.org/synthetic.tgz",
          },
        })
      : new Response("Synthetic registry response", {
          status: state.registryStatus,
        });
  };
  const execute = (target = nextVersion, dryRun = false) =>
    prepareLearningCompanionRelease({
      root,
      release: { name, version: state.currentVersion },
      target,
      dryRun,
      run,
      fetch: fetcher,
      log: () => {},
      platform: "linux",
      nodeVersion: "24.0.0",
    });
  const mutations = () =>
    commands.filter((command) =>
      ["add", "commit", "push"].includes(command.args[0]!),
    );
  return {
    root,
    state,
    commands,
    requests,
    initial,
    snapshot,
    execute,
    mutations,
  };
}

test("unsafe or unavailable version preparation leaves all files and Git state unchanged", async (t) => {
  for (const gate of [
    "dirty",
    "lower",
    "existing",
    "unknown",
    "offline",
    "wrong-origin",
    "redirect-push",
    "multiple-push",
  ] as const) {
    await t.test(gate, async (t) => {
      const f = fixture(t);
      if (gate === "dirty") f.state.dirty = " M docs/student-guide.md\n";
      if (gate === "existing") f.state.registryStatus = 200;
      if (gate === "unknown") f.state.registryStatus = 503;
      if (gate === "offline") f.state.offline = true;
      if (gate === "wrong-origin")
        f.state.origin = "git@github.com:someone/other-project.git";
      if (gate === "redirect-push")
        f.state.pushOrigin = "git@github.com:someone/other-project.git";
      if (gate === "multiple-push")
        f.state.pushOrigin += "\ngit@github.com:someone/other-project.git";
      const expectedCause = {
        dirty: /Commit all source changes/,
        lower: /lower than the current version/,
        existing: /already exists in npm/,
        unknown: /Registry state is unknown/,
        offline: /Synthetic registry unavailable/,
        "wrong-origin": /requires the canonical.*origin/,
        "redirect-push": /exactly one canonical.*push URL/,
        "multiple-push": /exactly one canonical.*push URL/,
      };
      await assert.rejects(
        f.execute(gate === "lower" ? "0.2.9" : nextVersion),
        expectedCause[gate],
      );
      assert.deepEqual(f.snapshot(), f.initial);
      assert.deepEqual(
        f.mutations(),
        [],
        "A refusal cannot stage, commit or push anything",
      );
    });
  }
});

test("an explicit newer version changes only release metadata and scoped README pins, then commits and pushes those files", async (t) => {
  const f = fixture(t);
  const result = await f.execute();
  assert.deepEqual(result.release, { name, version: nextVersion });
  assert.equal(result.prepared, true);
  assert.equal(result.dryRun, false);
  const files = f.snapshot();
  assert.deepEqual(JSON.parse(files[sourceFiles[0]!]!), {
    ...initialManifest,
    version: nextVersion,
  });
  assert.equal(
    files[sourceFiles[1]!],
    initialShared.replace('version: "0.3.0"', 'version: "0.3.1"'),
  );
  assert.equal(
    files[sourceFiles[2]!],
    initialReadme.replaceAll(
      `${name}@${currentVersion}`,
      `${name}@${nextVersion}`,
    ),
  );
  for (const file of unchangedFiles) assert.equal(files[file], f.initial[file]);
  const mutations = f.mutations();
  assert.deepEqual(
    mutations.map((command) => command.args[0]),
    ["add", "commit", "push"],
  );
  for (const operation of mutations.slice(0, 2)) {
    const separator = operation.args.indexOf("--");
    assert.ok(
      separator > 0,
      "Git writes must be restricted to literal release paths",
    );
    assert.deepEqual(
      operation.args.slice(separator + 1).sort(),
      [...sourceFiles].sort(),
    );
  }
  const commit = mutations[1]!;
  assert.equal(
    commit.args[commit.args.indexOf("-m") + 1],
    `Prepare Companion ${nextVersion}`,
  );
});

test("retrying the same prepared version after a rejected push reuses its commit and only retries the push", async (t) => {
  const f = fixture(t);
  f.state.failedPushes = 1;
  await assert.rejects(f.execute(), /push/i);
  const preparedFiles = f.snapshot();
  assert.equal(f.state.currentVersion, nextVersion);
  const requestsAfterPreparation = f.requests.length;
  const result = await f.execute();
  assert.deepEqual(result.release, { name, version: nextVersion });
  assert.deepEqual(f.snapshot(), preparedFiles);
  assert.equal(
    f.commands.filter((command) => command.args[0] === "commit").length,
    1,
  );
  assert.equal(
    f.commands.filter((command) => command.args[0] === "add").length,
    1,
  );
  assert.equal(
    f.commands.filter((command) => command.args[0] === "push").length,
    2,
  );
  assert.equal(
    f.requests.length,
    requestsAfterPreparation,
    "An already prepared version may resume its existing release even after registry publication",
  );
});

test("an explicit version dry-run checks the plan without editing, committing, pushing or publishing", async (t) => {
  const f = fixture(t);
  const result = await f.execute(nextVersion, true);
  assert.equal(result.dryRun, true);
  assert.deepEqual(f.snapshot(), f.initial);
  assert.deepEqual(f.mutations(), []);
  assert.deepEqual(f.requests, [
    `https://registry.npmjs.org/@scalableweb%2fcompanion/${nextVersion}`,
    "https://registry.npmjs.org/@scalableweb%2fcompanion/latest",
  ]);
});

test("a target behind npm latest is refused before editing or committing", async (t) => {
  const f = fixture(t);
  f.state.latestVersion = "0.4.0";
  await assert.rejects(f.execute(), /older than npm latest 0\.4\.0/);
  assert.deepEqual(f.snapshot(), f.initial);
  assert.deepEqual(f.mutations(), []);
});

test("missing release tools fail before any source or Git mutation", async (t) => {
  for (const tool of ["git", "gh", "npm"]) {
    await t.test(tool, async (t) => {
      const f = fixture(t);
      f.state.unavailableTool = tool;
      await assert.rejects(f.execute(), new RegExp(`${tool} --version failed`));
      assert.deepEqual(f.snapshot(), f.initial);
      assert.deepEqual(f.mutations(), []);
      assert.deepEqual(f.requests, []);
    });
  }
});

test("commit hooks cannot change the prepared bytes, file scope or history and still authorize a push", async (t) => {
  for (const hook of ["bytes", "files", "parent"] as const) {
    await t.test(hook, async (t) => {
      const f = fixture(t);
      f.state.commitHook = hook;
      const cause = {
        bytes: /Prepared source changed after the commit/,
        files: /prepared commit contains unexpected files/,
        parent: /prepared commit has an unexpected history/,
      };
      await assert.rejects(f.execute(), cause[hook]);
      assert.equal(
        f.commands.filter((command) => command.args[0] === "commit").length,
        1,
      );
      assert.equal(
        f.commands.some((command) => command.args[0] === "push"),
        false,
      );
    });
  }
});
