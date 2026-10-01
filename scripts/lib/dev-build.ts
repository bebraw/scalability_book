import { existsSync, renameSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

export type DevelopmentBuildPaths = {
  current: string;
  next: string;
  previous: string;
};

export function developmentBuildPaths(
  root: string,
  port: number,
  outputDirectory?: string,
): DevelopmentBuildPaths {
  const current = path.resolve(
    root,
    outputDirectory || path.join(".local", "dev-build", String(port), "site"),
  );
  return {
    current,
    next: `${current}.next`,
    previous: `${current}.previous`,
  };
}

export async function rebuildDevelopmentSite(
  paths: DevelopmentBuildPaths,
  build: (outputDirectory: string) => Promise<void>,
): Promise<void> {
  await mkdir(path.dirname(paths.current), { recursive: true });

  // Recover the last successful build if a process stopped between the swaps.
  if (!existsSync(paths.current) && existsSync(paths.previous)) {
    renameSync(paths.previous, paths.current);
  }
  await rm(paths.next, { recursive: true, force: true });
  await rm(paths.previous, { recursive: true, force: true });

  try {
    await build(paths.next);
    let movedPreviousBuild = false;
    try {
      renameSync(paths.current, paths.previous);
      movedPreviousBuild = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    // Keep the renames synchronous so request handlers cannot run between them.
    try {
      renameSync(paths.next, paths.current);
    } catch (error) {
      if (movedPreviousBuild) renameSync(paths.previous, paths.current);
      throw error;
    }
    await rm(paths.previous, { recursive: true, force: true });
  } finally {
    // A failed compiler must not leave a partial site beside the served build.
    await rm(paths.next, { recursive: true, force: true });
  }
}
