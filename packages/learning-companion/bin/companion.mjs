#!/usr/bin/env node
// Keep this launcher parseable on older runtimes so prerequisite failures are useful.
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error(
    "The learning companion needs Node.js 24 or newer. Install Node 24, then rerun the same command. Your notebook was not opened.",
  );
  process.exitCode = 1;
} else {
  try {
    await import("../dist/companion.js");
  } catch {
    console.error(
      "This companion installation is incomplete or unavailable on this runtime. Reinstall the documented package version; keep your notebook data directory.",
    );
    process.exitCode = 1;
  }
}
