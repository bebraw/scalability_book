import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";

export interface ApiModelOptions {
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "compatible";
  url: string;
  model: string;
  tools: "none" | "native";
  contextWindow: number;
  outputTokens?: number;
}
export const presetUrls = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
};

/** This separate boundary never relaxes the credential-free local adapter. */
export function apiModelUrl(value: string) {
  const message =
    "Use an HTTPS API base URL without credentials, query or fragment, such as https://api.openai.com/v1.";
  learningAssert(
    typeof value === "string" &&
      value.length <= 2000 &&
      /^https:\/\//.test(value) &&
      !/[\s\\?#]/.test(value),
    message,
  );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LearningProblem(message);
  }
  learningAssert(
    url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    message,
  );
  return url.href.replace(/\/+$/, "");
}
function validateApiEndpoint(
  options: Pick<ApiModelOptions, "provider" | "url">,
) {
  learningAssert(
    ["openai", "anthropic", "gemini", "openrouter", "compatible"].includes(
      options.provider,
    ),
    "Choose OpenAI, Anthropic, Gemini, OpenRouter or an OpenAI-compatible API provider.",
  );
  const url = apiModelUrl(options.url);
  learningAssert(
    options.provider === "compatible" || url === presetUrls[options.provider],
    "Use the selected provider's standard API URL, or choose compatible for a custom HTTPS endpoint.",
  );
  return url;
}
export function validateApiModelOptions(options: ApiModelOptions) {
  validateApiEndpoint(options);
  learningAssert(
    typeof options.model === "string" &&
      options.model.trim() === options.model &&
      options.model.length > 0 &&
      options.model.length <= 300 &&
      !/[\u0000-\u001f]/.test(options.model),
    "Choose an explicit API language-model identifier with --model.",
  );
  learningAssert(
    ["none", "native"].includes(options.tools),
    "Choose --api-tools none or native.",
  );
  learningAssert(
    Number.isInteger(options.contextWindow) &&
      options.contextWindow >= 4096 &&
      options.contextWindow <= 262144,
    "Choose --api-context from 4096 to 262144 tokens, within the model's supported context.",
  );
  const outputTokens = options.outputTokens ?? 4096;
  learningAssert(
    Number.isInteger(outputTokens) &&
      outputTokens >= 256 &&
      outputTokens <= 32768 &&
      outputTokens + 512 < options.contextWindow,
    "Choose --api-output from 256 to 32768 tokens and leave more than 512 tokens inside --api-context for the prompt. Select a larger context budget or a smaller output allowance.",
  );
}
function validateApiKey(apiKey: string) {
  learningAssert(
    typeof apiKey === "string" &&
      apiKey.length > 0 &&
      apiKey.length <= 4096 &&
      !/[^\x21-\x7e]/.test(apiKey),
    "An API key is missing or invalid. Rerun API setup or supply the configured key environment variable.",
  );
}
function apiFailure(status: number): LearningProblem {
  if (status === 401 || status === 403)
    return new LearningProblem(
      "The API rejected authentication or access. Check the key, its permissions and model access, then rerun API setup. Your work was retained.",
      502,
    );
  if (status === 402)
    return new LearningProblem(
      "The API account has insufficient credit. Check billing with your provider before retrying. Your work was retained.",
      502,
    );
  if (status === 429)
    return new LearningProblem(
      "The API rate or account quota limit was reached. Check your provider's limits and billing, then retry later. Your work was retained.",
      503,
    );
  if (status === 404)
    return new LearningProblem(
      "The API endpoint or selected model was not found. Check the base URL, model identifier and account access. Your work was retained.",
      502,
    );
  if (status === 400 || status === 413 || status === 422)
    return new LearningProblem(
      "The API rejected the model request. Check Chat Completions and tool support, or select less context/start a new conversation. Your work was retained.",
      502,
    );
  return new LearningProblem(
    "The API service could not complete the request. Check provider availability and retry later. Your work was retained.",
    502,
  );
}

