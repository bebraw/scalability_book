import { createServer } from "node:http";
import { once } from "node:events";
import { openLearningNotebook } from "./learning-notebook.ts";
import { createCompanionHandler } from "./learning-companion-http.ts";
import type { LearningProvider } from "./learning-provider.ts";
import { openLearningConversations } from "./learning-conversations.ts";
import { lockLearningDirectory } from "./learning-storage.ts";
import { companionRelease } from "../../shared/learning-connection.ts";
export async function startLearningCompanionHost(options: {
  directory: string;
  port: number;
  origins: string[];
  createProvider: () => Promise<LearningProvider | null>;
  providerSchema?: "localProvider" | "apiProvider";
  sourceRevision: string;
}) {
  const { directory, port, origins } = options;
  const release = lockLearningDirectory(directory);
  let notebook: ReturnType<typeof openLearningNotebook> | undefined;
  let conversations: ReturnType<typeof openLearningConversations> | undefined;
  let provider: LearningProvider | null = null;
  try {
    provider = await options.createProvider();
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
          ...(options.providerSchema ? { [options.providerSchema]: 1 } : {}),
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
        // A browser Request in Obsidian's renderer strips the inbound Origin.
        // Pass the actual incoming headers to the shared session checks.
        const result = await companion.handle({
          url: `http://${request.headers.host ?? "invalid"}${request.url ?? "/"}`,
          method,
          headers,
          body: method === "GET" || method === "HEAD" ? null : body,
        });
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
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    let closing: Promise<void> | undefined;
    function stop() {
      if (closing) return closing;
      closing = new Promise<void>((resolve) => {
        conversations!.close();
        server.close(() => {
          notebook!.close();
          release();
          resolve();
        });
        server.closeIdleConnections();
      });
      return closing;
    }
    return { server, stop };
  } catch (error) {
    conversations?.close();
    if (!conversations) provider?.close();
    notebook?.close();
    release();
    throw error;
  }
}
