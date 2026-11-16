import { parseArgs } from "node:util";
import path from "node:path";
import { existsSync, lstatSync, writeFileSync, realpathSync } from "node:fs";
import {
  learningAssert,
  LearningProblem,
} from "../../shared/learning-workspace.ts";
import {
  learningDataDirectory,
  ensureLearningDirectory,
  lockLearningDirectory,
} from "./learning-storage.ts";
import { learningQuestion, learningShellQuote } from "./learning-setup.ts";
import {
  readLearningApiKey,
  readLearningApiKeyStdin,
  saveLearningApiKey,
  deleteLearningApiKey,
  validateLearningApiKey,
} from "./learning-api-credentials.ts";
import {
  projectEndpoint,
  projectPhase,
  projectConfiguration,
  matchesProjectConfiguration,
  projectPreflight,
  type ProjectPhase,
} from "./learning-project-config.ts";
import {
  sanitizedProjectEnvironment,
  runProjectProcess,
  projectCodexVersion,
} from "./learning-project-process.ts";
import { selectProjectCodex } from "./learning-project-codex.ts";

import {
  regularFile,
  ensureProjectPreflight,
} from "./learning-project-preflight.ts";
import { assertProjectConfigurationBoundary } from "./learning-project-boundary.ts";

const help = `Course project launcher (macOS and Linux)
  scalableweb-companion project [establish|challenge|compare] --workspace <path>
Omit the phase or workspace in a terminal for guided selection.
The launcher prefers an installed stable Codex >=${projectCodexVersion}, with a private
${projectCodexVersion} installation as fallback. It prepares a separate course profile,
checks real file/command access, then opens Codex in your project. Aalto VPN is required.
Establish uses GLM alone; Challenge uses Qwen alone; Compare uses Qwen with up to two workers.
Options:
  --print            Show the configuration and commands without changing files or using a key
  --check            Run the disposable setup check again, without opening the project
  --managed-codex    Use the private pinned CLI even if a suitable Codex is on PATH
  --directory <path> Use this companion data directory; project state is in its -projects sibling
  --api-key-env <name> Read the Aalto key from this environment variable
  --login            Prompt for a replacement key, verify it and save it in the OS keychain
  --with-api-key     Read a key from stdin with --check; verify and save it in the OS keychain
  --forget-key       Remove only the launcher's saved Aalto key, then exit
  --help             Show this help
The existing Aalto key may be reused. No key is written to a profile or command argument.
OpenCode and other harnesses remain welcome under the assigned model and phase rules.`;

function phaseDirectories(root: string, phase: ProjectPhase) {
  const configuration = projectConfiguration(phase);
  return {
    configuration,
    profile: path.join(root, "profiles", `${configuration.id}-${phase}`),
  };
}
function commandText(command: string, args: string[]) {
  return [command, ...args].map(learningShellQuote).join(" ");
}
async function optionalSavedKey(directory: string) {
  try {
    return await readLearningApiKey(directory, projectEndpoint);
  } catch (error) {
    if (
      error instanceof LearningProblem &&
      error.message.startsWith("No API key is saved")
    )
      return undefined;
    throw error;
  }
}

