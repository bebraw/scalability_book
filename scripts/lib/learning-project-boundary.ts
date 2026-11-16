import { lstatSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { LearningProblem } from "../../shared/learning-workspace.ts";

/**
 * Match Codex 0.154.0's default .git project-root discovery and project-layer range.
 * A .git directory requires an accessible HEAD; other .git entries are markers.
 * Without a marker Codex considers only cwd, not all ancestors or HOME.
 * https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/config/src/loader/mod.rs#L1548
 * https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/config/src/loader/mod.rs#L1696
 * This preserves ancestor AGENTS.md discovery rather than disabling project roots.
 */
export function assertProjectConfigurationBoundary(workspace: string): void {
  let canonical: string;
  try {
    canonical = realpathSync(workspace);
    if (!statSync(canonical).isDirectory()) throw new Error("Not a directory");
  } catch {
    throw new LearningProblem(
      "Choose an accessible project directory before checking its Codex configuration.",
    );
  }
  const ancestors: string[] = [];
  let current = canonical;
  let foundRoot = false;
  while (true) {
    ancestors.push(current);
    try {
      const marker = path.join(current, ".git");
      const state = statSync(marker);
      if (state.isDirectory()) statSync(path.join(marker, "HEAD"));
      foundRoot = true;
      break;
    } catch {
      // Codex skips an inaccessible marker, including a .git directory without HEAD.
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (const directory of foundRoot ? ancestors : [canonical]) {
    const folder = path.join(directory, ".codex");
    try {
      if (!statSync(folder).isDirectory()) continue;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") continue;
      throw new LearningProblem(
        "The project's Codex configuration could not be inspected. Check directory access before launching the course profile.",
      );
    }
    const file = path.join(folder, "config.toml");
    try {
      // lstat also detects a dangling config symlink, which must not escape this check.
      lstatSync(file);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      throw new LearningProblem(
        "The project's Codex configuration could not be inspected. Check directory access before launching the course profile.",
      );
    }
    throw new LearningProblem(
      `Project-local Codex configuration at ${JSON.stringify(file)} could override the tested course settings. It was left unchanged. Review it and use a manual harness setup for this project, or deliberately move that configuration aside before using the managed launcher.`,
    );
  }
}
