import { homedir } from "node:os";
import path from "node:path";
import {
  mkdirSync,
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  rmSync,
  rmdirSync,
  readdirSync,
  cpSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import { inspectLearningDatabase } from "./learning-database.ts";

export function learningDataDirectory(
  platform = process.platform,
  home = homedir(),
  env: Record<string, string | undefined> = process.env,
) {
  if (platform === "darwin")
    return path.join(
      home,
      "Library",
      "Application Support",
      "scalableweb-companion",
    );
  if (platform === "win32")
    return path.join(
      env.LOCALAPPDATA || path.join(home, "AppData", "Local"),
      "scalableweb-companion",
    );
  const base =
    env.XDG_DATA_HOME && path.isAbsolute(env.XDG_DATA_HOME)
      ? env.XDG_DATA_HOME
      : path.join(home, ".local", "share");
  return path.join(base, "scalableweb-companion");
}
export function ensureLearningDirectory(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const state = lstatSync(directory);
  learningAssert(
    state.isDirectory() && !state.isSymbolicLink(),
    "Use a regular private data directory.",
  );
}
export function lockLearningDirectory(directory: string) {
  ensureLearningDirectory(directory);
  const filename = path.join(directory, "companion.lock");
  const owner = randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(filename, JSON.stringify({ pid: process.pid, owner }), {
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      learningAssert(
        !lstatSync(filename).isSymbolicLink(),
        "The companion lock must be a regular file.",
      );
      let old: { pid: number };
      try {
        old = JSON.parse(readFileSync(filename, "utf8"));
      } catch {
        throw new LearningProblem(
          "The data lock is unreadable. Check that the companion is stopped before recovering companion.lock.",
        );
      }
      learningAssert(
        Number.isInteger(old.pid) && old.pid > 0,
        "The data lock is invalid. Check that the companion is stopped before recovering companion.lock.",
      );
      let alive = true;
      try {
        process.kill(old.pid, 0);
      } catch (error) {
        alive = (error as NodeJS.ErrnoException).code !== "ESRCH";
      }
      learningAssert(
        !alive,
        "Another companion is using this directory. Stop it before starting, migrating or restoring.",
        409,
      );
      rmSync(filename);
      continue;
    }
    return () => {
      if (
        existsSync(filename) &&
        JSON.parse(readFileSync(filename, "utf8")).owner === owner
      )
        rmSync(filename);
    };
  }
  throw new LearningProblem(
    "Could not acquire the private data lock. Try again after stopping the companion.",
  );
}
function regularTree(directory: string) {
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name),
      state = lstatSync(file);
    learningAssert(
      !state.isSymbolicLink() && (state.isFile() || state.isDirectory()),
      "Migration requires regular local files and directories.",
    );
    if (state.isDirectory()) regularTree(file);
  }
}
function privateTree(directory: string) {
  chmodSync(directory, 0o700);
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (lstatSync(file).isDirectory()) privateTree(file);
    else chmodSync(file, 0o600);
  }
}
export function migrateLearningDirectory(
  source: string,
  destination: string,
  stopped: boolean,
) {
  learningAssert(
    stopped,
    "Stop the old companion and Codex process, then repeat migration with --confirm-stopped. The source will be retained.",
  );
  source = path.resolve(source);
  destination = path.resolve(destination);
  learningAssert(
    source !== destination &&
      !destination.startsWith(source + path.sep) &&
      !source.startsWith(destination + path.sep),
    "Choose separate source and destination directories.",
  );
  learningAssert(
    existsSync(path.join(source, "notebook.sqlite")),
    "The source does not contain a notebook.sqlite database.",
  );
  learningAssert(
    !existsSync(destination) || readdirSync(destination).length === 0,
    "The destination is not empty. Choose another directory or use portable import; existing work was not replaced.",
  );
  const release = lockLearningDirectory(source);
  const stage = `${destination}.migration-${randomUUID()}`;
  try {
    regularTree(source);
    inspectLearningDatabase(path.join(source, "notebook.sqlite"), "notebook");
    if (existsSync(path.join(source, "conversations.sqlite")))
      inspectLearningDatabase(
        path.join(source, "conversations.sqlite"),
        "conversations",
      );
    if (existsSync(path.join(source, "local-provider.sqlite")))
      inspectLearningDatabase(
        path.join(source, "local-provider.sqlite"),
        "local-provider",
      );
    mkdirSync(path.dirname(destination), { recursive: true });
    ensureLearningDirectory(stage);
    for (const name of readdirSync(source)) {
      if (name === "companion.lock" || name === "companion-settings.json")
        continue;
      cpSync(path.join(source, name), path.join(stage, name), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    }
    privateTree(stage);
    // An empty destination may have been created by setup; check again at publication.
    if (existsSync(destination)) {
      learningAssert(
        readdirSync(destination).length === 0,
        "The destination changed during migration. Existing work was retained.",
      );
      rmdirSync(destination);
    }
    renameSync(stage, destination);
    return {
      source,
      destination,
      providerContinuity: existsSync(
        path.join(destination, "local-provider.sqlite"),
      )
        ? "Local transcripts copied; configure the same endpoint/model/tool mode to resume. Retain any Codex profile for its conversations."
        : existsSync(path.join(destination, "codex"))
          ? "Profile copied; verify sign-in and thread resume."
          : "No provider profile copied; use --codex-home for the retained profile or sign in again.",
    };
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true });
    release();
  }
}
