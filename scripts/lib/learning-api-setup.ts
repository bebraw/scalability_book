import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import {
  apiModelUrl,
  listApiModels,
  presetUrls,
  validateApiModelOptions,
  type ApiModelOptions,
} from "./learning-api-model.ts";
import {
  readLearningApiKey,
  readLearningApiKeyStdin,
  validateLearningApiKey,
} from "./learning-api-credentials.ts";
import type { LearningSettings } from "./learning-settings.ts";
import { learningQuestion } from "./learning-setup.ts";

interface ApiFlags {
  "api-provider"?: string | undefined;
  "api-url"?: string | undefined;
  "api-tools"?: string | undefined;
  "api-context"?: string | undefined;
  "api-output"?: string | undefined;
  "api-key-env"?: string | undefined;
  "with-api-key"?: boolean | undefined;
  model?: string | undefined;
}
/** Terminal configuration never exposes credentials through the browser contract. */
export async function configureLearningApi(options: {
  command: string;
  guided: boolean;
  directory: string;
  settings: LearningSettings;
  values: ApiFlags;
}) {
  const { command, guided, directory, settings, values } = options;
  let apiKey: string | undefined;
  let apiKeyEnv: string | undefined;
  let newApiKey = false;
  let api: ApiModelOptions;
  let provider = values["api-provider"] ?? settings.api?.provider ?? "openai";
  if (guided) {
    const choice =
      (
        await learningQuestion(
          "API provider: 1 OpenAI, 2 Anthropic (Claude), 3 Gemini, 4 OpenRouter, 5 another OpenAI-compatible service [1]: ",
        )
      ).trim() || "1";
    learningAssert(
      ["1", "2", "3", "4", "5"].includes(choice),
      "Choose 1–5 for the API provider.",
    );
    provider = ["openai", "anthropic", "gemini", "openrouter", "compatible"][
      Number(choice) - 1
    ]!;
  }
  let endpoint =
    values["api-url"] ??
    (provider === settings.api?.provider
      ? settings.api.url
      : (presetUrls[provider as keyof typeof presetUrls] ?? ""));
  if (
    command === "setup" &&
    provider === "compatible" &&
    !values["api-url"] &&
    process.stdin.isTTY
  )
    endpoint =
      (
        await learningQuestion(
          `HTTPS API base URL${endpoint ? ` [${endpoint}]` : ""}: `,
        )
      ).trim() || endpoint;
  endpoint = apiModelUrl(endpoint);
  const sameEndpoint =
    settings.api &&
    apiModelUrl(settings.api.url) === endpoint &&
    settings.api.provider === provider;
  apiKeyEnv =
    values["api-key-env"] ??
    (!values["with-api-key"] && sameEndpoint ? settings.apiKeyEnv : undefined);
  api = {
    provider: provider as ApiModelOptions["provider"],
    url: endpoint,
    model: values.model ?? (sameEndpoint ? settings.api!.model : ""),
    tools: (values["api-tools"] ??
      (sameEndpoint
        ? settings.api!.tools
        : "none")) as ApiModelOptions["tools"],
    contextWindow: Number(
      values["api-context"] ??
        (sameEndpoint ? settings.api!.contextWindow : 16384),
    ),
    outputTokens: Number(
      values["api-output"] ??
        (sameEndpoint ? (settings.api!.outputTokens ?? 4096) : 4096),
    ),
  };
  if (command === "setup" || command === "login") {
    console.log(
      `API destination: ${endpoint}\nOnly messages you send and their selected context go to this provider. Your provider bills model usage.`,
    );
    if (values["with-api-key"]) {
      apiKey = await readLearningApiKeyStdin();
      newApiKey = true;
    } else if (apiKeyEnv)
      apiKey = await readLearningApiKey(directory, endpoint, apiKeyEnv);
    else if (process.stdin.isTTY) {
      let savedKey: string | undefined;
      try {
        savedKey = await readLearningApiKey(directory, endpoint);
      } catch (error) {
        if (
          !(error instanceof LearningProblem) ||
          !error.message.startsWith("No API key is saved")
        )
          throw error;
      }
      const entered = await learningQuestion(
        `API key (hidden; saved in your OS keychain${savedKey ? "; Enter keeps the saved key" : ""}): `,
        true,
      );
      apiKey = validateLearningApiKey(entered.trim() || savedKey);
      newApiKey = Boolean(entered.trim());
    } else apiKey = await readLearningApiKey(directory, endpoint);
    if (command === "setup" && !values.model && process.stdin.isTTY) {
      const models = await listApiModels(api, apiKey);
      const shown = models.slice(0, 20);
      console.log(
        `Available model identifiers (first ${shown.length} of ${models.length}; choose a text model):\n${shown.map((model, index) => `  ${index + 1}. ${model}`).join("\n")}`,
      );
      const selected = (
        await learningQuestion(
          `Model number or exact identifier${api.model ? ` [${api.model}]` : ""}: `,
        )
      ).trim();
      api.model = /^\d+$/.test(selected)
        ? (shown[Number(selected) - 1] ?? selected)
        : selected || api.model;
    }
  }
  validateApiModelOptions(api);
  return { api, apiKey, apiKeyEnv, newApiKey };
}