/** Credentials stay in request headers; remote diagnostics are never forwarded. */
export async function apiModelJson(
  url: string,
  apiKey: string,
  signal: AbortSignal,
  body?: unknown,
  maximum = 512_000,
  request: { anthropic?: boolean; afterId?: string } = {},
): Promise<Record<string, unknown>> {
  apiModelUrl(url);
  validateApiKey(apiKey);
  const endpoint = new URL(url);
  if (request.afterId) endpoint.searchParams.set("after_id", request.afterId);
  let response: Response;
  try {
    response = await fetch(endpoint.href, {
      redirect: "error",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(request.anthropic ? { "anthropic-version": "2026-10-21" } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    });
  } catch {
    if (signal.aborted)
      throw new LearningProblem(
        "Stopped or timed out. Your conversation was retained.",
        409,
      );
    throw new LearningProblem(
      "The API endpoint is unavailable. Check your network and HTTPS API URL; redirects are not followed. Your work was retained.",
      503,
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw apiFailure(response.status);
  }
  learningAssert(response.body, "The API returned no response.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      learningAssert(
        size <= maximum,
        "The API response was too large. Your work was retained.",
        502,
      );
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof LearningProblem) throw error;
    throw new LearningProblem(
      signal.aborted
        ? "Stopped or timed out. Your conversation was retained."
        : "The API response was interrupted. Retry when the service is available; your work was retained.",
      signal.aborted ? 409 : 502,
    );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new LearningProblem(
      "The API returned invalid JSON. Your work was retained.",
      502,
    );
  }
  learningAssert(
    value && typeof value === "object" && !Array.isArray(value),
    "The API returned an invalid response.",
    502,
  );
  return value as Record<string, unknown>;
}
export async function listApiModels(
  options: Pick<ApiModelOptions, "provider" | "url">,
  apiKey: string,
): Promise<string[]> {
  const url = validateApiEndpoint(options);
  const signal = AbortSignal.timeout(15_000);
  const models = new Set<string>();
  const cursors = new Set<string>();
  let afterId: string | undefined;
  for (let page = 0; page < 20; page++) {
    // Catalogs include metadata and can be larger than an individual reply.
    const response = await apiModelJson(
      `${url}/models`,
      apiKey,
      signal,
      undefined,
      8_000_000,
      {
        anthropic: options.provider === "anthropic",
        ...(afterId ? { afterId } : {}),
      },
    );
    learningAssert(
      Array.isArray(response.data) && response.data.length <= 20_000,
      "The API did not return a compatible model list. Check the provider's API base URL.",
      502,
    );
    for (const item of response.data) {
      const id = item && typeof item === "object" ? item.id : undefined;
      if (
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= 300 &&
        id.trim() === id &&
        !/[\u0000-\u001f]/.test(id)
      )
        models.add(id);
    }
    learningAssert(
      models.size <= 20_000,
      "The API model list was too large.",
      502,
    );
    if (options.provider !== "anthropic" || response.has_more !== true)
      return [...models];
    learningAssert(
      typeof response.last_id === "string" &&
        response.last_id.length > 0 &&
        response.last_id.length <= 300 &&
        !cursors.has(response.last_id),
      "The API model list returned an invalid continuation. Retry model discovery later.",
      502,
    );
    afterId = response.last_id;
    cursors.add(afterId);
  }
  throw new LearningProblem(
    "The API model list has too many pages. Retry model discovery later.",
    502,
  );
}
export async function inspectApiModel(
  options: ApiModelOptions,
  apiKey: string,
) {
  validateApiModelOptions(options);
  const models = await listApiModels(options, apiKey);
  learningAssert(
    models.includes(options.model),
    "The selected API model is not listed. Check its exact identifier and account access; no model was selected for you.",
    503,
  );
  return {
    model: options.model,
    contextWindow: options.contextWindow,
    version: null as string | null,
  };
}
