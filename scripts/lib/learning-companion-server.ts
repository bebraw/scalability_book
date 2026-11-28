import { startLearningCompanionHost } from "./learning-companion-host.ts";
import { createCodexProvider } from "./learning-codex.ts";
import { createLocalProvider } from "./learning-local.ts";
import type { LocalModelOptions } from "./learning-local-model.ts";
import { createApiProvider } from "./learning-api.ts";
import type { ApiModelOptions } from "./learning-api-model.ts";
import { lockLearningDirectory } from "./learning-storage.ts";
import { learningAssert } from "../../shared/learning-workspace.ts";

export async function startLearningCompanion(options: {
  directory: string;
  port: number;
  origins: string[];
  codexHome?: string;
  model?: string;
  local?: LocalModelOptions;
  api?: ApiModelOptions;
  apiKey?: string;
  sourceRevision: string;
}) {
  const { directory, port, origins, codexHome, local, api, model } = options;
  learningAssert(
    [codexHome, local, api].filter(Boolean).length <= 1,
    "Choose one model provider for this companion.",
  );
  const releaseProfile = codexHome && lockLearningDirectory(codexHome);
  try {
    const companion = await startLearningCompanionHost({
      directory,
      port,
      origins,
      sourceRevision: options.sourceRevision,
      ...(local ? { providerSchema: "localProvider" } : {}),
      ...(api ? { providerSchema: "apiProvider" } : {}),
      createProvider: async () => {
        if (codexHome)
          return createCodexProvider({
            home: codexHome,
            ...(model ? { model } : {}),
          });
        if (local) return createLocalProvider({ ...local, directory });
        if (api)
          return createApiProvider({
            ...api,
            directory,
            apiKey: options.apiKey ?? "",
          });
        return null;
      },
    });
    process.stdout.write(
      `Learning companion: http://127.0.0.1:${port}\nAllowed websites: ${origins.join(", ")}\nIn the book, choose Notebook → Connect → Connect companion.\nPrivate notebook: ${directory}\n`,
    );
    const stop = async () => {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      await companion.stop();
      if (releaseProfile) releaseProfile();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return { server: companion.server, stop };
  } catch (error) {
    if (releaseProfile) releaseProfile();
    throw error;
  }
}
