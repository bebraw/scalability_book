import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  acquireLearningReleaseLock,
  assertLearningReleaseRuntime,
  executeReleaseCommand,
  type ReleaseCommand,
  type ReleaseCommandResult,
} from "./learning-release.ts";

const ownedPaths = [
  "packages/learning-companion/package.json",
  "shared/learning-connection.ts",
  "packages/learning-companion/README.md",
];
export interface LearningReleasePreparationOptions {
  root: string;
  release: { name: string; version: string };
  target: string;
  dryRun?: boolean;
  run?: (command: ReleaseCommand) => Promise<ReleaseCommandResult>;
  fetch?: typeof globalThis.fetch;
  log?: (message: string) => void;
  platform?: NodeJS.Platform;
  nodeVersion?: string;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function versionParts(value: string): number[] {
  assert(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value),
    `Choose an explicit stable major.minor.patch version: ${value}.`,
  );
  const parts = value.split(".").map(Number);
  assert(parts.every(Number.isSafeInteger), "Release version is too large.");
  return parts;
}

/** An explicit target authorizes only these version edits, their commit, and a normal push. */
export async function prepareLearningCompanionRelease(
  options: LearningReleasePreparationOptions,
) {
  const root = path.resolve(options.root),
    { name, version } = options.release,
    target = options.target,
    run = options.run ?? executeReleaseCommand,
    fetcher = options.fetch ?? globalThis.fetch,
    log = options.log ?? console.log;
  assertLearningReleaseRuntime(options.platform, options.nodeVersion);
  assert(
    name === "@scalableweb/companion",
    "Unexpected Companion package name.",
  );
  const current = versionParts(version),
    next = versionParts(target);
  const differing = next.findIndex((part, index) => part !== current[index]);
  assert(
    differing < 0 || next[differing]! > current[differing]!,
    `Target ${target} is lower than the current version ${version}.`,
  );
  const changed = target !== version;
  const git = async (args: string[], inherit = false) => {
    const result = await run({
      file: "git",
      args,
      cwd: root,
      timeoutMs: inherit ? 5 * 60_000 : 30_000,
      inherit,
    });
    assert(
      result.status === 0,
      `git ${args[0]} failed. Any prepared changes or commit were retained for review; fix the failure and rerun the same target.`,
    );
    return result.stdout;
  };
  const canonicalOrigin = async () => {
    const origin = (await git(["remote", "get-url", "origin"])).trim();
    const canonical =
      /^(?:git@github\.com:|https:\/\/github\.com\/)bebraw\/scalability_book(?:\.git)?\/?$/;
    assert(
      canonical.test(origin),
      "Release preparation requires the canonical bebraw/scalability_book origin on GitHub (SSH or HTTPS).",
    );
    const pushes = (
      await git(["remote", "get-url", "--push", "--all", "origin"])
    )
      .trim()
      .split("\n");
    assert(
      pushes.length === 1 && canonical.test(pushes[0]!),
      "Origin must have exactly one canonical bebraw/scalability_book push URL.",
    );
  };
  const cleanMain = async () => {
    assert(
      (await git(["symbolic-ref", "--short", "HEAD"])).trim() === "main",
      "Prepare a release from a non-detached main branch.",
    );
    assert(
      !(
        await git(["status", "--porcelain", "--untracked-files=normal"])
      ).trim(),
      "Commit all source changes before preparing a release.",
    );
    await canonicalOrigin();
  };
  for (const file of ["git", "gh", "npm"]) {
    const result = await run({
      file,
      args: ["--version"],
      cwd: root,
      timeoutMs: 30_000,
    });
    assert(
      result.status === 0,
      `Release preparation requires Git, GitHub CLI and npm; ${file} --version failed.`,
    );
  }
  const unlock = acquireLearningReleaseLock(
    path.join(root, ".local/companion-release"),
  );
  try {
    await cleanMain();
    const originalRevision = (await git(["rev-parse", "HEAD"])).trim();
    const original = ownedPaths.map((file) =>
      readFileSync(path.join(root, file), "utf8"),
    );
    const manifest = JSON.parse(original[0]!);
    assert(
      manifest.name === name && manifest.version === version,
      "Package manifest and shared release metadata disagree.",
    );
    const releaseBlock =
      /export const companionRelease\s*=\s*\{[\s\S]*?\}\s*(?:as const)?;/g;
    const blocks = [...original[1]!.matchAll(releaseBlock)];
    assert(
      blocks.length === 1,
      "Cannot identify the single shared Companion release object.",
    );
    const block = blocks[0]![0];
    const versionFields = [
      ...block.matchAll(/\bversion\s*:\s*(["'])([^"']+)\1/g),
    ];
    assert(
      versionFields.length === 1 &&
        versionFields[0]![2] === version &&
        /\bname\s*:\s*["']@scalableweb\/companion["']/.test(block),
      "Shared Companion release metadata does not match the current version.",
    );
    if (changed) {
      const response = await fetcher(
        `https://registry.npmjs.org/@scalableweb%2fcompanion/${encodeURIComponent(target)}`,
        {
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
          cache: "no-store",
        },
      );
      assert(
        response.status === 404,
        response.ok
          ? `Version ${target} already exists in npm; choose a new explicit version.`
          : `Registry state is unknown (HTTP ${response.status}); no version changes were made.`,
      );
      const latestResponse = await fetcher(
        "https://registry.npmjs.org/@scalableweb%2fcompanion/latest",
        {
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
          cache: "no-store",
        },
      );
      if (latestResponse.status !== 404) {
        assert(
          latestResponse.ok,
          `Registry latest is unknown (HTTP ${latestResponse.status}); no version changes were made.`,
        );
        const latest = (await latestResponse.json()) as {
          name?: unknown;
          version?: unknown;
        };
        assert(
          latest.name === name && typeof latest.version === "string",
          "Registry latest metadata is invalid; no version changes were made.",
        );
        const latestParts = versionParts(latest.version);
        const difference = next.findIndex(
          (part, index) => part !== latestParts[index],
        );
        assert(
          difference < 0 || next[difference]! > latestParts[difference]!,
          `Target ${target} is older than npm latest ${latest.version}; no version changes were made.`,
        );
      }
    }
    const pin = new RegExp(
      `@scalableweb/companion@${version.replaceAll(".", "\\.")}(?![0-9A-Za-z.+-])`,
      "g",
    );
    assert(
      pin.test(original[2]!),
      "The package README has no matching current-version installation pins.",
    );
    pin.lastIndex = 0;
    const replacementBlock = block.replace(
      /(\bversion\s*:\s*)(["'])([^"']+)\2/,
      (_match, prefix: string, quote: string) =>
        `${prefix}${quote}${target}${quote}`,
    );
    const replacements = [
      JSON.stringify({ ...manifest, version: target }, null, 2) + "\n",
      original[1]!.replace(block, replacementBlock),
      original[2]!.replace(pin, `@scalableweb/companion@${target}`),
    ];
    if (options.dryRun) {
      log(
        changed
          ? `Would prepare ${name}@${target} by editing only:\n${ownedPaths.join("\n")}\nThen commit "Prepare Companion ${target}", push origin main, and release that version. No source changes, commit, push, publication or next-version CI were performed.`
          : `${name}@${target} is already prepared. A real run would push origin main and resume its release. No source changes, push or publication were performed.`,
      );
      return {
        release: { name, version: target },
        prepared: false,
        dryRun: true,
      };
    }
    await cleanMain();
    assert(
      (await git(["rev-parse", "HEAD"])).trim() === originalRevision,
      "The source commit changed while preparing the release; no version edits were made.",
    );
    assert(
      ownedPaths.every(
        (file, index) =>
          readFileSync(path.join(root, file), "utf8") === original[index],
      ),
      "A release file changed during preparation; no version edits were made.",
    );
    if (changed) {
      ownedPaths.forEach((file, index) =>
        writeFileSync(path.join(root, file), replacements[index]!),
      );
      const unchangedEdits = () =>
        assert(
          ownedPaths.every(
            (file, index) =>
              readFileSync(path.join(root, file), "utf8") ===
              replacements[index],
          ),
          "A prepared file changed concurrently. Review the retained changes before committing.",
        );
      const onlyOwnedChanges = async () => {
        const status = await git([
          "status",
          "--porcelain",
          "--untracked-files=normal",
        ]);
        assert(
          status
            .split("\n")
            .filter(Boolean)
            .every((line) => ownedPaths.includes(line.slice(3))),
          "Unrelated source changes appeared during preparation. Review the retained changes; nothing unrelated will be committed.",
        );
      };
      unchangedEdits();
      await onlyOwnedChanges();
      assert(
        (await git(["rev-parse", "HEAD"])).trim() === originalRevision,
        "The source commit changed during preparation. Review the retained version edits.",
      );
      unchangedEdits();
      await git(["add", "--", ...ownedPaths]);
      const staged = (await git(["diff", "--cached", "--name-only", "--"]))
        .trim()
        .split("\n")
        .filter(Boolean)
        .sort();
      assert(
        JSON.stringify(staged) === JSON.stringify([...ownedPaths].sort()),
        "The staged files differ from the three version files. Review the retained changes before committing.",
      );
      await onlyOwnedChanges();
      unchangedEdits();
      await git(
        ["commit", "-m", `Prepare Companion ${target}`, "--", ...ownedPaths],
        true,
      );
      log(`Prepared ${name}@${target}.`);
    }
    const preparedRevision = (await git(["rev-parse", "HEAD"])).trim();
    if (changed) {
      assert(
        preparedRevision !== originalRevision &&
          (await git(["rev-parse", "HEAD^"])).trim() === originalRevision,
        "The prepared commit has an unexpected history. Review it before pushing.",
      );
      const committed = (
        await git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
      )
        .trim()
        .split("\n")
        .filter(Boolean)
        .sort();
      assert(
        JSON.stringify(committed) === JSON.stringify([...ownedPaths].sort()),
        "The prepared commit contains unexpected files. Review it before pushing.",
      );
    } else
      assert(
        preparedRevision === originalRevision,
        "The source commit changed before the release push.",
      );
    await cleanMain();
    assert(
      (await git(["rev-parse", "HEAD"])).trim() === preparedRevision &&
        ownedPaths.every(
          (file, index) =>
            readFileSync(path.join(root, file), "utf8") ===
            (changed ? replacements[index] : original[index]),
        ),
      "Prepared source changed after the commit. Review the retained commit and files before pushing.",
    );
    await git(["push", "origin", "main"], true);
    return {
      release: { name, version: target },
      prepared: changed,
      dryRun: false,
    };
  } finally {
    unlock();
  }
}
