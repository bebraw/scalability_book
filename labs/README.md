# Course practice workspace

One setup, four independent exercises.
Choose an exercise that supports the idea you want to investigate; none requires a solution from another folder.
All fixtures are synthetic and local.
Use your own model and coding harness; the workspace makes no model calls.

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
