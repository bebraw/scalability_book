import path from "node:path";
import { runLearningCli } from "./lib/learning-cli.ts";
await runLearningCli(process.argv.slice(2), {
  defaultDirectory: path.resolve(".local/learning-companion"),
});
