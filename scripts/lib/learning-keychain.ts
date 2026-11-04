import { LearningProblem } from "../../shared/learning-workspace.ts";

export interface LearningKeychain {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, key: string): Promise<void>;
  delete(service: string, account: string): Promise<boolean>;
}
interface NativeEntry {
  getPassword(signal: AbortSignal): Promise<string | null>;
  setPassword(key: string, signal: AbortSignal): Promise<void>;
  deleteCredential(signal: AbortSignal): Promise<boolean>;
}
interface NativeKeyring {
  AsyncEntry: new (
    service: string,
    account: string,
    options: { linux: { store: "secret-service" } },
  ) => NativeEntry;
}
export function learningKeychainFailure(mutation?: "save" | "delete") {
  return new LearningProblem(
    "The OS keychain is unavailable, locked, access was denied, or the operation timed out. Unlock or enable your system credential store and retry, or explicitly use --api-key-env for this terminal. No plaintext fallback was used." +
      (mutation
        ? ` The ${mutation} may have completed; check the saved key or retry before assuming it failed.`
        : ""),
    503,
  );
}

/** Lazy native loading keeps notebook/local/env-only use independent of keychains.
 * The injected loader is a unit-test seam, never a production environment switch.
 * Abort signals request cancellation after 15 seconds; they are not a hard
 * deadline. Native construction is synchronous (including Linux D-Bus setup),
 * and N-API cannot cancel work already running in the system credential store.
 * Unlock prompts may therefore outlast the signal, and writes may still finish.
 */
export function createLearningKeychain(
  load: () => Promise<NativeKeyring> = () => import("@napi-rs/keyring"),
): LearningKeychain {
  let native: Promise<NativeKeyring> | undefined;
  const entry = async (service: string, account: string) => {
    const { AsyncEntry } = await (native ??= load());
    // Requiring Secret Service disables the library's automatic Linux keyutils
    // fallback. This option is accepted but ignored on macOS and Windows.
    return new AsyncEntry(service, account, {
      linux: { store: "secret-service" },
    });
  };
  return {
    async get(service, account) {
      try {
        return await (
          await entry(service, account)
        ).getPassword(AbortSignal.timeout(15_000));
      } catch {
        throw learningKeychainFailure();
      }
    },
    async set(service, account, key) {
      try {
        await (
          await entry(service, account)
        ).setPassword(key, AbortSignal.timeout(15_000));
      } catch {
        throw learningKeychainFailure("save");
      }
    },
    async delete(service, account) {
      try {
        return await (
          await entry(service, account)
        ).deleteCredential(AbortSignal.timeout(15_000));
      } catch {
        throw learningKeychainFailure("delete");
      }
    },
  };
}
export const learningKeychain = createLearningKeychain();
