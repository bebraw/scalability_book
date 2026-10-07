import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";

export interface LocalModelOptions {
  url: string;
  model: string;
  tools: "none" | "native";
  contextWindow?: number;
}
export function localModelUrl(value: string) {
  learningAssert(
    typeof value === "string" &&
      /^http:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?\/v1\/?$/.test(value),
    "Use a literal loopback HTTP model endpoint ending in /v1.",
  );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LearningProblem(
      "Use a literal loopback HTTP model endpoint ending in /v1.",
    );
  }
  learningAssert(
    url.protocol === "http:" &&
      ["127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.replace(/\/$/, "") === "/v1",
    "Use http://127.0.0.1:<port>/v1 or http://[::1]:<port>/v1 without credentials, query or fragment.",
  );
  return url.href.replace(/\/$/, "");
}
export function validateLocalModelOptions(options: LocalModelOptions) {
  localModelUrl(options.url);
  learningAssert(
    typeof options.model === "string" &&
      options.model.trim() === options.model &&
      options.model.length > 0 &&
      options.model.length <= 300 &&
      !/[\u0000-\u001f]/.test(options.model),
    "Choose an explicit local language-model identifier with --model.",
  );
  learningAssert(
    ["none", "native"].includes(options.tools),
    "Choose --local-tools none or native.",
  );
  learningAssert(
    options.contextWindow === undefined ||
      (Number.isInteger(options.contextWindow) &&
        options.contextWindow >= 4096 &&
        options.contextWindow <= 262144),
    "Choose --local-context from 4096 to 262144 tokens, within the loaded model's context.",
  );
}
export async function localModelJson(
  url: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "error",
      signal,
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    if (signal.aborted)
      throw new LearningProblem(
        "Stopped or timed out. Your conversation was retained.",
        409,
      );
    throw new LearningProblem(
      "The local model endpoint is unavailable. Check LM Studio's server and loaded model, then retry; your work was retained.",
      503,
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new LearningProblem(
      response.status === 400 || response.status === 413
        ? "The local model rejected the request. Check its output settings and loaded context, or select less context/start a new conversation. Your work was retained."
        : "The local model rejected the request. Check the selected model and server; your work was retained.",
      response.status === 404 ? 404 : 502,
    );
  }
  learningAssert(response.body, "The local model returned no response.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      learningAssert(
        size <= 512_000,
        "The local model response was too large. Your work was retained.",
        502,
      );
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new LearningProblem(
      "The local model returned invalid JSON. Your work was retained.",
      502,
    );
  }
  learningAssert(
    value && typeof value === "object" && !Array.isArray(value),
    "The local model returned an invalid response.",
    502,
  );
  return value as Record<string, unknown>;
}
export async function inspectLocalModel(options: LocalModelOptions) {
  validateLocalModelOptions(options);
  const url = localModelUrl(options.url);
  const list = await localModelJson(
    `${url}/models`,
    AbortSignal.timeout(10_000),
  );
  learningAssert(
    Array.isArray(list.data) &&
      list.data.some(
        (item: unknown) =>
          item &&
          typeof item === "object" &&
          (item as { id?: unknown }).id === options.model,
      ),
    "The selected local model is not listed. Load it in LM Studio and use its exact identifier; no model was downloaded or selected for you.",
    503,
  );
  let loadedContext: number | null = null;
  let maximumContext: number | null = null;
  let loaded: boolean | null = null;
  // Optional LM Studio diagnostics. Other compatibility servers may not expose it.
  try {
    const info = await localModelJson(
      `${new URL(url).origin}/api/v1/models`,
      AbortSignal.timeout(5000),
    );
    if (Array.isArray(info.models)) {
      const model = info.models.find(
        (item) =>
          item && typeof item === "object" && item.key === options.model,
      );
      if (model) {
        learningAssert(
          model.type === "llm",
          "Choose a language model, not an embedding model.",
        );
        loaded =
          Array.isArray(model.loaded_instances) &&
          model.loaded_instances.length > 0;
        const contexts = model.loaded_instances
          ?.map(
            (instance: { config?: { context_length?: unknown } }) =>
              instance.config?.context_length,
          )
          .filter(
            (value: unknown) =>
              typeof value === "number" && Number.isInteger(value) && value > 0,
          );
        loadedContext = contexts?.length ? Math.min(...contexts) : null;
        maximumContext =
          typeof model.max_context_length === "number"
            ? model.max_context_length
            : null;
      }
    }
  } catch (error) {
    if (error instanceof LearningProblem && error.status === 400) throw error;
  }
  learningAssert(
    loaded !== false,
    "The selected model is not loaded. Load it yourself in LM Studio before starting; the companion does not load models.",
    503,
  );
  learningAssert(
    loadedContext !== null || options.contextWindow !== undefined,
    "Loaded context is not reported. Supply --local-context with the context configured in your model runner.",
  );
  learningAssert(
    loadedContext === null || loadedContext >= 4096,
    "The loaded context is too small for the shared teaching prompt. Configure at least 4096 tokens in your runner and restart the companion.",
  );
  const contextWindow = Math.min(
    loadedContext ?? 262144,
    options.contextWindow ?? loadedContext!,
  );
  return {
    model: options.model,
    loaded,
    loadedContext,
    maximumContext,
    contextWindow,
    version: null as string | null,
  };
}
