# Challenge and Compare setup: Aalto Qwen and Codex

**Configuration `aalto-qwen-codex-2026-11-16` — 16 November 2026.**

This is a supported starting option for students who have not used a coding agent before.
You may use OpenCode or another preferred harness with the assigned model and phase rules; record its actual configuration and run the same kind of file, command and coordination checks before substantive work.
Only the Codex configuration below was verified here.
The [Establish guide](aalto-glm-codex-2026-11-16.md) uses GLM; this guide uses `Qwen/Qwen3.8-27B-FP8` directly through Aalto for Challenge and Compare.
The book's optional teaching assistant currently provides study help, not project file editing or command execution.

The companion's prepared [guided project launcher](../learning-companion-setup.md#start-a-course-coding-project) automates the setup below.
It is not yet in published companion 0.3.1; use a locally built package or, from this repository, `npm run companion -- project challenge --workspace /path/to/projects/02-challenge`.
Use `compare` and the fresh `03-compare` directory for Compare.
The command selects the phase profile, checks it in a disposable directory and launches Codex; `--print` shows the plan without running it and `--check` repeats only the setup check.
The manual instructions below remain available for the published package and other harness arrangements.

## 1. Install once and select the phase

Use the starter's Node.js version, currently 24.22.1, and Aalto VPN.
If you followed the Establish setup, keep the same Codex installation:

```sh
npm install --global @openai/codex@0.154.0
codex --version
```

Expect `codex-cli 0.154.0`.
Create a separate profile for the phase you are starting:

```sh
# For Challenge:
export AALTO_CODEX_PROFILE="$HOME/.local/share/scalableweb-challenge-2026-11-16"
# For Compare, use this instead:
# export AALTO_CODEX_PROFILE="$HOME/.local/share/scalableweb-compare-2026-11-16"
mkdir -p "$AALTO_CODEX_PROFILE"
```

Save the appropriate file below as `config.toml` inside that directory.
Check an existing profile before replacing it.

| Phase       | Configuration                                                   | Arrangement                                                                    |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Challenge B | [Challenge profile](aalto-qwen-codex-2026-11-16.challenge.toml) | One agent, native delegation disabled                                          |
| Compare C   | [Compare profile](aalto-qwen-codex-2026-11-16.compare.toml)     | One coordinator and at most two concurrent workers, with no further delegation |

Both use the same Qwen model, provider, context limits and reasoning setting.
Keep your operating-system `HOME` unchanged; `CODEX_HOME` selects the course profile only.
These settings control native delegation; a shell could still launch another agent.
Challenge must use one agent, and all phases must follow the assigned model and coordination rules even when local settings can be overridden.
Codex can discover global skills, including `~/.agents/skills`; record material additions and do not use them to change the model route or phase arrangement.

