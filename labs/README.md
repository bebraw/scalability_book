# Course practice workspace

One setup, four independent exercises.
Choose an exercise that supports the idea you want to investigate; none requires a solution from another folder.
All fixtures are synthetic and local.
Use your own model and coding harness; the exercise code makes no model calls.
Department users can start with the [verified Qwen configuration](#department-model-baseline) below.

## Install once

Use Node 24 or newer.
Unpack `course-workspace.zip`, enter `course-workspace/`, then run:

```sh
npm ci
npm run preflight
npm run lab
```

In the book repository, run these commands from `labs/`.
The root lockfile installs the four npm workspaces together.
Preflight checks only the supplied setup, so it should pass before you implement anything.
Feature checks have the expected starting outcomes listed below.
There is no combined feature-test command: unfinished work in a different exercise must not block yours.

Only CSV and HTTP cache browser checks need Chromium:

```sh
npm run browser:install
```

This browser download is separate from `npm ci` and is unnecessary for mutation or retry.
Preflight does not check an installed browser; the selected browser command reports missing Chromium separately from assertions.

## Choose one exercise

| Exercise                                                         | Change                                      | What to inspect                                                 | Starting feature outcome                                                 |
| ---------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [CSV export](csv-export/README.md)                               | `csv-export/export.mjs`                     | Exact downloaded bytes, including filtered rows                 | Seven contract and two download checks fail; browser baseline passes     |
| [Concern-directed mutation](concern-directed-mutation/README.md) | `concern-directed-mutation/starter.test.ts` | A fault detected while baseline and correct refactor still pass | All five variants pass: the faulty variants survive                      |
| [Persisted retry](persisted-retry/README.md)                     | `persisted-retry/apply-once.mjs`            | Receiver and worker ledgers across process interruption         | Five contract and two process cases fail                                 |
| [HTTP cache](http-cache/README.md)                               | `http-cache/response.mjs`                   | Browser body, origin requests and network 200/304               | Six contract and two browser feature cases fail; browser baseline passes |

Read the selected folder's README, SPEC.md and TASK.md before editing.
The starter task is one function or one black-box test, with its own fixture and checks.
Maintain its specification and record a consequential decision in `decisions/`; reuse and revise useful decisions in later exercises, naming the changed assumptions.
These optional activities replace existing practice time and add no submission or grading criterion.

## Run only the selected exercise

The launcher takes the directory and its command, forwarding any remaining arguments:

```sh
npm run lab -- csv-export start
npm run lab -- csv-export check
npm run lab -- concern-directed-mutation baseline
npm run lab -- concern-directed-mutation authorization-bypass
npm run lab -- concern-directed-mutation storage-refactor
npm run lab -- persisted-retry check
npm run lab -- http-cache check
```

Run these separately as needed.
Stop a manual server before that exercise's browser checks; its README documents ports and overrides.
For example, `npm run lab -- persisted-retry worker --dir .lab-data/trial --crash-after-effect` passes arguments to the worker, relative to `persisted-retry/`.
The launcher returns the selected command's exit status.
A normal assertion failure against the chosen mutant is the intended mutation result; a syntax, setup or import failure is not.
An interrupted retry worker deliberately exits 86.

You can also enter an exercise folder and use its documented commands.
Standalone ZIPs come from these same sources and keep their own lockfiles; run their local setup when using those downloads.
Do not run `npm ci` separately in each folder of the combined workspace.

## Keep evidence and decisions local to the exercise

Record a prediction, the tested contract, model/harness configuration, first result, corrections and final interpretation.
Keep execution records under that exercise's `test-results/`, and retain both the first meaningful failure and the final result.
CSV, retry and cache `check` commands preserve suite logs plus runtime, command, exit status and elapsed time in `test-results/evidence/`.
Those runners overwrite their latest records: copy a run to a named subdirectory before rerunning if you need both.
The mutation launcher prints its selected variant and assertions; preserve that output and the concern/baseline/mutant/refactor evidence table described in its README.

The common vocabulary is a **command**, its **effect**, its **observation** and a **contract** that decides whether it is acceptable.
Shared vocabulary does not imply shared application state: the CSV records, in-memory mutation tracker, retry SQLite files and cache body versions have independent owners.
Passing checks establishes the cases exercised, not general correctness or a model-wide capability result.

After completing individual exercises, optional integration can combine two ideas in a disposable copy or your project.
State the interaction you want to test and preserve the original exercises as baselines; integration is not a prerequisite for the next exercise.

## Department model baseline

**Configuration `aalto-qwen38-27b-2026-10-23`, verified 23 October 2026.**
The department-hosted `Qwen/Qwen3.8-27B-FP8` completed an instructor's bounded input/storage/display coding task with thinking disabled, both as one agent and as a coordinator with two workers.
It is a useful starting configuration for these exercises; the four workspace exercises have not yet been evaluated with that model, and this does not assign the models for the graded course phases.

| Setting                  | Value                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Gateway base URL         | `https://llm-gateway.k8s.aalto.fi/api/v1`                                              |
| Verified inference route | `POST /responses`                                                                      |
| Exact model ID           | `Qwen/Qwen3.8-27B-FP8`                                                                 |
| Authentication           | `Authorization: Bearer <department API key>`; local environment variable `AALTO_KEY`   |
| Native thinking          | Disabled in the request body with `"chat_template_kwargs": {"enable_thinking": false}` |
| Recorded coding context  | 32,768 tokens; compaction threshold 24,000                                             |
| Recorded output limit    | 4,096 tokens per request                                                               |
| Sampling                 | Temperature, top-p and hosted reasoning effort omitted; provider defaults              |

Obtain your own department access through the instructor and use the [gateway documentation](https://llm-gateway.k8s.aalto.fi/docs) for account or service details.
Keep the key in your local environment or an ignored `.env` file containing `AALTO_KEY=your-key`; it does not belong in a prompt, decision record or evidence archive.
The API example below uses the exported key or loads `.env` if present, without evaluating the file as shell code.
It makes one small inference request, so run it only after the instructor confirms your access and allocation:

```sh
node --env-file-if-exists=.env --input-type=module <<'NODE'
if (!process.env.AALTO_KEY) throw new Error("AALTO_KEY is missing");
const response = await fetch("https://llm-gateway.k8s.aalto.fi/api/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.AALTO_KEY}`,
  },
  body: JSON.stringify({
    model: "Qwen/Qwen3.8-27B-FP8",
    input: "Reply with one sentence confirming that you can read this message.",
    max_output_tokens: 128,
    chat_template_kwargs: { enable_thinking: false },
  }),
  signal: AbortSignal.timeout(90000),
});
if (!response.ok) throw new Error(`Department gateway returned HTTP ${response.status}`);
const result = await response.json();
const text = (result.output ?? []).flatMap(item => item.content ?? [])
  .filter(part => part.type === "output_text").map(part => part.text).join("\n");
