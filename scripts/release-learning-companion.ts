import path from "node:path";
import { companionRelease } from "../shared/learning-connection.ts";
import {
  parseReleaseArgs,
  runLearningCompanionRelease,
} from "./lib/learning-release.ts";

try {
  const options = parseReleaseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`Usage: npm run companion:release -- [--dry-run | --help]

Release the current prepared stable version from clean, pushed main.
Builds and checks the exact tarball, verifies the platform matrix, publishes
through npm's interactive authentication, and verifies registry bytes and CI.
Retries retain the tested artifact and reconcile any previous npm upload.

--dry-run  Build and check locally without login, dispatch or publication.
Version bumps and website announcements remain reviewed source changes.`);
  } else {
    await runLearningCompanionRelease({
      root: path.resolve(import.meta.dirname, ".."),
      release: companionRelease,
      dryRun: options.dryRun,
    });
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Companion release failed.",
  );
  process.exitCode = 1;
}
