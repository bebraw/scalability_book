# Course preparation tooling

This guide owns the operational boundary between the instructor's private audit reference and the optional public workload runner.
The [common specification](../specifications/00_common_project.md) owns course behavior and measurements; this tooling does not prescribe student URLs, storage or architecture.

## Ownership

| Surface                     | Entry point and owner                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public workload tool        | `course-tools/benchmark/cli.mjs`, with fixture/operation definitions in `protocol.mjs` and scheduling/accounting in `runner.mjs`                                        |
| Application adapter         | A separately supplied module exercising the chosen real application, owning reset, response validation, quiescence, reconciliation, checks and resource observations    |
| Private audit application   | Ignored `.local/course-preparation/reference/server.mjs`, composed around one SQLite state owner with shared form/API commands                                          |
| Private preparation records | Ignored `.local/course-preparation/`, including the reference Git repository, archives, adapter, benchmark observations, withheld probes and matched-experiment records |

Dependency direction is runner → adapter contract → actual application; the generic runner has no dependency on reference source.
The reference store has no dependency on generic scheduling or course administration.
No real student records belong in either test path.

## Public runner

See the [runner README](../course-tools/benchmark/README.md) for the method contract and measured boundaries.

```sh
node --test course-tools/benchmark/tests/*.test.mjs
node course-tools/benchmark/cli.mjs /path/to/adapter.mjs /path/to/new-report.json
```

The supplied runner is optional; custom tools must follow the same course protocol.
Its tests exercise reporting with synthetic adapters, not an application performance claim.
Full reference validation needs the actual private app and adapter and is recorded separately.

## Private reference and release

The source is deliberately ignored by the public repository and excluded from all download inputs.
Use the private README for standalone setup, validation, API and ownership instructions.
The local source must have its own full Git revision; the parent book revision does not identify an ignored application.
Archive that frozen commit without `.git`, databases, caches, secrets or generated benchmark evidence, then unpack and validate it in a clean directory.
Keep an instructor-controlled backup of the private source and release packages.

Keep each phase's prompt outside the source archive and give the student only the current package and prompt when its audit window opens.
Do not merge disposable audit-probe solutions into the frozen reference.
Using one codebase for multiple audits creates familiarity, which belongs in the audit record and comparison limitations.

## Matched-experiment preparation

The instructor selected Qwen3.5 9B through LM Studio for the preparation experiment: one agent versus a coordinator with two workers, using Codex CLI on both sides.
Freeze the actual quantization, loaded context, reasoning mode and route after tool-use preflight; a model's advertised maximum context does not establish its loaded context.
The earlier Luna candidate was rejected by the installed CLI's ChatGPT access route before any timed attempt.
Codex documents [local providers](https://learn.chatgpt.com/docs/config-file/config-advanced#oss-mode-local-providers), and LM Studio documents [Responses compatibility](https://lmstudio.ai/docs/developer/openai-compat/responses).
The exact model choice belongs in the run-specific configuration, not a permanent assignment in the course briefs.

Use clean copies of one frozen revision and fresh sessions, the same brief and independent checks, fixed model/routing, tools, intervention policy, and equal predeclared time and aggregate resource limits.
The course's twenty-minute maximum applies to each attempt, and every fleet worker and retry counts toward its aggregate budget.
Record provenance and gaps; supplied observations cannot be presented as measurements of the student's own workflow.
The ordinary coding session and synthetic runner tests do not provide a controlled single-agent/fleet contrast.

## Preparation status — 22 October 2026

The private reference is frozen at its own revision `5d670ae60a7c8a0c4c17a47e74b996c8742ea2d5`.
Its sixteen acceptance checks pass on Node 24.22.1 and 26.12.0, covering all twelve common scenarios, concurrent transition rejection, transactional event-write failure and ordinary restart.
The actual form journey passes in Chromium and WebKit at desktop, tablet and mobile widths.
Three phase packages contain the same frozen source; their manifests retain source and probe digests, release conditions and the repeated-code familiarity limitation.
A clean unpack passes all sixteen checks on Node 24.22.1 without installing dependencies.
These are instructor-prepared packages; no independent timed student audit is claimed.

The generic runner's eighteen checks pass on both runtimes.
The full baseline against the real reference on Node 24.22.1 completed seven repetitions, including warm-up: all 2,200 logical operations were valid, all post-run checks passed, and application-process CPU observations were available.
The report retains actual runtime, hardware, source revision, adapter source digest, raw operations and observations.
An earlier baseline requested Node 24 through `npx` but actually used Node 26; retain it with its observed metadata rather than relabeling it.
These short local runs validate the tooling and reference integration, not production capacity or a runtime-version effect.

Codex CLI 0.154.0 and Qwen3.5 9B Q4_K_M pass local command and two-worker routing checks after clearing an incompatible saved Structured Output schema and reloading the model.
The loaded context is 32,768 tokens, with native reasoning on; hosted-model effort overrides are unset.
The private gateway records original/adapted requests and raw/adapted responses, consolidates instruction messages, translates the collaboration namespace and enforces a shared inference-request cap.
The CLI uses generic metadata for the local alias; the gateway enforces the actual model identity.
Retain setup failures separately from task attempts and record that successful routing does not establish reliable task execution.

The instructor paused the first timed attempt after approximately 7 minutes 50 seconds and 31 inference requests, before the declared 20-minute and 40-request limits.
Its source, observations and failed new-feature checks are retained; the fleet condition was not started.
This is interrupted exploratory evidence, with no completed matched contrast or full-budget failure claim.
The [student discussion proposal](solo-pilot-2026/student-discussion-proposal.md) starts with one ordinary input/storage/display change and adds retry, concurrency and recovery questions in stages.
Resume with a separately identified task, fresh copies and frozen independent checks after discussing scope with the student.
The completed supplied-trace package remains preparation work.
