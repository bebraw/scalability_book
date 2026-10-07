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
import { spawnSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline/promises";
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
  learningCodexEnvironment,
  learningCodexVersion,
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
function providerCheck(home: string): Check[] {
  const env = learningCodexEnvironment(home);
  const version = learningCodexVersion(home);
  const compatible = version === companionRelease.codexVersion;
  const checks: Check[] = [
    {
      name: "Codex version",
      ok: compatible,
      message: compatible
        ? `Verified CLI ${version}.`
        : version
          ? `CLI ${version} has not been verified with this release. Install @openai/codex@${companionRelease.codexVersion}.`
          : `Codex is unavailable. Install @openai/codex@${companionRelease.codexVersion}, then run setup --codex.`,
    },
  ];
  if (compatible) {
    const auth = spawnSync(
      "codex",
      ["login", "status", "-c", 'cli_auth_credentials_store="file"'],
      { env, stdio: "ignore", timeout: 8000 },
    );
    checks.push({
      name: "Codex sign-in",
      ok: auth.status === 0,
      message:
        auth.status === 0
          ? "Dedicated profile reports signed in; account access is checked on the first reply."
          : "Run login with this same directory/profile, then start again. Your ordinary Codex profile is unchanged.",
    });
  }
  return checks;
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
        port: { type: "string", default: "8788" },
        origin: { type: "string", multiple: true },
        directory: { type: "string" },
        codex: { type: "boolean" },
        notebook: { type: "boolean" },
        local: { type: "boolean" },
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
        `scalableweb-companion ${companionRelease.version}\nCommands: setup, login, start (default), doctor, migrate\nOptions: --directory <path>, --port <port>, --origin <exact-origin> (repeatable), --codex, --notebook, --local, --codex-home <path>, --model <name>, --local-url <loopback /v1 URL>, --local-tools none|native, --local-context <loaded tokens>\nMigration: migrate --from <old-directory> --confirm-stopped\nDiagnosis: doctor --json\nSetup starts notebook-only unless you choose Codex or Local model. Local defaults to discussion-only; native tools require verification on your model. Start trusts only https://scalableweb.dev by default; use --origin for local development. Connect from the book without a code. Stop with Ctrl+C; your work remains local.`,
      );
      return;
    }
    learningAssert(
      positionals.length <= 1 &&
        ["setup", "login", "start", "doctor", "migrate"].includes(command),
      "Choose setup, login, start, doctor or migrate; use --help for options.",
    );
    learningAssert(
      [values.codex, values.notebook, values.local].filter(Boolean).length <= 1,
      "Choose one of --codex, --notebook or --local.",
    );
    const directory = path.resolve(
      values.directory ?? defaults.defaultDirectory ?? learningDataDirectory(),
    );
    const port = Number(values.port);
    learningAssert(
      Number.isInteger(port) && port >= 1024 && port <= 65535,
      "Choose a port from 1024 to 65535.",
    );
    const origins = values.origin ?? ["https://scalableweb.dev"];
    for (const origin of origins) {
      let valid = false;
      try {
        valid = new URL(origin).origin === origin && /^https?:/.test(origin);
      } catch {
        /* Report invalid origins without echoing arbitrary input. */
      }
      learningAssert(
        valid,
        "Configure exact HTTP(S) origins, such as https://scalableweb.dev.",
      );
    }
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
    let mode: "notebook" | "codex" | "local" = values.notebook
      ? "notebook"
      : values.codex
        ? "codex"
        : values.local
          ? "local"
          : (settings.provider ?? (settings.codex ? "codex" : "notebook"));
    let localModel = values.model ?? settings.local?.model;
    let localUrl =
      values["local-url"] ?? settings.local?.url ?? "http://127.0.0.1:1234/v1";
    const home = path.resolve(
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
    if (
      command === "setup" &&
      values.codex === undefined &&
      values.notebook === undefined &&
      values.local === undefined &&
      process.stdin.isTTY
    ) {
      const input = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        const answer = await input.question(
          "Choose 1 for notebook-only, 2 for Codex, 3 for Local model, or Enter to cancel: ",
        );
        if (!answer) return;
        learningAssert(
          ["1", "2", "3"].includes(answer),
          "Choose 1, 2 or 3 and rerun setup.",
        );
        mode = answer === "2" ? "codex" : answer === "3" ? "local" : "notebook";
        if (mode === "local") {
          localUrl =
            (await input.question(`Local API URL [${localUrl}]: `)).trim() ||
            localUrl;
          localModel =
            (
              await input.question(
                `Loaded language-model identifier${localModel ? ` [${localModel}]` : ""}: `,
              )
            ).trim() || localModel;
        }
      } finally {
        input.close();
      }
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
    ensureLearningDirectory(directory);
    accessSync(directory, constants.W_OK);
    const release =
      command === "start" ? null : lockLearningDirectory(directory);
    try {
      if (command === "setup") {
        await checkLearningPort(port);
        if (codex) await validateLearningCodexProfile(home, false);
        const localInfo = local ? await inspectLocalModel(local) : null;
        const stage = `${settingsFile}.next`;
        writeFileSync(
          stage,
          JSON.stringify({
            provider: mode,
            ...(codex
              ? {
                  codexHome: home,
                  ...((values.model ?? settings.model)
                    ? { model: values.model ?? settings.model }
                    : {}),
                }
              : {}),
            ...(local ? { local } : {}),
          }),
          { mode: 0o600 },
        );
        renameSync(stage, settingsFile);
        console.log(
          `Storage: ${directory}\nPackage: ${companionRelease.version}; protocol: ${companionRelease.protocol}\n${codex ? `Dedicated Codex profile: ${home}\nRun doctor --codex, then login if needed.` : localInfo ? `Local model: ${localInfo.model}; context budget ${localInfo.contextWindow} tokens; tools ${local!.tools}. No Codex sign-in needed.` : "Notebook-only setup is ready."}\nRun start with these same directory options, then connect in https://scalableweb.dev/notebook/setup/.`,
        );
        if (codex)
          for (const check of providerCheck(home))
            console.log(
              `${check.ok ? "OK" : "ACTION"} ${check.name}: ${check.message}`,
            );
        return;
      }
      if (command === "login") {
        learningAssert(
          !local,
          "Local models need no Codex sign-in. Start LM Studio and load your chosen model instead.",
        );
        await validateLearningCodexProfile(home, false);
        const version = providerCheck(home)[0]!;
        learningAssert(version.ok, version.message);
        const profileRelease = lockLearningDirectory(home);
        try {
          const child = spawn(
            "codex",
            ["login", "-c", 'cli_auth_credentials_store="file"'],
            { env: learningCodexEnvironment(home), stdio: "inherit" },
          );
          const [code] = await once(child, "exit");
          learningAssert(
            code === 0,
            "Codex sign-in did not complete. Rerun login; your notebook was retained.",
          );
        } finally {
          profileRelease();
        }
        return;
      }
      const checks: Check[] = [];
      for (const [file, kind] of [
        ["notebook.sqlite", "notebook"],
        ["conversations.sqlite", "conversations"],
        ["local-provider.sqlite", "local-provider"],
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
        try {
          await validateLearningCodexProfile(home, false);
          checks.push(...providerCheck(home));
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
      const report = {
        release: { ...companionRelease, sourceRevision },
        connection: { origins },
        storage: directory,
        provider: codex ? "Codex" : local ? "Local model" : null,
        ...(localInfo ? { localModel: localInfo, toolMode: local!.tools } : {}),
        checks,
      };
      if (command === "doctor") {
        if (values.json) console.log(JSON.stringify(report, null, 2));
        else {
          console.log(
            `Storage: ${directory}\nPackage ${companionRelease.version}; protocol ${companionRelease.protocol}; notebook/archive schema 1\nAllowed websites: ${origins.join(", ")}`,
          );
          for (const check of checks)
            console.log(
              `${check.ok ? "OK" : "ACTION"} ${check.name}: ${check.message}`,
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
      ...(codex ? { codexHome: home } : {}),
      ...(local ? { local } : {}),
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
