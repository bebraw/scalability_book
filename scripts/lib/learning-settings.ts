import { learningAssert } from "../../shared/learning-workspace.ts";
import {
  validateLocalModelOptions,
  type LocalModelOptions,
} from "./learning-local-model.ts";
import {
  validateApiModelOptions,
  type ApiModelOptions,
} from "./learning-api-model.ts";

export interface LearningSettings {
  provider?: "notebook" | "codex" | "local" | "api";
  /** Existing Codex preferences remain readable. */
  codex?: boolean;
  codexHome?: string;
  model?: string;
  local?: LocalModelOptions;
  api?: ApiModelOptions;
  apiKeyEnv?: string;
  origins?: string[];
  port?: number;
}
export function parseLearningSettings(value: unknown): LearningSettings {
  const invalid =
    "Companion settings are invalid; keep your databases and recover companion-settings.json.";
  learningAssert(
    value && typeof value === "object" && !Array.isArray(value),
    invalid,
  );
  const settings = value as LearningSettings;
  learningAssert(
    settings.port === undefined ||
      (Number.isInteger(settings.port) &&
        settings.port >= 1024 &&
        settings.port <= 65535),
    invalid,
  );
  learningAssert(
    settings.origins === undefined ||
      (Array.isArray(settings.origins) &&
        settings.origins.length > 0 &&
        settings.origins.every((origin) => {
          try {
            return (
              typeof origin === "string" &&
              /^https?:/.test(origin) &&
              new URL(origin).origin === origin
            );
          } catch {
            return false;
          }
        })),
    invalid,
  );
  learningAssert(
    (settings.provider === undefined ||
      ["notebook", "codex", "local", "api"].includes(settings.provider)) &&
      (settings.codex === undefined || typeof settings.codex === "boolean") &&
      (settings.codexHome === undefined ||
        typeof settings.codexHome === "string") &&
      (settings.model === undefined ||
        (typeof settings.model === "string" && settings.model.length <= 300)) &&
      (settings.apiKeyEnv === undefined ||
        (typeof settings.apiKeyEnv === "string" &&
          /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(settings.apiKeyEnv))),
    invalid,
  );
  if (settings.local !== undefined) {
    learningAssert(
      settings.local &&
        typeof settings.local === "object" &&
        !Array.isArray(settings.local),
      invalid,
    );
    validateLocalModelOptions(settings.local);
  }
  learningAssert(settings.provider !== "local" || settings.local, invalid);
  if (settings.api !== undefined) {
    learningAssert(
      settings.api &&
        typeof settings.api === "object" &&
        !Array.isArray(settings.api),
      invalid,
    );
    validateApiModelOptions(settings.api);
  }
  learningAssert(settings.provider !== "api" || settings.api, invalid);
  return settings;
}
