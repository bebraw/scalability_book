import { createServer } from "node:http";
import { parseArgs } from "node:util";
import path from "node:path";
import { openLearningNotebook } from "./lib/learning-notebook.ts";
import { createCompanionHandler } from "./lib/learning-companion-http.ts";
import { createCodexProvider } from "./lib/learning-codex.ts";
import { openLearningConversations } from "./lib/learning-conversations.ts";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "8788" },
    origin: { type: "string", multiple: true },
    directory: { type: "string", default: ".local/learning-companion" },
    codex: { type: "boolean", default: false },
    "codex-home": { type: "string" },
    model: { type: "string" },
  },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Choose a companion port from 1024 to 65535.");
const origins = values.origin ?? [
  "https://scalableweb.dev",
  "http://127.0.0.1:3000",
];
const notebook = openLearningNotebook(path.resolve(values.directory));
const provider = values.codex
  ? await createCodexProvider({
      home: path.resolve(
        values["codex-home"] ?? path.join(values.directory, "codex"),
      ),
      ...(values.model ? { model: values.model } : {}),
    })
  : null;
const conversations = openLearningConversations(
  path.resolve(values.directory),
  notebook,
  provider,
);
const companion = createCompanionHandler({
  origins,
  port,
  notebook,
  conversations,
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
    `Learning companion: http://127.0.0.1:${port}\nAllowed websites: ${origins.join(", ")}\nPairing code (single use, valid for 10 minutes): ${companion.code}\nPrivate notebook: ${path.resolve(values.directory)}\n`,
  );
});
const stop = () =>
  server.close(() => {
    conversations.close();
    notebook.close();
    process.exit(0);
  });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