if (result.status !== "completed" || !text) throw new Error("No completed text response");
console.log(JSON.stringify({ model: result.model, status: result.status, text, usage: result.usage }, null, 2));
NODE
```

This checks access and a text response; the 128-token smoke limit is smaller than the coding limit above.
Before giving a coding harness an exercise, have it read a synthetic marker file, write a byte-identical copy and run a command that verifies equality.
Check the actual file and command result, then retain the harness version, route, settings and first failure if any.
A successful chat response or zero harness exit status alone does not verify tool use.

The recorded coding attempts used Codex CLI 0.154.0 through an instructor-operated Responses proxy and credential bridge, with tool translation and aggregate request accounting.
That private experimental harness is not in this workspace; direct Codex-to-gateway operation and other coding harnesses were not verified by those runs.
For your own harness, confirm that the final provider request carries the exact model ID and thinking setting; a generic "medium reasoning" control is not the recorded setting.
The book's optional learning companion supports loopback local-model endpoints; this hosted route is not a companion configuration.

If access, the requested model or tool use fails, retain the error and contact the instructor.
Continue the local checks or manual work and label it as such; keep the model route fixed until a replacement and its budget are agreed.
The instructor's initial calibration used 20 minutes and 40 requests, while the matched pair used 20 minutes and 80 aggregate requests per condition, including all workers and retries.
These are recorded experiment limits, not an announced departmental quota or a promise of completion.
Server hardware, exact weights, pricing/allocation and maximum usable context were not established; the gateway advertised FP8 and 262,144 context tokens.
The [course tooling record](https://github.com/bebraw/scalability_book/blob/main/docs/course-tooling.md#department-model-configuration) gives the full evidence and limitations.
