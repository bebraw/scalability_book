import { createHash } from "node:crypto";
import { learningAssert } from "../../shared/learning-workspace.ts";
import { projectCodexVersion } from "./learning-project-process.ts";

export const projectEndpoint = "https://llm-gateway.k8s.aalto.fi/api/v1";
export const projectPhases = ["establish", "challenge", "compare"] as const;
export type ProjectPhase = (typeof projectPhases)[number];
export const projectPreflightVersion = 1;
// Versioned operational profiles are bundled into the standalone companion.
// Contract checks keep the independently downloadable profiles identical.
const configurations = {
  establish:
    '# Establish configuration aalto-glm-codex-2026-11-16; Codex CLI 0.154.0.\nmodel = "zai-org/GLM-5.3-Flash"\nreview_model = "zai-org/GLM-5.3-Flash"\nmodel_provider = "aalto"\nmodel_context_window = 32768\nmodel_auto_compact_token_limit = 24576\nmodel_reasoning_summary = "none"\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\nallow_login_shell = false\nweb_search = "disabled"\n\n[features]\nmulti_agent = false\napps = false\nplugins = false\nhooks = false\nmemories = false\ngoals = false\nview_image = false\nunbounded_connection_retries = false\n\n[shell_environment_policy]\ninherit = "core"\nignore_default_excludes = false\nfilters = { AALTO_LLM_API_KEY = "exclude", AALTO_KEY = "exclude" }\n\n[model_providers.aalto]\nname = "Aalto GLM"\nbase_url = "https://llm-gateway.k8s.aalto.fi/api/v1"\nenv_key = "AALTO_LLM_API_KEY"\nwire_api = "responses"\nrequires_openai_auth = false\nrequest_max_retries = 0\nstream_max_retries = 0\nstream_idle_timeout_ms = 90000\n',
  challenge:
    '# Challenge configuration aalto-qwen-codex-2026-11-16; Codex CLI 0.154.0.\nmodel = "Qwen/Qwen3.8-27B-FP8"\nreview_model = "Qwen/Qwen3.8-27B-FP8"\nmodel_provider = "aalto"\nmodel_context_window = 32768\nmodel_auto_compact_token_limit = 24000\nmodel_reasoning_effort = "none"\nmodel_reasoning_summary = "none"\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\nallow_login_shell = false\nweb_search = "disabled"\n\n[features]\nmulti_agent = false\nmulti_agent_v2 = false\napps = false\nplugins = false\nhooks = false\nmemories = false\ngoals = false\nview_image = false\nunbounded_connection_retries = false\n\n[agents]\nenabled = false\nmax_concurrent_threads_per_session = 2\nmax_depth = 1\n\n[shell_environment_policy]\ninherit = "core"\nignore_default_excludes = false\nfilters = { AALTO_LLM_API_KEY = "exclude", AALTO_KEY = "exclude" }\n\n[model_providers.aalto]\nname = "Aalto Qwen"\nbase_url = "https://llm-gateway.k8s.aalto.fi/api/v1"\nenv_key = "AALTO_LLM_API_KEY"\nwire_api = "responses"\nrequires_openai_auth = false\nrequest_max_retries = 0\nstream_max_retries = 0\nstream_idle_timeout_ms = 60000\n',
  compare:
    '# Compare configuration aalto-qwen-codex-2026-11-16; Codex CLI 0.154.0.\nmodel = "Qwen/Qwen3.8-27B-FP8"\nreview_model = "Qwen/Qwen3.8-27B-FP8"\nmodel_provider = "aalto"\nmodel_context_window = 32768\nmodel_auto_compact_token_limit = 24000\nmodel_reasoning_effort = "none"\nmodel_reasoning_summary = "none"\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\nallow_login_shell = false\nweb_search = "disabled"\n\n[features]\nmulti_agent = true\nmulti_agent_v2 = false\napps = false\nplugins = false\nhooks = false\nmemories = false\ngoals = false\nview_image = false\nunbounded_connection_retries = false\n\n[agents]\nenabled = true\nmax_concurrent_threads_per_session = 2\nmax_depth = 1\n\n[shell_environment_policy]\ninherit = "core"\nignore_default_excludes = false\nfilters = { AALTO_LLM_API_KEY = "exclude", AALTO_KEY = "exclude" }\n\n[model_providers.aalto]\nname = "Aalto Qwen"\nbase_url = "https://llm-gateway.k8s.aalto.fi/api/v1"\nenv_key = "AALTO_LLM_API_KEY"\nwire_api = "responses"\nrequires_openai_auth = false\nrequest_max_retries = 0\nstream_max_retries = 0\nstream_idle_timeout_ms = 60000\n',
} as const;
export function projectPhase(value: string): ProjectPhase {
  learningAssert(
    projectPhases.includes(value as ProjectPhase),
    "Choose establish, challenge or compare.",
  );
  return value as ProjectPhase;
}
export function projectConfiguration(phase: ProjectPhase) {
  const model =
    phase === "establish" ? "zai-org/GLM-5.3-Flash" : "Qwen/Qwen3.8-27B-FP8";
  const id =
    phase === "establish"
      ? "aalto-glm-codex-2026-11-16"
      : "aalto-qwen-codex-2026-11-16";
  const config = configurations[phase];
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        config,
        harness: projectCodexVersion,
        fixture: projectPreflightVersion,
        platform: process.platform,
        architecture: process.arch,
        node: process.versions.node.split(".")[0],
      }),
    )
    .digest("hex");
  return { phase, model, id, config, digest, fleet: phase === "compare" };
}