export async function runLearningProjectCli(
  argv: string[],
  defaults: { defaultDirectory?: string } = {},
) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      workspace: { type: "string" },
      directory: { type: "string" },
      check: { type: "boolean" },
      "managed-codex": { type: "boolean" },
      print: { type: "boolean" },
      "api-key-env": { type: "string" },
      login: { type: "boolean" },
      "with-api-key": { type: "boolean" },
      "forget-key": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(help);
    return;
  }
  learningAssert(
    positionals.length <= 1,
    "Supply at most one phase; use project --help.",
  );
  learningAssert(
    !(values.login && values["api-key-env"]) &&
      !(values["with-api-key"] && values["api-key-env"]),
    "Choose a prompted/stdin key or --api-key-env.",
  );
  learningAssert(
    !values["with-api-key"] || values.check,
    "Use --with-api-key only with --check; interactive Codex needs its terminal input.",
  );
  learningAssert(
    !values["api-key-env"] ||
      /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(values["api-key-env"]),
    "Choose a valid --api-key-env variable name.",
  );
  const companionDirectory = path.resolve(
    values.directory ?? defaults.defaultDirectory ?? learningDataDirectory(),
  );
  const root = `${companionDirectory}-projects`;
  if (values["forget-key"]) {
    learningAssert(
      !values.print &&
        !values.check &&
        !values["managed-codex"] &&
        !values.login &&
        !values["with-api-key"] &&
        !values["api-key-env"] &&
        positionals.length === 0 &&
        !values.workspace,
      "Use project --forget-key by itself, optionally with --directory.",
    );
    if (!existsSync(root)) {
      console.log("No launcher-owned Aalto key is saved.");
      return;
    }
    const release = lockLearningDirectory(root);
    try {
      const removed = await deleteLearningApiKey(root, projectEndpoint);
      console.log(
        removed
          ? "Removed the launcher's saved Aalto key."
          : "No launcher-owned Aalto key is saved.",
      );
      console.log(
        "A key saved by the book companion is unchanged and may still be reused.",
      );
    } finally {
      release();
    }
    return;
  }
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  let selected = positionals[0];
  if (!selected) {
    learningAssert(
      interactive || values.print,
      "Choose a phase: project establish, project challenge or project compare.",
    );
    selected = values.print
      ? "establish"
      : (
          await learningQuestion(
            "Phase: 1 Establish, 2 Challenge, 3 Compare [1]: ",
          )
        ).trim() || "1";
    selected =
      (
        { "1": "establish", "2": "challenge", "3": "compare" } as Record<
          string,
          string
        >
      )[selected] ?? selected;
  }
  const phase = projectPhase(selected);
  let selectedWorkspace = values.workspace;
  if (!selectedWorkspace && interactive && !values.print)
    selectedWorkspace =
      (
        await learningQuestion(`Project directory [${process.cwd()}]: `)
      ).trim() || process.cwd();
  selectedWorkspace ??= process.cwd();
  learningAssert(
    existsSync(selectedWorkspace) &&
      lstatSync(realpathSync(selectedWorkspace)).isDirectory(),
    "Choose an existing project directory with --workspace.",
  );
  const workspace = realpathSync(selectedWorkspace);
  const { configuration, profile: managedProfile } = phaseDirectories(
    root,
    phase,
  );
  const managedEntry = path.join(
    root,
    "tools",
    `codex-${projectCodexVersion}`,
    "node_modules",
    "@openai",
    "codex",
    "bin",
    "codex.js",
  );
  const environmentName =
    values["api-key-env"] ??
    (process.env.AALTO_LLM_API_KEY ? "AALTO_LLM_API_KEY" : undefined);
  console.log(
    `\n${phase[0]!.toUpperCase() + phase.slice(1)}: ${configuration.model}\nAalto: ${projectEndpoint}\nProject: ${workspace}\nAgents: ${configuration.fleet ? "coordinator and at most two workers" : "one"}\nCodex selection: ${values["managed-codex"] ? `private pinned ${projectCodexVersion}` : `installed stable >=${projectCodexVersion}, otherwise private pinned ${projectCodexVersion}`}\nPrivate course profiles, checks and traces: ${root}`,
  );
  if (values.print) {
    console.log(
      `\nSelection on a real run: ${values["managed-codex"] ? "skip PATH discovery and use the private installation" : `resolve the first executable codex on PATH and run its --version without the model key; accept a stable version >=${projectCodexVersion} for the phase check`}.\nNo executable is probed by --print. The actual path, version and source are shown when selected; an existing installation is never updated.`,
    );
    console.log(
      `\nManaged fallback installation when needed:\nnpm install --prefix ${learningShellQuote(path.join(root, "tools", `codex-${projectCodexVersion}`))} --ignore-scripts --no-audit --no-fund --save-exact --registry=https://registry.npmjs.org @openai/codex@${projectCodexVersion}`,
    );
    console.log(
      `\nManaged project command:\nCODEX_HOME=${learningShellQuote(managedProfile)} ${commandText(process.execPath, [managedEntry, "--strict-config", "--cd", workspace])}`,
    );
    if (!values["managed-codex"])
      console.log(
        `\nInstalled project command (paths and version resolved on a real run):\nCODEX_HOME=${learningShellQuote(`${managedProfile}-installed-<version>`)} ${commandText("<absolute-codex-on-PATH>", ["--strict-config", "--cd", workspace])}`,
      );
    console.log(
      `\nFirst-use setup command (generated files stay outside your project):\nCODEX_HOME='<selected-course-profile>' ${commandText("<selected-codex-command>", ["exec", "--strict-config", "--skip-git-repo-check", "--json", "--cd", "<disposable-check-directory>", projectPreflight(phase, "<generated-marker>").prompt])}\nThe launcher independently checks the output files, unchanged inputs and recorded tool results before caching a pass for that exact executable and version.`,
    );
    console.log(`\nProfile contents:\n${configuration.config}`);
    return;
  }
  learningAssert(
    values.check || interactive,
    "Opening Codex needs an interactive terminal. Use --check for a setup check only, or --print to inspect the commands.",
  );
  assertProjectConfigurationBoundary(workspace);
  ensureLearningDirectory(root);
  const release = lockLearningDirectory(root);
  try {
    const probeProfile = path.join(root, "harness-probe");
    ensureLearningDirectory(probeProfile);
    const installerEnv = sanitizedProjectEnvironment();
    if (environmentName) delete installerEnv[environmentName];
    const installation = new AbortController();
    const cancelInstallation = () => installation.abort();
    process.once("SIGINT", cancelInstallation);
    process.once("SIGTERM", cancelInstallation);
    let codex: Awaited<ReturnType<typeof selectProjectCodex>>;
    try {
      codex = await selectProjectCodex({
        directory: path.join(root, "tools"),
        profile: probeProfile,
        forceManaged: Boolean(values["managed-codex"]),
        env: installerEnv,
        signal: installation.signal,
        log: (message) => console.log(message),
      });
      learningAssert(
        !installation.signal.aborted,
        "Project setup was cancelled; no coding session was opened.",
      );
    } finally {
      process.removeListener("SIGINT", cancelInstallation);
      process.removeListener("SIGTERM", cancelInstallation);
    }
    const profile =
      codex.source === "installed"
        ? `${managedProfile}-installed-${codex.version}`
        : managedProfile;
    ensureLearningDirectory(path.join(root, "profiles"));
    ensureLearningDirectory(profile);
    const filename = path.join(profile, "config.toml");
    if (existsSync(filename))
      learningAssert(
        matchesProjectConfiguration(
          regularFile(filename),
          configuration.config,
        ),
        `The retained phase profile was changed. It has not been overwritten. Review ${filename} against project --print before restoring this version, or keep your custom harness outside the managed profile.`,
      );
    else
      writeFileSync(filename, configuration.config, {
        flag: "wx",
        mode: 0o600,
      });
    console.log(
      `\nSelected Codex ${codex.version} (${codex.source}): ${codex.command}\nCourse profile: ${filename}\nProject command:\nCODEX_HOME=${learningShellQuote(profile)} ${commandText(codex.command, [...codex.args, "--strict-config", "--cd", workspace])}\nThe Aalto key is supplied only in Codex's environment; its value is never printed.`,
    );
    let key: string | undefined,
      newKey = false;
    if (values["with-api-key"]) {
      key = await readLearningApiKeyStdin();
      newKey = true;
    } else if (values.login) {
      learningAssert(
        interactive,
        "Use --login in a terminal for a hidden key prompt, or --with-api-key --check for stdin.",
      );
      key = validateLearningApiKey(
        (
          await learningQuestion(
            "Replacement Aalto API key (hidden; saved after a successful check): ",
            true,
          )
        ).trim(),
      );
      newKey = true;
    } else if (environmentName) {
      key = await readLearningApiKey(root, projectEndpoint, environmentName);
      console.log(`Using the Aalto key from ${environmentName}.`);
    } else {
      key =
        (await optionalSavedKey(root)) ??
        (await optionalSavedKey(companionDirectory));
      if (key) console.log("Using the saved Aalto key from the OS keychain.");
      else {
        learningAssert(
          interactive,
          "No Aalto key is saved. Run project in a terminal, or supply --api-key-env for --check.",
        );
        key = validateLearningApiKey(
          (
            await learningQuestion(
              "Aalto API key (hidden; saved in your OS keychain after the setup check): ",
              true,
            )
          ).trim(),
        );
        newKey = true;
      }
    }
    const env = {
      ...sanitizedProjectEnvironment(),
      CODEX_HOME: profile,
      AALTO_LLM_API_KEY: key,
    };
    if (environmentName && environmentName !== "AALTO_LLM_API_KEY")
      delete (env as Record<string, string>)[environmentName];
    try {
      await ensureProjectPreflight({
        root,
        phase,
        profile,
        codex,
        env,
        force: Boolean(values.check || newKey),
      });
    } catch (error) {
      if (codex.source === "installed" && error instanceof LearningProblem)
        throw new LearningProblem(
          `${error.message}\nIf this installed Codex version is incompatible, rerun with --managed-codex for the tested ${projectCodexVersion} fallback. The failed check was retained; no alternate run was started.`,
        );
      throw error;
    }
    if (newKey) {
      await saveLearningApiKey(root, projectEndpoint, key);
      console.log("Saved the verified Aalto key in your OS keychain.");
    }
    if (values.check) return;
    assertProjectConfigurationBoundary(workspace);
    console.log(
      "\nOpening Codex with the course profile. Project AGENTS.md instructions still apply; review the selected model and file changes. Use /exit to leave the agent. The book companion can stay open.",
    );
    const result = await runProjectProcess({
      command: codex.command,
      args: [...codex.args, "--strict-config", "--cd", workspace],
      cwd: workspace,
      env,
      stdio: "inherit",
    });
    process.exitCode = result.code ?? (result.signal ? 130 : 1);
  } finally {
    release();
  }
}
