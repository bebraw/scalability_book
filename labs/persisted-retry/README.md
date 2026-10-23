# Persisted retry starter

Implement one receiver function with your own model and harness, then inspect real SQLite records across fresh receiver and worker processes.
The supplied interruption is deliberate: the receiver has committed, but the worker has not recorded completion.
All data and effects are synthetic and local; the code makes no model calls.

## Setup

Use Node 24 or newer, including its built-in `node:sqlite` module.
There are no external dependencies.
From this directory:

```sh
npm ci
npm run preflight
```

Preflight must pass before implementation.
`apply-once.mjs` deliberately throws; all five contract tests and both process cases initially fail.
Those feature failures are separate from missing Node/SQLite support or an occupied manual port.
Read SPEC.md and record a prediction, then give TASK.md to your model.
Use 60–90 minutes as an initial planning limit to calibrate, replacing existing practice time rather than adding a required activity.

## Run and inspect

```sh
npm test
npm run test:process
npm run check
```

The supplied checks reject a duplicate effect, lost receipt, conflicting reuse and a partial write.
The process cases start actual receiver processes, interrupt and restart actual workers, reopen the receiver and inspect both ledgers.
They also demonstrate the negative control: fresh retry keys produce two effects even with a correct receiver guard.
The runner preserves every suite's log and runtime/command/exit/elapsed record under `test-results/evidence/`, continuing after failures.
Process observations are under `test-results/runs/`.
Copy these directories before rerunning to retain both first and final results; the latest run overwrites them.

After implementation, try the same sequence manually.
In one terminal:

```sh
npm start -- --dir .lab-data/stable
```

In another, from this directory:

```sh
npm run worker -- --dir .lab-data/stable --crash-after-effect
npm run inspect -- --dir .lab-data/stable
npm run worker -- --dir .lab-data/stable
npm run inspect -- --dir .lab-data/stable
```

The interrupted worker exits 86 by design; inspect before continuing.
Stop and restart the receiver with the same directory between attempts if you want to exercise both restarts manually.
For a separate negative-control record, use a new directory for both processes, choose a free port with `--port`, pass its loopback URL through worker `--receiver`, and add `--fresh-key` to both worker attempts.
Do not erase an earlier record just to obtain a clean outcome.

Keep the specification, a consequential decision and your explanation in existing project or learning notes.
Passing establishes these local cases, not production exactly-once delivery or measured learning gains.