/** Codex 0.154.0 appends its own project trust records after a successful run. */
export function matchesProjectConfiguration(actual: string, expected: string) {
  const base = expected.trimEnd();
  if (!actual.startsWith(base)) return false;
  const tail = actual.slice(base.length);
  // Accept only that known runtime state; never ignore arbitrary TOML tables or
  // course-setting changes. The pinned CLI retains the original base text.
  return /^(?:\s*\[projects\."(?:[^"\\\r\n]|\\(?:["\\btnfr]|u[\da-fA-F]{4}|U[\da-fA-F]{8}))*"\]\s*trust_level\s*=\s*"(?:trusted|untrusted)"\s*)*\s*$/.test(
    tail,
  );
}
export function projectPreflight(phase: ProjectPhase, marker: string) {
  const outputs = phase === "compare" ? ["one.txt", "two.txt"] : ["copy.txt"];
  const checker = `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const file of ${JSON.stringify(outputs)}) assert.equal(readFileSync(file, "utf8"), ${JSON.stringify(marker)});
console.log("FILE_COPY_CHECK_PASSED");
`;
  const prompt =
    phase === "compare"
      ? "Spawn exactly two fresh workers with fork_context false and no model or reasoning overrides. Each must execute tools: worker one copies input.txt to one.txt; worker two copies it to two.txt. Tell both not to delegate further or edit the input or checker. Wait for both, close both workers, then run node check.mjs yourself and report the actual result. Do not copy the files yourself or access the network."
      : "Read input.txt and copy its exact bytes to copy.txt. Run node check.mjs and report the actual result. Work alone. Do not edit the input or checker, delegate, access the network, or start another agent.";
  return { outputs, checker, prompt, marker };
}
export function inspectProjectEvents(text: string, phase: ProjectPhase) {
  const events = text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    });
  learningAssert(
    events.length > 0 && events.every(Boolean),
    "The coding agent did not return a complete structured trace. Retain the check files and retry after diagnosing the error.",
  );
  learningAssert(
    events.some((e) => e.type === "turn.completed") &&
      !events.some((e) => e.type === "turn.failed" || e.type === "error"),
    "The coding-agent setup turn did not complete successfully.",
  );
  const commands = events.filter(
    (e) =>
      e.type === "item.completed" &&
      e.item?.type === "command_execution" &&
      e.item.exit_code === 0,
  );
  learningAssert(
    commands.some((e) =>
      String(e.item.aggregated_output).includes("FILE_COPY_CHECK_PASSED"),
    ),
    "The agent did not run the setup checker successfully.",
  );
  const calls = events
    .filter(
      (e) => e.type === "item.completed" && e.item?.type === "collab_tool_call",
    )
    .map((e) => e.item);
  const spawned = calls.filter((e) => e.tool === "spawn_agent");
  if (phase === "compare") {
    const ids = spawned.flatMap((e) => e.receiver_thread_ids ?? []);
    learningAssert(
      spawned.length === 2 &&
        ids.length === 2 &&
        new Set(ids).size === 2 &&
        spawned.every((e) => e.status === "completed"),
      "The fleet setup check needs exactly two distinct successful worker starts.",
    );
    const closed = calls
      .filter((e) => e.tool === "close_agent" && e.status === "completed")
      .flatMap((e) => e.receiver_thread_ids ?? []);
    learningAssert(
      ids.every((id) => closed.includes(id)),
      "The fleet setup check did not close both workers.",
    );
    return { workers: ids };
  }
  learningAssert(
    spawned.length === 0,
    "This phase requires one coding agent; the setup trace contains delegation.",
  );
  return { workers: [] as string[] };
}
