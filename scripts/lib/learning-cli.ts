import { parseArgs } from "node:util";
import path from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  accessSync,
  constants,
} from "node:fs";
import { createServer } from "node:net";
import { once } from "node:events";
import { companionRelease } from "../../shared/learning-connection.ts";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import {
  learningDataDirectory,
  ensureLearningDirectory,
  lockLearningDirectory,
  migrateLearningDirectory,
} from "./learning-storage.ts";
import { inspectLearningDatabase } from "./learning-database.ts";
import {
  learningCodexVersion,
  learningCodexSignedIn,
  validateLearningCodexProfile,
} from "./learning-codex.ts";
import {
  parseLearningSettings,
  type LearningSettings,
} from "./learning-settings.ts";
import {
  inspectLocalModel,
  validateLocalModelOptions,
  type LocalModelOptions,
} from "./learning-local-model.ts";
import { startLearningCompanion } from "./learning-companion-server.ts";
import {
  loginLearningCodex,
  logoutLearningCodex,
} from "./learning-codex-login.ts";
import { inspectApiModel, type ApiModelOptions } from "./learning-api-model.ts";
import {
  readLearningApiKey,
  deleteLearningApiKey,
  saveLearningApiKey,
  validateLearningApiKey,
} from "./learning-api-credentials.ts";
import { learningQuestion, learningNextCommand } from "./learning-setup.ts";
import { configureLearningApi } from "./learning-api-setup.ts";

declare const __LEARNING_SOURCE_REVISION__: string;
const sourceRevision =
  typeof __LEARNING_SOURCE_REVISION__ === "undefined"
    ? "development"
    : __LEARNING_SOURCE_REVISION__;
