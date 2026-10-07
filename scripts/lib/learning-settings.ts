import { learningAssert } from "../../shared/learning-workspace.ts";
import {
  validateLocalModelOptions,
  type LocalModelOptions,
} from "./learning-local-model.ts";

export interface LearningSettings {
  provider?: "notebook" | "codex" | "local";
  /** Existing Codex preferences remain readable. */
  codex?: boolean;
  codexHome?: string;
  model?: string;
  local?: LocalModelOptions;
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
    (settings.provider === undefined ||
      ["notebook", "codex", "local"].includes(settings.provider)) &&
      (settings.codex === undefined || typeof settings.codex === "boolean") &&
      (settings.codexHome === undefined ||
        typeof settings.codexHome === "string") &&
      (settings.model === undefined ||
        (typeof settings.model === "string" && settings.model.length <= 300)),
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
  return settings;
}
