import { createServer } from "node:http";
import { once } from "node:events";

export const syntheticLocalModel = "synthetic-local-model";
export function localAnswer(content: string, tools = false) {
  return {
    model: syntheticLocalModel,
    choices: [
      {
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: tools ? content : JSON.stringify({ reply: content }),
        },
      },
    ],
  };
}
export function localCall(
  name = "observe_demo",
  args: unknown = { demoId: "demo-queue-balance-lab" },
) {
  return {
    model: syntheticLocalModel,
    choices: [
      {
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "synthetic-call",
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  };
}
export async function startSyntheticLocalModel(
  answer: (body: any) => unknown | Promise<unknown> = () =>
    localAnswer("Synthetic discussion reply"),
  diagnostics: () => unknown = () => null,
) {
  const requests: any[] = [];
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/api/v1/models" && diagnostics()) {
      response.end(JSON.stringify(diagnostics()));
      return;
    }
    if (request.url === "/v1/models") {
      response.end(JSON.stringify({ data: [{ id: syntheticLocalModel }] }));
      return;
    }
    if (request.url !== "/v1/chat/completions") {
      response.writeHead(404);
      response.end("{}");
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push(body);
    try {
      response.end(JSON.stringify(await answer(body)));
    } catch {
      response.writeHead(500);
      response.end("{}");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing synthetic model address");
  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    requests,
    options: {
      url: `http://127.0.0.1:${address.port}/v1`,
      model: syntheticLocalModel,
      contextWindow: 8192,
      tools: "none" as const,
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
