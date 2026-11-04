import path from "node:path";
import { companionRelease } from "../shared/learning-connection.ts";
import {
  parseReleaseArgs,
  runLearningCompanionRelease,
} from "./lib/learning-release.ts";
import { prepareLearningCompanionRelease } from "./lib/learning-release-prepare.ts";

try {
  const options = parseReleaseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`Usage: npm run companion:release -- [VERSION] [--dry-run | --help]

Release the current prepared stable version from clean, pushed main.
An explicit newer VERSION updates the three release version files, commits
them and pushes main before releasing. Repeat the same version to resume.
Builds and checks the exact tarball, verifies the platform matrix, publishes
through npm's interactive authentication, and verifies registry bytes and CI.
Retries retain the tested artifact and reconcile any previous npm upload.

--dry-run  Build and check locally without login, dispatch or publication.
           With VERSION, only inspect and describe the preparation plan.
Website announcements remain reviewed source changes.`);
  } else {
    const root = path.resolve(import.meta.dirname, "..");
    const prepared = options.version
      ? await prepareLearningCompanionRelease({
          root,
          release: companionRelease,
          target: options.version,
          dryRun: options.dryRun,
        })
      : undefined;
    if (!prepared?.dryRun) {
      await runLearningCompanionRelease({
        root,
        release: prepared?.release ?? companionRelease,
        dryRun: options.dryRun,
      });
    }
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Companion release failed.",
  );
  process.exitCode = 1;
}