Supply the instructor-provided key through `AALTO_LLM_API_KEY` in the launching terminal.
Reuse it if it is already exported; otherwise follow the [hidden key-entry instructions](aalto-glm-codex-2026-11-16.md#2-create-a-course-profile).
No ChatGPT subscription or personal provider payment is required.
The configuration contains no credential and excludes the key from ordinary shell-tool environments.

## 2. Check files and commands

Create a disposable directory and an independent checker:

```sh
export AALTO_PREFLIGHT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aalto-qwen-preflight.XXXXXX")"
printf 'Aalto Qwen preflight, revision 1\n' > "$AALTO_PREFLIGHT_DIR/input.txt"
cat > "$AALTO_PREFLIGHT_DIR/check.mjs" <<'JS'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const expected = "Aalto Qwen preflight, revision 1\n";
const files = process.argv[2] === "fleet" ? ["one.txt", "two.txt"] : ["copy.txt"];
for (const file of files) assert.equal(readFileSync(file, "utf8"), expected);
console.log("FILE_COPY_CHECK_PASSED");
JS
```

For **Challenge**, run:

```sh
CODEX_HOME="$AALTO_CODEX_PROFILE" codex exec \
  --strict-config --skip-git-repo-check --json \
  --cd "$AALTO_PREFLIGHT_DIR" \
  "Read input.txt and copy its exact bytes to copy.txt. Run node check.mjs and report the actual result. Work alone. Do not edit the input or checker, delegate, access the network, or start another agent." \
  > "$AALTO_PREFLIGHT_DIR/events.jsonl"
```

For **Compare**, use the Compare profile and run:

```sh
CODEX_HOME="$AALTO_CODEX_PROFILE" codex exec \
  --strict-config --skip-git-repo-check --json \
  --cd "$AALTO_PREFLIGHT_DIR" \
  "Spawn exactly two fresh workers with fork_context false and no model or reasoning overrides. Each must execute tools: worker one copies input.txt to one.txt; worker two copies it to two.txt. Tell both not to delegate further or edit the input or checker. Wait for both, close both workers, then run node check.mjs fleet yourself and report the actual result. Do not copy the files yourself or access the network." \
  > "$AALTO_PREFLIGHT_DIR/events.jsonl"
```

Then run the checker yourself in that directory: `node check.mjs` for Challenge, or `node check.mjs fleet` for Compare.
Expect `FILE_COPY_CHECK_PASSED` with exit status zero, unchanged input/checker files and real command results in the trace.
For Compare, also confirm two worker identities, separate task results and closure of both workers.
A successful CLI exit or a fluent reply alone is insufficient.

## 3. Start the project

Keep the selected profile and exported key in the terminal, enter `projects/02-challenge` or `projects/03-compare`, and launch:

```sh
CODEX_HOME="$AALTO_CODEX_PROFILE" codex --strict-config
```

Confirm model `Qwen/Qwen3.8-27B-FP8` and provider `aalto`.
Use one session for Challenge.
For Compare, give the coordinator bounded tasks with distinct file ownership, named outputs and an integration check; workers inherit the same model and settings when no overrides are supplied.
The coordinator must review their outputs and run the integrated checks.
Use the starter's [first working session](../../course-tools/project-starter/README.md#your-first-working-session), shared specifications and decision log while preserving each phase's fresh implementation.

Workers share the project directory.
File assignments organize collaboration; they do not isolate workers from each other's files.
The profile uses workspace-write permissions and on-request approvals, not independent worker sandboxes or worktrees.
Review broader access requests and file changes before accepting them.
For active work, explicitly stop or close every worker as well as the coordinator and verify that its commands have stopped.
Stopping generation does not undo completed edits or guarantee cancellation of work already accepted by the model service.

## Usage, traces and help

Use the shared departmental infrastructure considerately: keep tasks bounded, stop unproductive work and avoid unattended retry loops or excessive parallelism.
Automatic request and stream retries are disabled.
The Compare profile permits at most three active agents including the coordinator; this is a concurrency setting, not a token quota.
Use synthetic project data and keep keys and private personal records out of prompts and public reports.
On service failure, retain the error and partial work, continue local checks or recorded manual work, and seek help rather than silently switching models or buying access.

Retain the configuration ID, actual harness/version, setup result, meaningful failures, corrections and deviations in the phase evidence index.
`events.jsonl` contains command and coordination events; private session records are under `$AALTO_CODEX_PROFILE/sessions/`.
Keep the coordinator and worker records together so their parent, thread, turn and response identifiers remain attributable.
For token totals, sum unique per-response usage records across all those threads: the coordinator's final `turn.completed.usage` is not the fleet total.
Report missing usage for interrupted requests as unknown; do not count it as zero.
These records contain project content and local paths, so export a selected, redacted record rather than the whole profile.

Report general problems at [the book issue tracker](https://github.com/bebraw/scalability_book/issues), with configuration, versions, error and a small synthetic reproduction.
Keep personal notes private; use the instructor's existing private channel for access-specific questions and the agreed coursework submission route for deliverables.
The [Establish troubleshooting notes](aalto-glm-codex-2026-11-16.md#troubleshooting) also apply to VPN, authentication, generic model metadata and missing tool results here.

## Verification and limits

The verification used macOS, Node 24.22.1 and Codex CLI 0.154.0 with fresh profiles and disposable synthetic workspaces.
Noninteractive repair and cancellation probes used `approval_policy="never"`; the supplied student profiles use `on-request`.
The exact student profiles, prompts and checker above were then exercised separately: Challenge passed in 10.0 seconds and Compare in 53.6 seconds, with two worker results and closure, unchanged inputs and independently checked output files.
Both connect directly to `https://llm-gateway.k8s.aalto.fi/api/v1` through the Responses API, with no compatibility proxy or provider fallback.
The model's exact weight revision is unavailable.
Aalto advertises FP8 and a 262,144-token context; the client explicitly uses 32,768 tokens and a 24,000-token compaction threshold, without claiming a large-context test.

`model_reasoning_effort="none"` sends the standard Responses reasoning setting.
The API probe and completed coding responses reported zero reasoning tokens.
This is a separately tested direct configuration; it does not establish equivalence to the [October private proxy experiment](../course-tooling.md#department-model-configuration), which explicitly injected `chat_template_kwargs.enable_thinking=false`.
The [pinned Codex schema](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/config.schema.json) has no general request-body override for that native flag.

| Check                       | Observed result                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-agent repair         | Initial assertion failed, only the allowed implementation changed, independent checks passed in 56.7 seconds                                       |
| Coordinator and two workers | Two attributed workers edited their assigned files, both closed, coordinator and independent checks passed in 92.1 seconds                         |
| Single-agent reported usage | 7 completed responses, 52,051 input and 970 output tokens, zero reported reasoning tokens                                                          |
| Fleet reported usage        | 18 completed responses across all three agents, 154,332 input and 2,852 output tokens, zero reported reasoning tokens                              |
| Protected inputs            | Specifications and independent checker unchanged in both repair runs                                                                               |
| Active-worker cancellation  | Closing a running worker interrupted its pending command; the process was gone and its delayed marker absent after the original 45-second deadline |

The tasks were small compatibility checks, not matched performance comparisons or evidence of completing the course application.
The direct API probe returned the exact requested Qwen identifier; Codex session records identify the configured model/provider, which alone does not independently attest backend weights.
Codex emitted generic-model-metadata and global-skill truncation warnings; these remain in the retained evidence.
The cancellation probe also retained a coordinator poll using an invalid process identifier before recovery; the actual worker's pending poll was interrupted.
Its completed-response usage is a lower bound if any interrupted request lacked a usage record.
This verifies one local command cancellation, not upstream inference cancellation or every descendant-process case.
Private verification inputs, traces and checks are under `.local/course-preparation/aalto-qwen-2026-11-16/`.
