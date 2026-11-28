import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { request } from "node:https";
import path from "node:path";
import { obsidianCompanionPort } from "../../shared/learning-connection.ts";
import { startLearningCompanionHost } from "../../scripts/lib/learning-companion-host.ts";
import { createApiProvider } from "../../scripts/lib/learning-api.ts";
import {
  presetUrls,
  type ApiTransport,
} from "../../scripts/lib/learning-api-model.ts";
import { learningDataDirectory } from "../../scripts/lib/learning-storage.ts";

// The host runs in an Electron renderer. Chromium fetch applies document CORS
// to provider traffic; Node HTTPS keeps this credential on its fixed API host.
const openAiTransport: ApiTransport = async (address, init) => {
  const url = new URL(address);
  if (
    url.origin !== "https://api.openai.com" ||
    url.username ||
    url.password ||
    !["/v1/models", "/v1/chat/completions"].includes(url.pathname) ||
    (init.body != null && typeof init.body !== "string")
  )
    throw new Error("Unsupported OpenAI API request.");
  return new Promise((resolve, reject) => {
    const outgoing = request(
      url,
      {
        method: init.method ?? "GET",
        headers: Object.fromEntries(new Headers(init.headers)),
        ...(init.signal ? { signal: init.signal } : {}),
      },
      (incoming) => {
        const status = incoming.statusCode ?? 500;
        if (status >= 300 && status < 400) {
          incoming.destroy();
          reject(new Error("Provider redirects are disabled."));
          return;
        }
        const iterator = incoming[Symbol.asyncIterator]();
        const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
          async pull(controller) {
            try {
              const chunk = await iterator.next();
              if (chunk.done) controller.close();
              else controller.enqueue(new Uint8Array(chunk.value));
            } catch (error) {
              controller.error(error);
            }
          },
          cancel() {
            incoming.destroy();
          },
        });
        resolve(
          new Response(status === 204 || status === 205 ? null : body, {
            status,
          }),
        );
      },
    );
    outgoing.once("error", reject);
    outgoing.end(init.body);
  });
};
export async function startObsidianAssistant(options: {
  vaultPath: string;
  origin: string;
  model: string;
  apiKey: string;
  version: string;
  signal: AbortSignal;
}) {
  if (!process.getBuiltinModule?.("node:sqlite")?.DatabaseSync)
    throw new Error(
      "Update the Obsidian desktop installer to one with built-in SQLite, or use the separate companion.",
    );
  const identity = createHash("sha256")
    .update(JSON.stringify([realpathSync(options.vaultPath), options.origin]))
    .digest("hex");
  const directory = path.join(
    path.dirname(learningDataDirectory()),
    "scalableweb-obsidian",
    identity,
  );
  return startLearningCompanionHost({
    directory,
    port: obsidianCompanionPort,
    origins: [options.origin],
    sourceRevision: `obsidian-course-diary@${options.version}`,
    providerSchema: "apiProvider",
    createProvider: () =>
      createApiProvider({
        provider: "openai",
        url: presetUrls.openai,
        model: options.model,
        tools: "none",
        contextWindow: 16_384,
        outputTokens: 2_048,
        apiKey: options.apiKey,
        transport: (address, init) =>
          openAiTransport(address, {
            ...init,
            signal: init.signal
              ? AbortSignal.any([init.signal, options.signal])
              : options.signal,
          }),
        directory,
      }),
  });
}
