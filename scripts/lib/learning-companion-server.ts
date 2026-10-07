import { createServer } from "node:http";
import { once } from "node:events";
import { openLearningNotebook } from "./learning-notebook.ts";
import { createCompanionHandler } from "./learning-companion-http.ts";
import { createCodexProvider } from "./learning-codex.ts";
import type { LearningProvider } from "./learning-provider.ts";
import { createLocalProvider } from "./learning-local.ts";
import type { LocalModelOptions } from "./learning-local-model.ts";
import { openLearningConversations } from "./learning-conversations.ts";
import { lockLearningDirectory } from "./learning-storage.ts";
import { companionRelease } from "../../shared/learning-connection.ts";
export async function startLearningCompanion(options: {
  directory: string;
  port: number;
  origins: string[];
  codexHome?: string;
  model?: string;
  local?: LocalModelOptions;
  sourceRevision: string;
}) {
  const { directory, port, origins } = options;
  const release = lockLearningDirectory(directory);
  let notebook: ReturnType<typeof openLearningNotebook> | undefined;
  let conversations: ReturnType<typeof openLearningConversations> | undefined;
  let releaseProfile: (() => void) | undefined;
  let provider: LearningProvider | null = null;
  try {
    if (options.codexHome)
      releaseProfile = lockLearningDirectory(options.codexHome);
    provider = options.codexHome
      ? await createCodexProvider({
          home: options.codexHome,
          ...(options.model ? { model: options.model } : {}),
        })
      : options.local
        ? await createLocalProvider({ ...options.local, directory })
        : null;
    notebook = openLearningNotebook(directory);
    conversations = openLearningConversations(directory, notebook, provider);
    const companion = createCompanionHandler({
      origins,
      port,
      notebook,
      conversations,
      metadata: {
        release: {
          name: companionRelease.name,
          version: companionRelease.version,
          sourceRevision: options.sourceRevision,
        },
        storage: directory,
        schemas: {
          notebook: 1,
          conversations: 1,
          archive: 1,
          ...(options.local ? { localProvider: 1 } : {}),
        },
      },
    });
    const server = createServer(async (request, response) => {
      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers))
          if (value)
            headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        const method = request.method ?? "GET";
        const iterator = request[Symbol.asyncIterator]();
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const next = await iterator.next();
              if (next.done) controller.close();
              else if (next.value instanceof Uint8Array)
                controller.enqueue(next.value);
              else controller.error(new Error("Expected request bytes."));
            } catch (error) {
              controller.error(error);
            }
          },
          async cancel() {
            request.destroy();
            await iterator.return?.();
          },
        });
        const result = await companion.handle(
          new Request(
            `http://${request.headers.host ?? "invalid"}${request.url ?? "/"}`,
            {
              method,
              headers,
              ...(method !== "GET" && method !== "HEAD"
                ? { body, duplex: "half" }
                : {}),
            },
          ),
        );
        response.writeHead(result.status, Object.fromEntries(result.headers));
        if (result.body)
          for await (const chunk of result.body) {
            if (!response.write(chunk))
              await new Promise((resolve) => response.once("drain", resolve));
          }
        response.end();
      } catch {
        response.writeHead(500);
        response.end("Companion request failed.");
      }
    });
    server.requestTimeout = 30_000;
    server.headersTimeout = 15_000;
    server.listen(port, "127.0.0.1", () => {
      process.stdout.write(
        `Learning companion: http://127.0.0.1:${port}\nAllowed websites: ${origins.join(", ")}\nIn the book, choose Notebook → Connect → Connect companion.\nPrivate notebook: ${directory}\n`,
      );
    });

    await once(server, "listening");
    let closing = false;
    const stop = () => {
      if (closing) return;
      closing = true;
      conversations!.close();
      server.close(() => {
        notebook!.close();
        releaseProfile?.();
        release();
      });
      server.closeIdleConnections();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return { server, stop };
  } catch (error) {
    conversations?.close();
    if (!conversations) provider?.close();
    notebook?.close();
    releaseProfile?.();
    release();
    throw error;
  }
}