type Check = { name: string; ok: boolean; message: string };
export async function checkLearningPort(port: number) {
  const server = createServer();
  try {
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  } catch {
    throw new LearningProblem(
      `Port ${port} is unavailable. Stop the companion using it or choose --port with a free port.`,
      409,
    );
  }
}
function codexVersionCheck(home: string): Check {
  const version = learningCodexVersion(home);
  const compatible = version === companionRelease.codexVersion;
  return {
    name: "Codex version",
    ok: compatible,
    message: compatible
      ? `Verified CLI ${version}.`
      : version
        ? `CLI ${version} has not been verified with this release. Install with npm install -g @openai/codex@${companionRelease.codexVersion}, then check codex --version.`
        : `Codex is unavailable on PATH or could not report its version. Install with npm install -g @openai/codex@${companionRelease.codexVersion}, then check codex --version.`,
  };
}
function codexSignInCheck(home: string): Check {
  const signedIn = learningCodexSignedIn(home);
  return {
    name: "Codex sign-in",
    ok: signedIn,
    message: signedIn
      ? "Dedicated OS keychain reports signed in; account access is checked on the first reply."
      : "Unlock your OS keychain and run login with this same directory/profile, then start again. Codex requires an available credential store; Linux also needs a Secret Service session.",
  };
}
function providerCheck(home: string): Check[] {
  const version = codexVersionCheck(home);
  return version.ok ? [version, codexSignInCheck(home)] : [version];
}
export async function runLearningCli(
  argv: string[],
  defaults: { defaultDirectory?: string } = {},
) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        port: { type: "string" },
        origin: { type: "string", multiple: true },
        directory: { type: "string" },
        codex: { type: "boolean" },
        notebook: { type: "boolean" },
        local: { type: "boolean" },
        api: { type: "boolean" },
        "api-provider": { type: "string" },
        "api-url": { type: "string" },
        "api-context": { type: "string" },
        "api-output": { type: "string" },
        "api-tools": { type: "string" },
        "api-key-env": { type: "string" },
        "with-api-key": { type: "boolean" },
        "local-url": { type: "string" },
        "local-tools": { type: "string" },
        "local-context": { type: "string" },
        "codex-home": { type: "string" },
        model: { type: "string" },
        from: { type: "string" },
        "confirm-stopped": { type: "boolean" },
        json: { type: "boolean" },
        help: { type: "boolean" },
        version: { type: "boolean" },
      },
    });
    if (values.version) {
      console.log(
        `${companionRelease.name} ${companionRelease.version} (${sourceRevision})`,
      );
      return;
    }
    const command = positionals[0] ?? "start";
    if (values.help) {
      console.log(
        `scalableweb-companion ${companionRelease.version}\nCommands: setup, login, logout, start (default), doctor, migrate\nRun setup in a terminal for guided provider selection and authentication.\nOptions: --directory <path>, --port <port>, --origin <exact-origin> (repeatable), --codex, --notebook, --local, --api, --codex-home <path>, --model <name>\nLocal model: --local-url <loopback /v1 URL>, --local-tools none|native, --local-context <loaded tokens>\nAPI: --api-provider openai|anthropic|gemini|openrouter|compatible, --api-url <HTTPS base URL>, --api-context <tokens>, --api-output <tokens>, --api-tools none|native, --api-key-env <variable name>\nAuthentication: login --with-api-key reads a key from stdin for the selected Codex/API provider; setup --api --with-api-key also accepts stdin. Keys are stored in the OS keychain, or read from --api-key-env. Never put the key in an argument. Logout removes the selected stored credential.\nMigration: migrate --from <old-directory> --confirm-stopped\nDiagnosis: doctor --json (no paid generation)\nLocal and API models default to discussion-only; native tools require verification on your model. Setup retains your origin and port. Start trusts only https://scalableweb.dev before setup; use --origin for local development. Connect from the book without a code. Stop with Ctrl+C; your work remains local.`,
      );
      return;
    }
    learningAssert(
      positionals.length <= 1 &&
        ["setup", "login", "logout", "start", "doctor", "migrate"].includes(
          command,
        ),
      "Choose setup, login, logout, start, doctor or migrate; use --help for options.",
    );
    learningAssert(
      [values.codex, values.notebook, values.local, values.api].filter(Boolean)
        .length <= 1,
      "Choose one of --codex, --notebook, --local or --api.",
    );
    const directory = path.resolve(
      values.directory ?? defaults.defaultDirectory ?? learningDataDirectory(),
    );
    const settingsFile = path.join(directory, "companion-settings.json");
    let settings: LearningSettings = {};
    if (existsSync(settingsFile)) {
      try {
        settings = parseLearningSettings(
          JSON.parse(readFileSync(settingsFile, "utf8")),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EACCES") throw error;
        throw new LearningProblem(
          "Companion settings are unreadable. Retain your databases, move companion-settings.json aside, and rerun setup.",
        );
      }
    }
    const port = Number(values.port ?? settings.port ?? 8788);
    learningAssert(
      Number.isInteger(port) && port >= 1024 && port <= 65535,
      "Choose a port from 1024 to 65535.",
    );
    const origins = values.origin ??
      settings.origins ?? ["https://scalableweb.dev"];
    for (const origin of origins) {
      let valid = false;
      try {
        valid = new URL(origin).origin === origin && /^https?:/.test(origin);
      } catch {
        /* Report no arbitrary input. */
      }
      learningAssert(
        valid,
        "Configure exact HTTP(S) origins, such as https://scalableweb.dev.",
      );
    }
    let mode: "notebook" | "codex" | "local" | "api" = values.notebook
      ? "notebook"
      : values.codex
        ? "codex"
        : values.local
          ? "local"
          : values.api
            ? "api"
            : (settings.provider ?? (settings.codex ? "codex" : "notebook"));
    learningAssert(
      !values["with-api-key"] ||
        command === "login" ||
        (command === "setup" && mode === "api"),
      "Use --with-api-key with login, or setup --api, and pipe the key on stdin.",
    );
    learningAssert(
      !values["api-key-env"] ||
        /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(values["api-key-env"]),
      "Choose a valid environment variable name with --api-key-env.",
    );
    learningAssert(
      !(values["api-key-env"] && values["with-api-key"]),
      "Choose an environment variable or a key from stdin, not both.",
    );
    let localModel = values.model ?? settings.local?.model;
    let localUrl =
      values["local-url"] ?? settings.local?.url ?? "http://127.0.0.1:1234/v1";
    const profileDirectory = path.resolve(
      values["codex-home"] ??
        settings.codexHome ??
        path.join(directory, "codex"),
    );
    if (command === "migrate") {
      learningAssert(
        values.from,
        "Supply --from with the old notebook directory.",
      );
      console.log(
        JSON.stringify(
          migrateLearningDirectory(
            values.from,
            directory,
            values["confirm-stopped"] ?? false,
          ),
          null,
          2,
        ),
      );
      return;
    }
    const legacy = path.resolve(".local/learning-companion");
    if (
      !values.directory &&
      !defaults.defaultDirectory &&
      directory !== legacy &&
      !existsSync(path.join(directory, "notebook.sqlite")) &&
      existsSync(path.join(legacy, "notebook.sqlite"))
    )
      throw new LearningProblem(
        `An existing repository notebook was found at ${legacy}. Run migrate --from "${legacy}" --confirm-stopped, or explicitly choose --directory. Your old work has not moved.`,
      );
    const guided =
      command === "setup" &&
      values.codex === undefined &&
      values.notebook === undefined &&
      values.local === undefined &&
      values.api === undefined &&
      process.stdin.isTTY &&
      process.stdout.isTTY;
    let codexApiLogin = false;
    if (guided) {
      console.log(
        "Choose how to use Companion:\n  1. Notebook only — no model account\n  2. Codex with ChatGPT sign-in\n  3. Codex with an OpenAI API key\n  4. API key directly — OpenAI, Anthropic, Gemini, OpenRouter or a compatible service; no Codex required\n  5. A local model in LM Studio\nAPI key usage is billed by your provider. Setup checks access without generating a paid reply.",
      );
      const answer = (
        await learningQuestion("Choice (1–5, or Enter to cancel): ")
      ).trim();
      if (!answer) return;
      learningAssert(
        ["1", "2", "3", "4", "5"].includes(answer),
        "Choose 1–5 and rerun setup.",
      );
      mode =
        answer === "1"
          ? "notebook"
          : answer === "4"
            ? "api"
            : answer === "5"
              ? "local"
              : "codex";
      codexApiLogin = answer === "3";
    }
    if (command === "setup" && mode === "local" && process.stdin.isTTY) {
      if (!values["local-url"])
        localUrl =
          (await learningQuestion(`Local API URL [${localUrl}]: `)).trim() ||
          localUrl;
      if (!values.model)
        localModel =
          (
            await learningQuestion(
              `Loaded language-model identifier${localModel ? ` [${localModel}]` : ""}: `,
            )
          ).trim() || localModel;
    }
    const codex = mode === "codex";
    const local: LocalModelOptions | undefined =
      mode === "local"
        ? {
            url: localUrl,
            model: localModel ?? "",
            tools: (values["local-tools"] ??
              settings.local?.tools ??
              "none") as LocalModelOptions["tools"],
            ...(values["local-context"] !== undefined
              ? { contextWindow: Number(values["local-context"]) }
              : settings.local?.contextWindow !== undefined
                ? { contextWindow: settings.local.contextWindow }
                : {}),
          }
        : undefined;
    learningAssert(
      local ||
        (!values["local-url"] &&
          !values["local-tools"] &&
          !values["local-context"]),
      "Choose --local when configuring local-model options.",
    );
    if (local) validateLocalModelOptions(local);
    learningAssert(
      mode === "api" ||
        ![
          values["api-provider"],
          values["api-url"],
          values["api-context"],
          values["api-output"],
          values["api-tools"],
          values["api-key-env"],
        ].some((value) => value !== undefined),
      "Choose --api when configuring API provider options.",
    );
    learningAssert(
      !values["with-api-key"] || codex || mode === "api",
      "API key login is available only for Codex or an API provider. Run setup to choose a provider.",
    );
    let api: ApiModelOptions | undefined;
    let apiKey: string | undefined;
    let apiKeyEnv: string | undefined;
    let newApiKey = false;
    if (command === "login" || command === "logout") {
      learningAssert(
        mode === "codex" || mode === "api",
        "Notebook-only and local-model modes need no provider login or logout. Run setup to choose a provider.",
      );
      learningAssert(
        ![
          values["api-provider"],
          values["api-url"],
          values["api-context"],
          values["api-output"],
          values["api-tools"],
          values.model,
        ].some((value) => value !== undefined),
        "Use setup to change the provider, endpoint, model or context. Login and logout use your saved provider configuration.",
      );
      learningAssert(
        mode !== "api" || (settings.provider === "api" && settings.api),
        "Run setup --api with the provider and model before updating its credentials with login.",
      );
    }
    learningAssert(
      command !== "logout" || !values["api-key-env"],
      "Logout uses your saved credential source. Run setup to change it.",
    );
    ensureLearningDirectory(directory);
    accessSync(directory, constants.W_OK);
    const release =
      command === "start" ? null : lockLearningDirectory(directory);
    try {
      if (mode === "api")
        ({ api, apiKey, apiKeyEnv, newApiKey } = await configureLearningApi({
          command,
          guided: Boolean(guided),
          directory,
          settings,
          values,
        }));
      if (command === "logout") {
        if (api) {
          learningAssert(
            !apiKeyEnv,
            "This setup reads an environment variable. Unset that variable in your terminal or revoke the key with your provider; no stored key was removed.",
          );
          const removed = await deleteLearningApiKey(directory, api.url);
          console.log(
            removed
              ? "Removed the selected API key from the OS keychain. Your notes and conversations were retained."
              : "No API key was stored for this notebook and endpoint.",
          );
        } else {
          const version = codexVersionCheck(profileDirectory);
          learningAssert(version.ok, version.message);
          await logoutLearningCodex({ profileDirectory });
          console.log(
            "Removed Companion's Codex keychain credentials. Your notes and conversations were retained.",
          );
        }
        return;
      }
      if (command === "setup") {
        await checkLearningPort(port);
        if (codex) {
          await validateLearningCodexProfile(profileDirectory);
          if (guided) {
            const version = codexVersionCheck(profileDirectory);
            learningAssert(version.ok, version.message);
            if (codexApiLogin) {
              const key = validateLearningApiKey(
                (
                  await learningQuestion(
                    "OpenAI API key (hidden; stored in Companion's OS keychain entry): ",
                    true,
                  )
                ).trim(),
              );
              await loginLearningCodex({ profileDirectory, apiKey: key });
            } else await loginLearningCodex({ profileDirectory });
          }
        }
        const localInfo = local ? await inspectLocalModel(local) : null;
        const apiInfo = api ? await inspectApiModel(api, apiKey!) : null;
        if (api && newApiKey)
          await saveLearningApiKey(directory, api.url, apiKey!);
        const stage = `${settingsFile}.next`;
        writeFileSync(
          stage,
          JSON.stringify({
            provider: mode,
            port,
            origins,
            ...(codex
              ? {
                  codexHome: profileDirectory,
                  ...((values.model ?? settings.model)
                    ? { model: values.model ?? settings.model }
                    : {}),
                }
              : {}),
            ...(local ? { local } : {}),
            ...(api ? { api, ...(apiKeyEnv ? { apiKeyEnv } : {}) } : {}),
          }),
          { mode: 0o600 },
        );
        renameSync(stage, settingsFile);
        console.log(
          `Storage: ${directory}\nPackage: ${companionRelease.version}; protocol: ${companionRelease.protocol}\n${codex ? `Dedicated Codex profile: ${profileDirectory}` : localInfo ? `Local model: ${localInfo.model}; context budget ${localInfo.contextWindow} tokens; tools ${local!.tools}. No Codex sign-in needed.` : apiInfo ? `API model: ${apiInfo.model}; context budget ${apiInfo.contextWindow} tokens; tools ${api!.tools}. No Codex installation needed.` : "Notebook-only setup is ready."}\nAllowed websites: ${origins.join(", ")}\nNext, start Companion and keep this terminal open:\n${learningNextCommand(directory, Boolean(defaults.defaultDirectory))}\nThen open Notebook → Connect in the book and use http://127.0.0.1:${port}. Send your first question to verify model access; setup has not generated a reply.`,
        );
        if (codex)
          for (const check of providerCheck(profileDirectory))
            console.log(
              `${check.ok ? "OK" : "ACTION"} ${check.name}: ${check.message}`,
            );
        return;
      }
      if (command === "login") {
        if (api) {
          await inspectApiModel(api, apiKey!);
          if (newApiKey) await saveLearningApiKey(directory, api.url, apiKey!);
          // Switching from an environment reference to a saved key is deliberate.
          if (newApiKey || values["api-key-env"] !== undefined) {
            if (apiKeyEnv) settings.apiKeyEnv = apiKeyEnv;
            else delete settings.apiKeyEnv;
            const stage = `${settingsFile}.next`;
            writeFileSync(stage, JSON.stringify(settings), { mode: 0o600 });
            renameSync(stage, settingsFile);
          }
          console.log(
            "API model listed and credential choice saved. Send your first question to check generation access; no paid reply was generated during setup.",
          );
          return;
        }
        learningAssert(
          !local,
          "Local models need no Codex sign-in. Start LM Studio and load your chosen model instead.",
        );
        const version = codexVersionCheck(profileDirectory);
        learningAssert(version.ok, version.message);
        await loginLearningCodex({
          profileDirectory,
          withApiKey: values["with-api-key"] ?? false,
        });
        console.log(
          "Codex authentication saved in Companion's OS keychain entry. Start Companion, then send a question in the book.",
        );
        return;
      }
      const checks: Check[] = [];
      for (const [file, kind] of [
        ["notebook.sqlite", "notebook"],
        ["conversations.sqlite", "conversations"],
        ["local-provider.sqlite", "local-provider"],
        ["api-provider.sqlite", "api-provider"],
      ] as const) {
        if (existsSync(path.join(directory, file))) {
          try {
            const schema = inspectLearningDatabase(
              path.join(directory, file),
              kind,
            );
            checks.push({
              name: kind,
              ok: true,
              message: `Stored schema ${schema}${schema === 0 ? "; startup will make a backup and migrate to 1" : ""}.`,
            });
          } catch (error) {
            checks.push({
              name: kind,
              ok: false,
              message:
                error instanceof Error
                  ? error.message
                  : "Invalid stored schema.",
            });
          }
        }
      }
      try {
        await checkLearningPort(port);
        checks.push({
          name: "Loopback port",
          ok: true,
          message: `127.0.0.1:${port} is available.`,
        });
      } catch (error) {
        checks.push({
          name: "Loopback port",
          ok: false,
          message: (error as Error).message,
        });
      }
      if (codex) {
        const version = codexVersionCheck(profileDirectory);
        checks.push(version);
        try {
          await validateLearningCodexProfile(profileDirectory);
          if (version.ok) checks.push(codexSignInCheck(profileDirectory));
        } catch (error) {
          checks.push({
            name: "Dedicated profile",
            ok: false,
            message: (error as Error).message,
          });
        }
      }
      let localInfo: Awaited<ReturnType<typeof inspectLocalModel>> | undefined;
      if (local) {
        try {
          localInfo = await inspectLocalModel(local);
          checks.push({
            name: "Local model",
            ok: true,
            message: `${localInfo.model}; loaded context ${localInfo.loadedContext ?? "not reported"}; advertised maximum ${localInfo.maximumContext ?? "not reported"}; budget ${localInfo.contextWindow}; tools ${local.tools}. Listing is not an inference or tool reliability check.`,
          });
        } catch (error) {
          checks.push({
            name: "Local model",
            ok: false,
            message:
              error instanceof LearningProblem
                ? error.message
                : "Local model diagnosis failed; your work was retained.",
          });
        }
      }
      let apiInfo: Awaited<ReturnType<typeof inspectApiModel>> | undefined;
      if (api) {
        try {
          apiKey = await readLearningApiKey(directory, api.url, apiKeyEnv);
          apiInfo = await inspectApiModel(api, apiKey);
          checks.push({
            name: "API model",
            ok: true,
            message: `${apiInfo.model}; budget ${apiInfo.contextWindow}; tools ${api.tools}. Model listing succeeded; the first question checks generation access. No paid reply was generated.`,
          });
        } catch (error) {
          checks.push({
            name: "API model",
            ok: false,
            message:
              error instanceof LearningProblem
                ? error.message
                : "API diagnosis failed; your work was retained.",
          });
        }
      }
      const optionalChecks =
        command === "doctor" && !codex
          ? [codexVersionCheck(profileDirectory)]
          : [];
      const report = {
        release: { ...companionRelease, sourceRevision },
        connection: { origins, port },
        storage: directory,
        provider: codex
          ? "Codex"
          : local
            ? "Local model"
            : api
              ? "API model"
              : null,
        ...(localInfo ? { localModel: localInfo, toolMode: local!.tools } : {}),
        ...(apiInfo ? { apiModel: apiInfo, toolMode: api!.tools } : {}),
        checks,
        ...(optionalChecks.length ? { optionalChecks } : {}),
      };
      if (command === "doctor") {
        if (values.json) console.log(JSON.stringify(report, null, 2));
        else {
          console.log(
            `Storage: ${directory}\nPackage ${companionRelease.version}; protocol ${companionRelease.protocol}; notebook/archive schema 1\nMode: ${codex ? "Codex" : local ? "Local model" : api ? "API model" : "Notebook only"}\nAllowed websites: ${origins.join(", ")}`,
          );
          for (const check of checks)
            console.log(
              `${check.ok ? "OK" : "ACTION"} ${check.name}: ${check.message}`,
            );
          for (const check of optionalChecks)
            console.log(
              `${check.ok ? "OK (optional)" : "OPTIONAL"} ${check.name}: ${check.message} Codex CLI is needed only for Codex assistant replies. Run doctor --codex to check that mode; setup --codex selects it.`,
            );
          console.log(
            "If connecting fails: check the address and exact allowed website origin, and allow the browser's local-network request. Choose Connect companion again after a restart or expired session. A browser network error alone cannot identify its cause.",
          );
        }
        if (checks.some((check) => !check.ok)) process.exitCode = 1;
        return;
      }
      learningAssert(
        checks.every((check) => check.ok),
        checks
          .filter((check) => !check.ok)
          .map((check) => check.message)
          .join("\n"),
      );
    } finally {
      release?.();
    }
    await startLearningCompanion({
      directory,
      port,
      origins,
      sourceRevision,
      ...(codex ? { codexHome: profileDirectory } : {}),
      ...(local ? { local } : {}),
      ...(api ? { api, apiKey: apiKey! } : {}),
      ...(codex && (values.model ?? settings.model)
        ? { model: values.model ?? settings.model! }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof LearningProblem
        ? error.message
        : (error as NodeJS.ErrnoException).code === "EACCES" ||
            (error as NodeJS.ErrnoException).code === "EPERM"
          ? "Storage permission was denied. Choose a writable --directory; your stored work was retained."
          : (error as NodeJS.ErrnoException).code?.startsWith("ERR_PARSE_ARGS")
            ? "The command options are invalid. Run --help for supported commands and options."
            : (error as NodeJS.ErrnoException).code === "EADDRINUSE"
              ? "The loopback port became unavailable. Stop the other companion or choose --port with a free port."
              : "The companion could not start. Run doctor with the same directory and port options; your stored work was retained.";
    console.error(message);
    process.exitCode = 1;
  }
}
