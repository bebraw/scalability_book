import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

export type GitFileDates = {
  createdAt: string;
  updatedAt: string;
};

const execFileAsync = promisify(execFile);
const dateCache = new Map<string, Promise<GitFileDates | null>>();
const historyCache = new Map<string, Promise<void>>();

export function getGitFileDates(
  repositoryRoot: string,
  file: string,
): Promise<GitFileDates | null> {
  const cacheKey = `${path.resolve(repositoryRoot)}\0${file}`;
  const cached = dateCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const dates = ensureCompleteGitHistory(repositoryRoot).then(() =>
    readGitFileDates(repositoryRoot, file),
  );
  dateCache.set(cacheKey, dates);

  return dates;
}

function ensureCompleteGitHistory(repositoryRoot: string): Promise<void> {
  const root = path.resolve(repositoryRoot);
  const cached = historyCache.get(root);
  if (cached) return cached;

  const history = fetchMissingHistory(root);
  historyCache.set(root, history);
  return history;
}

async function fetchMissingHistory(repositoryRoot: string): Promise<void> {
  let shallow: boolean;
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--is-shallow-repository"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    shallow = stdout.trim() === "true";
  } catch {
    // A source archive has no Git history. The existing renderer omits dates.
    return;
  }

  if (!shallow) return;

  try {
    await execFileAsync("git", ["fetch", "--unshallow"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 120_000,
    });
  } catch (error) {
    throw new Error(
      "Cannot build chapter dates from a shallow Git checkout. Fetch the full repository history before building.",
      { cause: error },
    );
  }
}

export function parseGitFileDates(history: string): GitFileDates | null {
  const commits = history
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}T/.test(line));

  const updatedAt = commits[0];
  const createdAt = commits.at(-1);

  if (!createdAt || !updatedAt) {
    return null;
  }

  return { createdAt, updatedAt };
}

async function readGitFileDates(
  repositoryRoot: string,
  file: string,
): Promise<GitFileDates | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--follow", "--format=%aI", "--", file],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    return parseGitFileDates(stdout);
  } catch {
    return null;
  }
}
