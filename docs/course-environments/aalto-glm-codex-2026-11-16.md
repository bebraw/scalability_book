# Establish coding-agent setup: Aalto GLM and Codex

**Configuration `aalto-glm-codex-2026-11-16` — 16 November 2026.**

Use this setup for the November 2026 pilot's Establish implementation A.
It is a supported beginner option; students already using OpenCode or another harness may keep it with the assigned model and phase rules, a recorded configuration and a successful tool-use check.
The model runs at Aalto; Codex CLI runs on your computer and edits your project.
You need Aalto VPN, the instructor-provided departmental API key, Node.js and Codex CLI 0.154.0.
You do not need to host the model, clone the book repository, sign in to ChatGPT or install the book's learning companion.
The optional [book assistant](../learning-companion-setup.md) has its own setup and profile.

The companion now has a prepared [guided project launcher](../learning-companion-setup.md#start-a-course-coding-project) that automates installation, this profile, secure key entry, the setup check and launch.
It is not yet in the published 0.3.1 package; use a locally built package or the source command until the next release.
From this repository, run `npm run companion -- project establish --workspace /path/to/projects/01-establish`.
Use `project establish --print` to inspect the plan without downloading, reading credentials or changing files.
The steps below remain the transparent manual setup for students using the published package or managing their harness themselves.

## 1. Install the coding agent

Use the Node version supplied with your project starter; its current baseline is Node 24.22.1.
In your terminal, install the pinned CLI and check the version:

```sh
npm install --global @openai/codex@0.154.0
codex --version
```

The output should identify `codex-cli 0.154.0`.
Record any different version and repeat the setup check before using a changed harness.

## 2. Create a course profile

Create a dedicated directory for this configuration:

```sh
export AALTO_CODEX_PROFILE="$HOME/.local/share/scalableweb-establish-2026-11-16"
mkdir -p "$AALTO_CODEX_PROFILE"
```

Save [the accompanying configuration](aalto-glm-codex-2026-11-16.config.toml) as `config.toml` inside that directory.
Keep the configuration unchanged for this version; if the directory already contains a profile, compare it before replacing anything.
The file names the exact Aalto provider and model and contains no credential.
This profile is separate from both your ordinary Codex settings and the learning companion's profile.
Keep your operating-system `HOME` unchanged; the launch command selects only `CODEX_HOME`.

Connect to Aalto VPN and supply the instructor-provided key through `AALTO_LLM_API_KEY` in this terminal.
If you have already set that variable, keep using it.
For macOS's default zsh, these commands prompt without displaying the key or placing its value in shell history:

```sh
read -rs 'AALTO_LLM_API_KEY?Aalto API key: '
printf '\n'
export AALTO_LLM_API_KEY
```

In Bash, use `read -rsp 'Aalto API key: ' AALTO_LLM_API_KEY` for the first line instead.
The key belongs in your local environment, not in `config.toml`, a prompt, a screenshot or an issue report.
The Codex process uses it for gateway authentication; the supplied configuration excludes it from ordinary shell-tool environments.
This does not make credentials stored elsewhere on your computer inaccessible to every program.

## 3. Check an actual file operation

Start with a disposable directory, so setup problems do not affect your application.
Create a small input and an independent checker:

```sh
export AALTO_PREFLIGHT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aalto-glm-preflight.XXXXXX")"
printf 'Aalto GLM preflight, revision 1\n' > "$AALTO_PREFLIGHT_DIR/input.txt"
cat > "$AALTO_PREFLIGHT_DIR/check.mjs" <<'JS'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
assert.equal(readFileSync("copy.txt", "utf8"), "Aalto GLM preflight, revision 1\n");
console.log("FILE_COPY_CHECK_PASSED");
JS
```

Run the agent with the course profile and retain its structured output:

```sh
CODEX_HOME="$AALTO_CODEX_PROFILE" codex exec \
  --strict-config --skip-git-repo-check --json \
  --cd "$AALTO_PREFLIGHT_DIR" \
  "Read input.txt. Write an exact copy to copy.txt. Run node check.mjs and report its actual result. Do not edit input.txt or check.mjs, delegate, access the network, or start another agent." \
  > "$AALTO_PREFLIGHT_DIR/events.jsonl"
```

Then check the result yourself:

```sh
cd "$AALTO_PREFLIGHT_DIR"
node check.mjs
```

Expect `FILE_COPY_CHECK_PASSED` and an exit status of zero.
Inspect `events.jsonl`: it should show an actual command and its result, followed by a completed turn.
Keep the original input and checker unchanged.
A fluent reply or a successful CLI exit alone does not establish that the file operation happened.
This check establishes basic file and command access, not completion of the course application.

## 4. Start implementation A

Open your project's `projects/01-establish` directory and start one interactive session:

```sh
export AALTO_CODEX_PROFILE="$HOME/.local/share/scalableweb-establish-2026-11-16"
cd /path/to/your/project/projects/01-establish
CODEX_HOME="$AALTO_CODEX_PROFILE" codex --strict-config
```

The API key must also be available in this terminal.
Confirm the selected model is `zai-org/GLM-5.3-Flash` with provider `aalto`.
Use the starter's [first working session](../../course-tools/project-starter/README.md#your-first-working-session) to choose one bounded application task.
Supply the shared specification and decision context deliberately; keep sibling implementation source outside the task.
Review file changes and run the acceptance checks yourself before accepting the result.

The profile disables Codex's native multi-agent tools, plugins, apps and web search.
Use one coding-agent session at a time; do not launch another agent through a shell command or override the assigned model.
The profile is a supported configuration, not a tamper-proof restriction on your computer.
Codex can still discover globally installed skills, including `~/.agents/skills`; record any that affect the work and do not use a skill to delegate or change the model route.
Project settings and local requirements can affect permissions, so record material deviations from the supplied configuration.

Shell commands run with workspace-write permissions and no login-shell initialization.
Approve a request for wider access only when it is needed for the stated project task and you understand its effect.
If Node or another command is missing, make it available on the launching terminal's `PATH`; do not solve that by changing the model or enabling unrestricted execution.

## Usage, evidence and help

There is **no fixed GLM usage quota for this pilot**.
Use common sense: the model runs on shared departmental infrastructure.
Keep tasks bounded, stop unproductive runs and avoid parallel agents, retry loops or unattended load generation.
This course arrangement is not a guarantee of unlimited capacity or availability.
Automatic request and stream retries are disabled; inspect a failure before retrying manually.

Use the provided departmental access; no personal subscription or unannounced personal spending is required by this setup.
Record actual usage when exposed, including corrections and manual retries; a missing departmental billing conversion is not evidence of zero resource cost.
Use synthetic project data and keep credentials and private personal records out of model prompts and public reports.
If the assigned service is unavailable, retain the error and continue local checks or clearly recorded manual work while seeking help.
Do not silently substitute a model or paid provider.

Report general book, starter and setup problems at [the book's issue tracker](https://github.com/bebraw/scalability_book/issues).
Include the configuration ID, CLI and operating-system versions, command, error and a small synthetic reproduction.
Keep personal notes and detailed evidence private; remove keys, private project content and personal details from public reports.
Access-specific questions go to the instructor through your existing private channel.
The issue tracker is not a coursework submission destination; use the submission arrangement agreed with the instructor.

In implementation A's evidence index, link this exact configuration version and confirm the model, route and harness actually used.
Keep the setup result, meaningful first failures, corrections and any configuration deviations.
`codex exec --json` produces the structured events used above; CLI 0.154.0 also retains session records below `$AALTO_CODEX_PROFILE/sessions/`.
Review and select relevant commands and outcomes before sharing evidence rather than publishing the entire profile or an unchecked transcript.

## Troubleshooting

- **Host cannot be resolved or reached:** confirm Aalto VPN and network access from the same terminal.
  A tool sandbox can block networking even when another client reaches the gateway.
- **Missing API key or authentication failure:** confirm that `AALTO_LLM_API_KEY` is exported in the terminal starting Codex and that the instructor-provided key is current.
  Do not paste it into a diagnostic prompt.
- **`Model metadata ... not found`:** Codex 0.154.0 does not ship metadata for this GLM identifier.
  The verified run used generic client metadata with the explicit context limits below.
  This warning does not mean a different model was selected; retain it with your evidence.
- **Unexpected provider, model, delegation tools or settings:** stop and check the course profile, local overrides and actual CLI version before continuing.
- **HTTP error or interrupted reply:** retain the first error and partial work.
  Check the selected endpoint and service status before a manual retry; do not change providers automatically.
- **Text response but no file or command result:** treat setup as incomplete.
  Keep the trace and report the smallest failing task.

## Retained technical configuration

This record instantiates the existing [course environment publication rule](../../specifications/course_environment.md) and [ADR-051](../adrs/implemented/ADR-051-reference-versioned-course-configurations-in-student-evidence.md).
Keep this dated configuration available when introducing a replacement.
This technical profile applies to Establish; the [course environment sheet](../../specifications/course_environment.md#november-2026-pilot-model-assignments-and-setup) records the separate Qwen assignments for Challenge and Compare.
Changing this profile's model name alone does not reproduce the earlier Qwen verification, which used a private proxy and native thinking disabled.
The assignments do not change an existing requirement edition.

| Field                         | Value                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model and phase               | `zai-org/GLM-5.3-Flash`, assigned large-model route for Establish                                                                                                   |
| Model revision and size basis | Exact weights/revision and parameter count unavailable from the checked gateway metadata; large/small is a course assignment, not a measured capability ranking     |
| Gateway and protocol          | `https://llm-gateway.k8s.aalto.fi/api/v1`, Responses API                                                                                                            |
| Harness                       | Codex CLI 0.154.0, one agent, native delegation disabled                                                                                                            |
| Authentication                | Instructor-provided API key in `AALTO_LLM_API_KEY`, with Aalto VPN                                                                                                  |
| Client context                | 32,768 tokens; automatic compaction threshold 24,576; long-context/compaction behavior not verified by the bounded checks                                           |
| Gateway-advertised context    | 1,048,576 tokens; this is metadata, not a context length exercised by these checks                                                                                  |
| Thinking and generation       | Provider-native thinking and generation defaults; Codex reasoning summaries disabled, which does not disable GLM's native thinking; no custom temperature or top-p  |
| Retries                       | No automatic request/stream retries or unbounded reconnection                                                                                                       |
| Tool environment              | Workspace-write sandbox, user approval for requested wider access, login shells disabled, core environment with credential-name exclusions                          |
| Routing and fallback          | Exact provider/model configured, same model for review; on service failure retain evidence and use manual work/support, with no automatic provider substitution     |
| Usage and cost                | No fixed pilot quota; considerate shared-service use; departmental access, no required personal spending; billing units/conversion not established by the preflight |
| Data boundary                 | Project code and deliberately supplied context go to the Aalto gateway; use synthetic data                                                                          |

See [Aalto's service documentation](https://scicomp.aalto.fi/aalto/llm-web-apis/) for its current access and logging description.

## Instructor verification and limits

On 16 November 2026, the gateway advertised the exact model for Chat Completions, Responses and Messages.
Both a Chat Completions request and a Responses request completed and returned the requested model identifier.
Direct Codex-to-gateway verification used macOS ARM64, Codex CLI 0.154.0 and Node 26.13.0; other operating systems were not verified in this check.

- A synthetic file-copy task produced the expected bytes and executed an independent checker in about 7.4 seconds.
- A separate repair task first recorded three failures and one pass, changed only the implementation, then passed all four existing tests in about 8.6 seconds; an independent rerun also passed.
- With native delegation disabled, the repair run reported that no delegation tool was available and completed without a child-agent call.
- An intentionally unavailable path on the same Aalto gateway returned HTTP 405 and ended the turn with failure instead of a successful fallback.
- An earlier attempt inside a network-restricted execution environment failed DNS/network access and reached its 180-second time bound without producing the output.
  That failure is retained separately from the network-enabled success.

These checks establish a bounded coding workflow, not whole-project quality, service reliability, arbitrary prompt resistance or long-session behavior.
The exact accompanying student configuration also passed the documented copy/check task with the starter's Node 24.22.1 runtime in about 14.4 seconds.
The input and checker remained unchanged, and the final output matched the expected bytes.
That run retained two rejected patch commands and an extra-newline mismatch before the agent corrected its approach and passed the checker; the successful final result does not erase those earlier failures.
Raw instructor fixtures and traces stay under ignored `.local/course-preparation/aalto-glm-2026-11-16/` and temporary synthetic workspaces.
They are not student records or a dependency needed to use this guide.

Configuration behavior is described in OpenAI's [configuration reference](https://developers.openai.com/codex/config-reference/) and [custom-provider guide](https://developers.openai.com/codex/config-advanced/#custom-model-providers).
The pinned, tested version above governs this record when current product documentation changes.
