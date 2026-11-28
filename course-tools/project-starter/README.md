# Three-project starter

Start with Establish, then build the same Work Activity Tracker afresh in Challenge and Compare.
This optional starter supplies a runnable page, a setup check, and places to keep specifications, decisions, and evidence.
It does not implement the course application.

## Start here

1. Unpack the starter into a directory you own and keep the original ZIP unchanged outside your working repository.
   The download's `starter-manifest.json` records source and contract revisions, working-tree changes, and file hashes.
   Keep it with your evidence; if a dirty flag is true, the named Git revision alone does not reproduce that draft download.
   When starting from a source checkout instead, record its full commit and any uncommitted starter changes before editing.
2. Read the [project introduction](https://scalableweb.dev/project/introduction/), [common contract](https://scalableweb.dev/project/), and [Establish brief](https://scalableweb.dev/project/establish/).
   Record the requirement edition assigned to your course run in [the shared specification](specifications/application.md).
   The starter's contract revision identifies its preparation context; the instructor's assigned edition remains authoritative.
3. Install the Node version in `projects/01-establish/.nvmrc` (24.22.1) using your preferred installer or version manager.
   Node includes npm; no package installation, account, container, model, or API key is needed to run this stub.
4. In a terminal opened at the starter root, run:

   ```sh
   cd projects/01-establish
   node --version
   npm test
   npm start
   ```

   Open <http://127.0.0.1:4177> and confirm that the starter page loads.
   Stop the server with Ctrl+C.
   `npm test` checks the supplied HTTP stub only; passing it does not establish any Work Activity Tracker behavior.
   For a downloaded copy, install Git if needed and initialize your own repository from the extracted starter root before changing the stub:

   ```sh
   cd ../..
   git init
   git add .
   git commit -m "Start three fresh course projects"
   ```

   This records your pristine baseline; retain the original ZIP as well.
   No hosted Git account is needed for these local commands.

5. Before AI-assisted project work, obtain your run's published model and harness assignment from the instructor through the [course environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md).
   New users can follow the [Aalto GLM and Codex setup guide](https://github.com/bebraw/scalability_book/blob/main/docs/course-environments/aalto-glm-codex-2026-11-16.md) for Establish, including a small file-and-command check before application work.
   The [Aalto Qwen guide](https://github.com/bebraw/scalability_book/blob/main/docs/course-environments/aalto-qwen-codex-2026-11-16.md) supplies the later Challenge and Compare profiles.
   The [companion setup guide](https://scalableweb.dev/notebook/setup/) records the guided project launcher's release status; when available in your installed version, `scalableweb-companion project` guides you through phase, directory, key and setup verification.
   You may keep OpenCode or another preferred harness with the assigned model and phase rules; record its actual configuration and verify its tools before substantive work.
   Verify the approved large-model route and one-agent configuration, with unapproved fallback and automatic delegation disabled or failing closed.
   A missing assignment is not permission to choose another model or pay for a service.

This is a small Node default, not a required stack.
You may choose another language or framework under the common contract.
Record why you adopt or replace the default in [the initial stack decision](docs/adrs/ADR-001-stack.md), and give the replacement an equally clear setup and validation path.
As behavior grows, adapt or replace the supplied smoke checks for the chosen routes and stack, and add the application acceptance checks.

## Work together in Obsidian

Each teammate can clone the group's private project repository and choose **Open folder as vault** in Obsidian.
Select the starter root containing `projects/`.
If this is your first time using Obsidian, the diary tutorial shows how to open a folder and edit a note. [First-time setup with screenshots](https://scalableweb.dev/diary/#start-with-the-first-lecture)
Keep your personal diary and peer assessments in a separate vault.
This works with ordinary Markdown and Git, including a graphical Git client.

1. Pull the latest changes and open the evidence index for [Establish](projects/01-establish/evidence/index.md), [Challenge](projects/02-challenge/evidence/index.md) or [Compare](projects/03-compare/evidence/index.md).
2. Pick a question for the session.
   In Challenge, for example, what will happen if two clients try the same work-item transition at once?
   Each person predicts the outcome before the operator consults the agent.
   The challenger proposes a competing explanation.
   The validator runs the agreed check and explains whether the result supports the group's decision.
   Rotate roles as you work. [Shared engineering sessions](https://scalableweb.dev/project/#shared-engineering-sessions)
3. Have one teammate record the responsibilities, prediction, check, result and decision in the [decision log](docs/adrs/README.md) or AI-use log.
   Link that record from the phase evidence index. The recorder commits and pushes the changes so teammates can pull them and follow the evidence.

If the team changes between phases, give the new group its own private repository from the starter and bring over the permitted specifications and written reasoning.
Keep the previous group's repository with its original members.
Submit the frozen technical work through **Group submission** in the [course workspace](https://scalableweb.dev/course/).

## Your first working session

Aim for one checked result before attempting the whole application.
Work in `projects/01-establish`; open that directory as your coding-agent workspace and deliberately supply the shared specification and decision context.

1. Fill the learning question, initial choice, risk, and revisit condition in [ADR-001](docs/adrs/ADR-001-stack.md).
   A provisional choice is enough to begin; update it when evidence changes your view.
2. Read the workspace requirements in the common contract and clarify your first task in [application.md](specifications/application.md).
   Begin with creating a workspace, seeing it in a list, and seeing it again after an ordinary server restart.
   Keep the rest of the required application visible as unfinished work.
3. Give the approved single agent one bounded brief, for example:

   > Implement the first workspace loop described in the shared specification, within this Establish directory.
   > Before changing code, explain the intended behavior, proposed state owner, and a check that would reject a fake persistence result.
   > Let a user create and list a workspace through the web application.
   > After stopping and restarting the server, the workspace must still appear.
   > Follow the course's workspace validation rules.
   > Add focused checks and update setup instructions.
   > Defer work items, events, feeds, summaries, and optional features for this task; they remain required later.
   > Do not inspect sibling implementations or delegate to other agents.

4. Inspect the change, execute its checks, and try the create/list/restart journey yourself.
   Test with a newly entered value so a hardcoded fixture cannot pass as persistence.
   Ask for or make a correction if the result fails; preserve that failure in the task record.
5. In [A's evidence index](projects/01-establish/evidence/index.md), record the brief, actual model/harness, commands, observed result, correction, acceptance decision, and remaining limits.
   Update [A's architecture note](projects/01-establish/architecture.md) to match the state owner you actually built.

This milestone is deliberately smaller than the complete product loop required by Establish.
Next, implement the work-item lifecycle and its activity events, then the remaining common behavior and validation before collecting the required baseline measurements.
When you reach the workspace summary, try [clarifying a shift lead’s request](https://scalableweb.dev/chapters/scalable-development/#clarify-a-handover-request) before writing the agent brief.

## Where work belongs

| Location                                                  | What it owns                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [specifications/](specifications/README.md)               | Shared behavioral intent, acceptance, clarifications, and course-contract references. |
| [docs/adrs/](docs/adrs/README.md)                         | Consequential reasoning and its history, with phase-specific implementation evidence. |
| [projects/01-establish/](projects/01-establish/README.md) | Fresh A: approved large model, one coding agent at a time.                            |
| [projects/02-challenge/](projects/02-challenge/README.md) | Fresh B: approved small model, one coding agent at a time.                            |
| [projects/03-compare/](projects/03-compare/README.md)     | Fresh C: declared fleet, then the final comparison.                                   |

Each phase owns its code, configuration, tests, data, architecture note, and evidence.
The three runtime stubs start identically and import no shared application implementation.
There is no root npm workspace: run commands inside the selected phase.
The default port is 4177; use `npm start -- 4178` for a different port, or set `PORT` in your environment.
Run one stub at a time unless you deliberately assign different ports.

## Begin B and C cleanly

Leave the later phase directories untouched until their phases begin.
Compare them with the same retained starter ZIP before starting; if they changed during A, restore only the unused phase from that original ZIP after reviewing the differences.
Do not initialize B or C by copying the evolved A or B directory, its application tests, or its configuration.
If adopting another generic starter or framework generator, retain its original version and start each build afresh from that version.

Carry forward behavioral specifications, decision history, written lessons, and permitted generic tooling under the [transfer policy](https://scalableweb.dev/project/#8-permitted-transfer-between-implementations).
While constructing a fresh implementation, keep agents focused on the active phase and share earlier reasoning without earlier source or implementation-specific tests.
The [agent instructions](AGENTS.md) document this boundary; they are not a filesystem sandbox.

Compare's required scaling and deployment experiment may select frozen A, B, or C.
Work in a separately identified experimental copy or branch, preserve the submitted baseline and its evidence, and follow the declared Compare configuration.
The [optional matched-pair probe](https://scalableweb.dev/project/compare/#optional-run-a-matched-single-agent-fleet-probe) likewise permits experimental copies of a frozen revision under its specific controls.
Neither exception permits using earlier application source to initialize fresh C.

At each phase freeze, retain readable snapshots of the shared specification and decision records alongside that phase's evidence, identified by full commit or export date and revision.
Later edits to shared documents must not rewrite what an earlier submission claimed.
Use the phase evidence index to link these snapshots, the required results, and the staged audit response.
Private diaries and individual portfolios stay outside the technical bundle.
