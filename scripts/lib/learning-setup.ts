import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";

/** A fresh interface per prompt prevents secret input from entering visible prompt history. */
export async function learningQuestion(
  prompt: string,
  secret = false,
): Promise<string> {
  learningAssert(
    process.stdin.isTTY && process.stdout.isTTY,
    "Interactive setup needs a terminal. Use --notebook, --codex, --local or --api with explicit options for scripts.",
  );
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const input = createInterface({
    input: process.stdin,
    output: secret ? muted : process.stdout,
    terminal: true,
    historySize: secret ? 0 : 30,
  });
  const controller = new AbortController();
  input.once("SIGINT", () => controller.abort());
  try {
    if (secret) process.stdout.write(prompt);
    return await input.question(secret ? "" : prompt, {
      signal: controller.signal,
    });
  } catch {
    throw new LearningProblem(
      "Setup cancelled. Your existing notebook and settings were retained.",
    );
  } finally {
    input.close();
    if (secret) process.stdout.write("\n");
  }
}

export function learningShellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function learningNextCommand(
  directory: string,
  repository: boolean,
  command = "start",
) {
  // Until the prepared package is published, repository instructions remain usable.
  const executable = repository
    ? "npm run companion --"
    : `${learningShellQuote(process.execPath)} ${learningShellQuote(process.argv[1]!)}`;
  return `${executable} ${command} --directory ${learningShellQuote(directory)}`;
}
