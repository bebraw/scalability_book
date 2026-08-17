import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseMutation, type MutationName } from "./tracker.ts";

const requestedMutation = process.argv[2];

let mutation: MutationName | undefined;

try {
  mutation = parseMutation(requestedMutation);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 2;
}

if (mutation) {
  const testFile = fileURLToPath(new URL("./starter.test.ts", import.meta.url));

  if (mutation === "baseline") {
    console.log("Running the baseline against the starter tests.\n");
  } else {
    console.log(
      `Running ${mutation}. A green result means this mutant survived the starter tests.\n`,
    );
  }

  const result = spawnSync(process.execPath, ["--test", testFile], {
    env: { ...process.env, TRACKER_MUTATION: mutation },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
