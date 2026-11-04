import { createHash } from "node:crypto";
import { createChatProvider } from "./learning-chat.ts";
import {
  inspectLocalModel,
  localModelJson,
  localModelUrl,
  type LocalModelOptions,
} from "./learning-local-model.ts";

const replyFormat = {
  type: "json_schema",
  json_schema: {
    name: "learning_reply",
    strict: true,
    schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
      additionalProperties: false,
    },
  },
};
export async function createLocalProvider(
  options: LocalModelOptions & { directory: string },
) {
  const info = await inspectLocalModel(options);
  const url = localModelUrl(options.url);
  // Preserve the original local identity so existing transcripts still resume.
  const backend = createHash("sha256")
    .update(JSON.stringify({ url, model: options.model, tools: options.tools }))
    .digest("hex");
  return createChatProvider({
    name: "Local model",
    kind: "local",
    directory: options.directory,
    backend,
    model: options.model,
    version: info.version,
    tools: options.tools,
    contextWindow: info.contextWindow,
    outputTokens: 1024,
    parameters: {
      temperature: 0.2,
      max_tokens: 1024,
      reasoning_effort: "none",
    },
    replyFormat,
    complete: (body, signal) =>
      localModelJson(`${url}/chat/completions`, signal, body),
  });
}
