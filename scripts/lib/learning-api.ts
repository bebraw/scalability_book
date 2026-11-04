import { createHash } from "node:crypto";
import { createChatProvider } from "./learning-chat.ts";
import { copyApiAssistantMessage } from "./learning-api-message.ts";
import {
  apiModelJson,
  apiModelUrl,
  inspectApiModel,
  type ApiModelOptions,
} from "./learning-api-model.ts";

export async function createApiProvider(
  options: ApiModelOptions & { directory: string; apiKey: string },
) {
  const info = await inspectApiModel(options, options.apiKey);
  const url = apiModelUrl(options.url);
  const outputTokens = options.outputTokens ?? 4096;
  const backend = createHash("sha256")
    .update(
      JSON.stringify({
        provider: options.provider,
        url,
        model: options.model,
        tools: options.tools,
      }),
    )
    .digest("hex");
  return createChatProvider({
    name:
      options.provider === "openai"
        ? "OpenAI API"
        : options.provider === "anthropic"
          ? "Anthropic API"
          : options.provider === "gemini"
            ? "Gemini API"
            : options.provider === "openrouter"
              ? "OpenRouter API"
              : "Compatible API",
    kind: "api",
    directory: options.directory,
    backend,
    model: options.model,
    version: info.version,
    tools: options.tools,
    contextWindow: info.contextWindow,
    outputTokens,
    parameters:
      options.provider === "openai"
        ? { max_completion_tokens: outputTokens }
        : { max_tokens: outputTokens },
    copyAssistantMessage: (message) =>
      copyApiAssistantMessage(message, options.provider === "gemini"),
    complete: (body, signal) =>
      apiModelJson(
        `${url}/chat/completions`,
        options.apiKey,
        signal,
        body,
        512_000,
        { anthropic: options.provider === "anthropic" },
      ),
  });
}
