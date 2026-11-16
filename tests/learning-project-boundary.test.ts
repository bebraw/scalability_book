import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertProjectConfigurationBoundary } from "../scripts/lib/learning-project-boundary.ts";

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(path.join(tmpdir(), "project-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function gitRoot(root: string) {
  await mkdir(path.join(root, ".git"), { recursive: true });
  await writeFile(path.join(root, ".git/HEAD"), "ref: refs/heads/main\n");
}
async function config(root: string) {
  const file = path.join(root, ".codex/config.toml");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, 'model = "unapproved/model"\n');
  return file;
}

test("nested projects reject configuration anywhere from workspace to nearest valid git root", async (t) => {
  for (const location of ["", "projects", "projects/challenge"]) {
    const root = await fixture(t);
    await gitRoot(root);
    const workspace = path.join(root, "projects/challenge");
    await mkdir(workspace, { recursive: true });
    const file = await config(path.join(root, location));
    assert.throws(
      () => assertProjectConfigurationBoundary(workspace),
      /Project-local Codex configuration.*left unchanged/,
    );
    assert.equal(await readFile(file, "utf8"), 'model = "unapproved/model"\n');
  }
});

test("nearest nested git root stops discovery before an outer repository configuration", async (t) => {
  const root = await fixture(t);
  await gitRoot(root);
  await config(root);
  const nested = path.join(root, "nested");
  await gitRoot(nested);
  const workspace = path.join(nested, "project");
  await mkdir(workspace);
  assert.doesNotThrow(() => assertProjectConfigurationBoundary(workspace));
});

test("a git worktree marker file defines the root without parsing its target", async (t) => {
  const root = await fixture(t);
  await writeFile(
    path.join(root, ".git"),
    "gitdir: ../checkout/.git/worktrees/example\n",
  );
  await config(root);
  const workspace = path.join(root, "project");
  await mkdir(workspace);
  assert.throws(
    () => assertProjectConfigurationBoundary(workspace),
    /Project-local Codex configuration/,
  );
});

test("invalid .git directory without HEAD does not hide configuration at a valid ancestor", async (t) => {
  const root = await fixture(t);
  await gitRoot(root);
  await config(root);
  const nested = path.join(root, "nested");
  await mkdir(path.join(nested, ".git"), { recursive: true });
  assert.throws(
    () => assertProjectConfigurationBoundary(nested),
    /Project-local Codex configuration/,
  );
});

test("without a git root only workspace configuration is considered, not a home-like ancestor", async (t) => {
  const home = await fixture(t);
  await config(home);
  await mkdir(path.join(home, ".git")); // An uninitialized .git is not a root.
  const workspace = path.join(home, "Documents/project");
  await mkdir(workspace, { recursive: true });
  assert.doesNotThrow(() => assertProjectConfigurationBoundary(workspace));
  await config(workspace);
  assert.throws(
    () => assertProjectConfigurationBoundary(workspace),
    /Project-local Codex configuration/,
  );
});

test("a home-like directory that is itself the git root is a real project layer", async (t) => {
  const home = await fixture(t);
  await gitRoot(home);
  await config(home);
  const workspace = path.join(home, "project");
  await mkdir(workspace);
  assert.throws(
    () => assertProjectConfigurationBoundary(workspace),
    /Project-local Codex configuration/,
  );
});

test(
  "dangling configuration symlinks and redirected .codex folders are rejected",
  { skip: process.platform === "win32" },
  async (t) => {
    const root = await fixture(t);
    const first = path.join(root, "first");
    await mkdir(path.join(first, ".codex"), { recursive: true });
    await symlink(
      path.join(root, "missing-config"),
      path.join(first, ".codex/config.toml"),
    );
    assert.throws(
      () => assertProjectConfigurationBoundary(first),
      /Project-local Codex configuration/,
    );
    const second = path.join(root, "second");
    const target = path.join(root, "external");
    await mkdir(second);
    await config(target);
    await symlink(path.join(target, ".codex"), path.join(second, ".codex"));
    assert.throws(
      () => assertProjectConfigurationBoundary(second),
      /Project-local Codex configuration/,
    );
  },
);

test(
  "canonical workspace lookup catches config when project was selected through a symlink",
  { skip: process.platform === "win32" },
  async (t) => {
    const root = await fixture(t);
    const actual = path.join(root, "actual");
    await config(actual);
    const alias = path.join(root, "alias");
    await symlink(actual, alias);
    assert.throws(
      () => assertProjectConfigurationBoundary(alias),
      /Project-local Codex configuration/,
    );
  },
);

test("ordinary project instructions and a non-directory .codex entry remain usable", async (t) => {
  const root = await fixture(t);
  await gitRoot(root);
  await writeFile(
    path.join(root, "AGENTS.md"),
    "Retain these project instructions.\n",
  );
  await writeFile(
    path.join(root, ".codex"),
    "Not a configuration directory.\n",
  );
  assert.doesNotThrow(() => assertProjectConfigurationBoundary(root));
  assert.equal(
    await readFile(path.join(root, "AGENTS.md"), "utf8"),
    "Retain these project instructions.\n",
  );
});
