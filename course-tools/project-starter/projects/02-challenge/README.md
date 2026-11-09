# Challenge: implementation B

**Workflow:** approved small model, one coding-agent process at a time.

Read the [Challenge brief](https://scalableweb.dev/project/challenge/) and [common contract](https://scalableweb.dev/project/) using the requirement edition assigned to your course run.
The [root walkthrough](../../README.md) explains the first working session; you do not need to fill the entire evidence index before writing code.

## Run the supplied stub

Use Node 24.22.1, pinned in `.nvmrc`.
From this directory:

```sh
node --version
npm test
npm start
```

No dependency installation is needed.
Open <http://127.0.0.1:4177>, then stop the server with Ctrl+C.
For a different port, run `npm start -- 4178`; `PORT` in the environment is also supported.
The tests cover the supplied HTTP stub only, and the page has no Work Activity Tracker behavior or persistence.

If you replace this default, update these instructions with the actual prerequisites, pinned dependencies, configuration, data initialization, run command, and validation command.
Keep a supported path from a clean checkout to the running application.

## Begin the implementation

Check that this directory still matches the original retained starter before beginning.
Start from that original version, not from A's application source, tests, or configuration.
Carry forward only the shared behavioral specification, decision history, and permitted written lessons.

Before implementation, state the architecture hypothesis you want to investigate using A's written lessons.
Build fresh B, repeat the same baseline and primary pressure, and investigate the required bounded correctness or recovery case.

Open this directory as the agent workspace and supply the relevant [shared specification](../../specifications/application.md) and [decisions](../../docs/adrs/README.md).
Follow [the phase instructions](AGENTS.md); shared documents are context, not shared application code.
Use the actual model, route, harness, and budget assigned to this phase.

## Keep evidence as you work

Use [evidence/index.md](evidence/index.md) as the single index for the existing course bundle, linking results rather than creating a separate report for every prompt.
Maintain [architecture.md](architecture.md) as the explanation of this implementation.
The [optional course benchmark runner](https://scalableweb.dev/downloads/project/benchmark-runner.zip) supplies generic scheduling; you still implement the adapter that exercises your real application and persistence path.

At phase freeze, identify the full submitted commit and retain readable snapshots of the shared specification and relevant decision history with your evidence.
Follow the course's staged submission and audit process; add the later audit response without rewriting the original frozen source or results.
Keep private individual work outside this technical bundle.
