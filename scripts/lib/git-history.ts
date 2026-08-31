import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

export type GitFileDates = {
  createdAt: string;
  updatedAt: string;
};

const execFileAsync = promisify(execFile);
const dateCache = new Map<string, Promise<GitFileDates | null>>();

export function getGitFileDates(
  repositoryRoot: string,
  file: string,
): Promise<GitFileDates | null> {
  const cacheKey = `${path.resolve(repositoryRoot)}\0${file}`;
  const cached = dateCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const dates = readGitFileDates(repositoryRoot, file);
  dateCache.set(cacheKey, dates);

  return dates;
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
