import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  readFileSync,
  writeFileSync,
  rmSync,
  lstatSync,
  linkSync,
} from "node:fs";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import { ensureLearningDirectory } from "./learning-storage.ts";
import { apiModelUrl } from "./learning-api-model.ts";
import {
  learningKeychain,
  learningKeychainFailure,
  type LearningKeychain,
} from "./learning-keychain.ts";

export const learningKeychainService = "dev.scalableweb.companion";
const identityName = "credential-identity.json";
const missingMessage =
  "No API key is saved for this endpoint. Run setup interactively, or login --with-api-key after setup. For automation use --api-key-env with your provider and model options.";

export function validateLearningApiKey(value: unknown): string {
  learningAssert(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= 4096 &&
      !/[^\x21-\x7e]/.test(value),
    "Enter a nonempty API key without whitespace. The key was not saved.",
  );
  return value;
}
function present(filename: string) {
  try {
    lstatSync(filename);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new LearningProblem(
      "Credential metadata could not be inspected. Check access to the companion directory.",
    );
  }
}
function privateFile(filename: string, maximum: number, description: string) {
  let fd: number;
  try {
    fd = openSync(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new LearningProblem(
      `Use a regular private ${description} file in the companion directory.`,
    );
  }
  try {
    const state = fstatSync(fd);
    learningAssert(
      state.isFile() &&
        state.size <= maximum &&
        (process.platform === "win32" || (state.mode & 0o077) === 0),
      `The ${description} must be a private regular file with owner-only permissions.`,
    );
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}
function readIdentity(directory: string): string | null {
  const filename = path.join(directory, identityName);
  if (!present(filename)) return null;
  const bytes = privateFile(filename, 1024, identityName);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new LearningProblem(
      "Credential identity is unreadable. Restore credential-identity.json from a private backup or use another companion directory.",
    );
  }
  learningAssert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as { version?: unknown }).version === 1 &&
      typeof (value as { id?: unknown }).id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        (value as { id: string }).id,
      ),
    "Credential identity is invalid. Restore credential-identity.json from a private backup or use another companion directory.",
  );
  return (value as { id: string }).id;
}
function ensureIdentity(directory: string): string {
  const existing = readIdentity(directory);
  if (existing) return existing;
  ensureLearningDirectory(directory);
  const id = randomUUID();
  const filename = path.join(directory, identityName);
  const stage = path.join(
    directory,
    `.credential-identity-${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(stage, JSON.stringify({ version: 1, id }) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    try {
      linkSync(stage, filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      return readIdentity(directory)!;
    }
    return id;
  } catch (error) {
    if (error instanceof LearningProblem) throw error;
    throw new LearningProblem(
      "Credential identity could not be saved. Check access to the companion directory; no key was saved to a file.",
    );
  } finally {
    rmSync(stage, { force: true });
  }
}
function account(identity: string, endpoint: string) {
  return `api:${identity}:${createHash("sha256").update(apiModelUrl(endpoint)).digest("hex")}`;
}
async function keychainGet(store: LearningKeychain, id: string) {
  try {
    return await store.get(learningKeychainService, id);
  } catch {
    throw learningKeychainFailure();
  }
}
async function keychainSet(store: LearningKeychain, id: string, key: string) {
  try {
    await store.set(learningKeychainService, id, key);
  } catch {
    throw learningKeychainFailure("save");
  }
}

/** Explicit environment references never initialize a native store or create files. */
export async function readLearningApiKey(
  directory: string,
  endpoint: string,
  environmentName?: string,
  store: LearningKeychain = learningKeychain,
): Promise<string> {
  const canonical = apiModelUrl(endpoint);
  if (environmentName !== undefined) {
    learningAssert(
      /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(environmentName),
      "Choose a valid environment variable name with --api-key-env.",
    );
    const value = process.env[environmentName];
    learningAssert(
      value,
      `Set ${environmentName} in this terminal before starting the companion. Its value is never included in diagnostics.`,
    );
    return validateLearningApiKey(value);
  }
  const identity = readIdentity(directory);
  learningAssert(identity, missingMessage);
  const value = await keychainGet(store, account(identity, canonical));
  learningAssert(value !== null, missingMessage);
  return validateLearningApiKey(value);
}

/** Caller holds the directory lease. Only nonsecret identity metadata is written. */
export async function saveLearningApiKey(
  directory: string,
  endpoint: string,
  key: string,
  store: LearningKeychain = learningKeychain,
): Promise<void> {
  const canonical = apiModelUrl(endpoint);
  validateLearningApiKey(key);
  const id = account(ensureIdentity(directory), canonical);
  await keychainSet(store, id, key);
  learningAssert(
    (await keychainGet(store, id)) === key,
    "The OS keychain did not confirm the saved API key. Retry login or explicitly use --api-key-env; no key was saved to a file.",
    503,
  );
}
export async function deleteLearningApiKey(
  directory: string,
  endpoint: string,
  store: LearningKeychain = learningKeychain,
): Promise<boolean> {
  const canonical = apiModelUrl(endpoint);
  const identity = readIdentity(directory);
  if (!identity) return false;
  try {
    return await store.delete(
      learningKeychainService,
      account(identity, canonical),
    );
  } catch {
    throw learningKeychainFailure("delete");
  }
}
export async function readLearningApiKeyStdin(): Promise<string> {
  learningAssert(
    !process.stdin.isTTY,
    "Pipe the API key into --with-api-key, or run setup for a hidden prompt.",
  );
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    learningAssert(
      size <= 4098,
      "The API key input is too large. Nothing was saved.",
    );
    chunks.push(bytes);
  }
  return validateLearningApiKey(Buffer.concat(chunks).toString("utf8").trim());
}
