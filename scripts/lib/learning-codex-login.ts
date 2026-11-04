import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import {
  learningCodexEnvironment,
  learningCodexSignedIn,
  validateLearningCodexProfile,
} from "./learning-codex.ts";
import { lockLearningDirectory } from "./learning-storage.ts";

/** Codex owns credential storage; keys reach it only through stdin. */
export async function loginLearningCodex(options: {
  profileDirectory: string;
  withApiKey?: boolean;
  apiKey?: string;
  binary?: string;
}) {
  const withApiKey = options.withApiKey || options.apiKey !== undefined;
  learningAssert(
    !withApiKey || options.apiKey !== undefined || !process.stdin.isTTY,
    "Pipe an OpenAI API key into login --with-api-key, or run setup for a hidden prompt.",
  );
  learningAssert(
    options.apiKey === undefined ||
      (options.apiKey.length <= 8192 && /^\S+$/.test(options.apiKey)),
    "Enter an OpenAI API key without spaces or line breaks.",
  );
  await validateLearningCodexProfile(options.profileDirectory);
  const release = lockLearningDirectory(options.profileDirectory);
  const failure = withApiKey
    ? "Codex API key sign-in did not complete in the operating system credential store. Unlock or enable the keyring, then pipe an OpenAI API key into login --with-api-key with the same directory/profile. Plaintext fallback is disabled; your notebook was retained."
    : "Codex sign-in did not complete in the operating system credential store. Unlock or enable the keyring, then rerun login. Plaintext fallback is disabled; your notebook was retained.";
  try {
    const child = spawn(
      options.binary ?? "codex",
      [
        "login",
        ...(withApiKey ? ["--with-api-key"] : []),
        "-c",
        'cli_auth_credentials_store="keyring"',
      ],
      {
        env: learningCodexEnvironment(options.profileDirectory),
        // Suppress provider output for key login so a diagnostic cannot echo
        // the credential. Interactive browser login keeps its own prompts.
        stdio: withApiKey
          ? [
              options.apiKey === undefined ? "inherit" : "pipe",
              "ignore",
              "ignore",
            ]
          : "inherit",
      },
    );
    let inputFailed = false;
    if (options.apiKey !== undefined) {
      child.stdin!.on("error", () => {
        inputFailed = true;
      });
      child.stdin!.end(`${options.apiKey}\n`);
    }
    const [code] = await once(child, "close");
    learningAssert(code === 0 && !inputFailed, failure);
    learningAssert(
      learningCodexSignedIn(options.profileDirectory, options.binary),
      failure,
    );
    await validateLearningCodexProfile(options.profileDirectory);
  } catch (error) {
    if (error instanceof LearningProblem) throw error;
    throw new LearningProblem(failure);
  } finally {
    release();
  }
}

/** Remove only this dedicated profile's credentials through Codex's keyring. */
export async function logoutLearningCodex(options: {
  profileDirectory: string;
  binary?: string;
}) {
  await validateLearningCodexProfile(options.profileDirectory);
  const release = lockLearningDirectory(options.profileDirectory);
  const failure =
    "Codex sign-out did not complete in the operating system credential store. Unlock or enable the keyring and retry with the same dedicated profile. Your notebook was retained.";
  try {
    const child = spawn(
      options.binary ?? "codex",
      ["logout", "-c", 'cli_auth_credentials_store="keyring"'],
      {
        env: learningCodexEnvironment(options.profileDirectory),
        stdio: "ignore",
      },
    );
    const [code] = await once(child, "close");
    learningAssert(
      code === 0 &&
        !learningCodexSignedIn(options.profileDirectory, options.binary),
      failure,
    );
  } catch {
    throw new LearningProblem(failure);
  } finally {
    release();
  }
}
