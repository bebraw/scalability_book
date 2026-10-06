# ADR-030: Distribute the learning companion with guided student setup

**Status:** Accepted

**Date:** 2026-10-06

## Context

[ADRs 027–029](../README.md#implemented) establish a working whole-book notebook, student-agent connection and opt-in peer inquiry.
The current [student setup](../../learning-companion-setup.md) requires cloning this repository, installing its website dependencies and running the companion from that checkout.
Connecting Codex adds separate installation, dedicated-profile creation, sign-in and process-restart steps.
During verification, the first sign-in attempt failed because the profile directory had not been created.

The default notebook directory is relative to the working directory: `.local/learning-companion/`.
Starting elsewhere can select a different notebook, and deleting a checkout can remove both learning records and the dedicated provider profile.
These setup and recovery costs matter to the agreed goal of helping students enter the material and complete existing course work within its workload.
Technical integration checks have passed; independent student setup and learner-outcome evidence remain to be collected.

## Decision

Distribute the existing local companion as a small, separately versioned npm CLI package maintained in this repository.
Students can run a documented release through `npx` or install that same release, without cloning the book or installing its publishing dependencies.
Keep the repository command available for development.
Ship the executable and required authored metadata as a built release artifact; students do not build the website or TypeScript sources to start their notebook.
Declare the supported Node versions and operating systems and verify the actual packaged artifact on that matrix before advertising support.

### Entry points, owners and dependencies

The package CLI owns setup, process startup, data-directory selection and local diagnostics.
The website's **Notebook → Connect** interface owns pairing and actionable browser connection feedback.
The existing notebook, conversation and provider modules remain the state and integration owners described in [the workspace contract](../../learning-workspace.md).
Package assembly depends on those modules and their shared contracts; it does not create a second learning domain or make them depend on the website build runtime.
Required concept/demo metadata is derived from the authored registries in the release build, with its source revision recorded.

Retain loopback binding, exact allowed origins, explicit pairing, authenticated companion sessions and student approval of demo changes from ADR-027.
The website never gains provider credentials or arbitrary machine execution through setup or diagnosis.
Notebook use remains available without a model connection or course membership.

### Guided setup and diagnosis

Provide a setup flow that creates the required private directories, explains where records live and offers notebook-only or optional Codex use.
Check the supported Node runtime, writable storage and chosen port before starting.
For Codex, check the installed CLI version, dedicated-profile constraints and sign-in availability; provide a concrete next action for a missing or unsupported prerequisite.
Create the profile directory before initiating or instructing sign-in.
Account authentication remains the provider's own flow and does not change the student's ordinary coding profile.

Provide local diagnostics and browser connection feedback that distinguish a stopped companion, failed pairing, expired session, origin mismatch, local-network permission problem and unavailable provider where these can be observed.
Report uncertainty when browser/network failures cannot be distinguished reliably.
Show versions and the selected storage location so a student can find the right notebook and report a problem.
Diagnostic output excludes note bodies, conversations, credentials and pairing/session tokens; sending a support report is a separate student action.
Recovery instructions lead back to retained work and ordinary pairing, without silently resetting records or retrying sign-in indefinitely.

### Persistent data and migration

Use a stable per-user application data directory as the packaged companion's default.
Resolve it independently of the working directory, package version, npm cache or installation location.
Retain an explicit directory override for development, separate notebooks and recovery.
The local state owners keep notebook and conversation storage separate from provider authentication, with private filesystem access under the existing contract.

Offer an explicit migration from an existing `.local/learning-companion/` directory.
Show the source and destination and require the companion to be stopped before copying database/profile state.
Preserve original records, entry identities, revision history, source context and accepted assistance provenance; do not delete the source or replace a conflicting destination automatically.
Keep portable notebook import/export available independently of raw conversations and credentials.
When provider continuity cannot be transferred, explain that limit and allow the student to start a new conversation from retained notes.
Starting from another directory must not silently produce an apparently empty replacement notebook.

### Releases, compatibility and recovery

Document an explicit tested package version and compatible provider versions.
Keep package version, browser protocol version, notebook archive schema and database schema distinct.
The released package exposes enough version information for the browser to explain an incompatible connection and the required next step.
An update is a deliberate student operation and retains the same data directory.

Validate stored schemas before modifying them.
For a required migration, create a recoverable backup and apply the change atomically; interruption or failure must leave an understandable recovery path.
An older release must reject a newer unsupported schema without rewriting it.
Document rollback limits and restoration rather than promising that every older binary can open an upgraded database.
Package removal or replacement does not remove the student's records or provider profile.

### First learning session

Offer an optional first investigation from the book after pairing: save initial thinking, inspect an actual demo, record a reflection and reopen the saved note.
The queue balance lab is one suitable example, with its authored assumptions retained.
Students may use it without a model or connect Codex for reviewed assistance and approved demo changes.
Allow skipping or leaving the walkthrough and returning to the student's own question.
Its completion is a setup/learning aid, not a required exercise, concept mastery mark, new assessment criterion or additional report.

## Trigger

After completing ADRs 027–029, the user asked for the next implementation step and accepted recording student installation and onboarding as an ADR.
The priority is to make the existing learning space usable by a student starting outside the development repository.

## Consequences

**Positive:**

- Students can begin without learning the repository's publishing workflow.
- Stable storage and explicit migration protect continuity across working directories and package updates.
- Observable setup failures and a short first investigation make independent trials easier to conduct.

**Negative:**

- A published package adds release ownership, compatibility testing and support across the declared platform matrix.
- Database/profile migration and rollback need verification beyond the current portable notebook tests.
- Node and optional provider installation remain prerequisites whose effort must be measured with learners.

**Neutral:**

- The local ownership, selected-context privacy and student agency decisions in ADRs 027–029 remain in force.
- Production course storage/authentication rollout and voluntary learner evaluation remain separate work under their existing owner documents.

## Alternatives considered

### Continue distributing through the book checkout

This is sufficient for development and remains supported there.
It asks every student to install website tooling and couples default record placement to a checkout, increasing the setup and recovery work we need to evaluate.

### Build a desktop application immediately

A desktop application could eventually improve installation and process management.
It adds platform packaging and application lifecycle work before testing whether a small CLI and guided browser setup remove the current friction.

### Host the notebook and student agent on the website

This would change the agreed local state, credential and model-access responsibilities.
The present step distributes the existing local companion while preserving student-controlled sharing.

## Implementation and verification

The repository now prepares `@scalableweb/companion@0.1.0`, with the `scalableweb-companion` executable and bebraw as publisher in the `scalableweb` npm organization.
[The CLI](../../../scripts/lib/learning-cli.ts) owns `setup`, `login`, `start`, `doctor` and `migrate`; [the package workflow](../../../.github/workflows/learning-companion.yml) verifies its compiled tarball on macOS/Linux with Node 24 and 26.
The default data paths are `~/Library/Application Support/scalableweb-companion/` on macOS and an absolute `$XDG_DATA_HOME/scalableweb-companion/` or `~/.local/share/scalableweb-companion/` on Linux.
The repository entry retains its original `.local/learning-companion/` default.
Package version 0.1.0, browser protocol 1, archive schema 1 and notebook/conversation schemas 1 are reported separately; the verified provider is Codex CLI 0.154.0.
Windows is not advertised as supported.

Local checks on 2026-10-06 passed clean tarball installation and per-user continuity on macOS with Node 24.21.0 and 26.10.0, all 146 unit tests, type checking and ten notebook/onboarding/demo/peer browser checks in Chromium/WebKit.
A newly created dedicated profile was signed in through the packaged CLI, and its real Codex browser check passed an actual reply, observed/approved demo change, resumed conversation and reviewed notebook draft.
Synthetic checks passed copy migration, conflicts/live writers, preserved source history, schema snapshots/restoration, interrupted migration, newer-schema rejection, prerequisite failures and diagnostics without private text/tokens.

This record remains Accepted until the declared matrix and registry publication have been verified.
Current behavior, recovery instructions and release commands are maintained in [the workspace guide](../../learning-workspace.md), [student instructions](../../learning-companion-setup.md), [ARCHITECTURE.md](../../../ARCHITECTURE.md) and [development guidance](../../development.md).

Before marking Implemented, verify:

- Install and run the packed release artifact in a clean directory without this checkout or website dependencies, on every declared supported runtime/platform.
- Start notebook-only, pair with the book, capture an initial explanation, operate the actual demo, save a reflection and reopen it after restarting from a different working directory.
- Set up the dedicated provider profile from scratch and verify a real Codex reply, approved demo change and resumed conversation without exposing credentials.
- Exercise missing prerequisites, a busy port, permission failures, expired pairing/session and incompatible protocol/provider versions with actionable messages and retained work.
- Migrate a synthetic existing notebook without losing history or source context; reject conflicting destinations and verify the original remains recoverable.
- Exercise package updates, interrupted schema migration, backup restoration and an older binary encountering a newer schema without destructive writes.
- Inspect the package contents and diagnostics for unintended dependencies, local records, credentials or tokens; retain the existing origin/session and selected-context checks.

Record the shipped artifact, source revision, supported matrix and verified provider version in the implementation evidence.
Use the voluntary individual/group trial in [the evaluation guide](../../learning-workspace-evaluation.md) to measure setup friction, independent understanding, existing submission preparation and actual course progress.
Successful onboarding alone does not establish improved learning or completion.

## Open questions

The implementation choices above resolve the package, storage, command and compatibility questions.
Independent student/group trials remain open under the evaluation guide; platform/provider checks alone do not answer the learning-outcome question.

## References

- [ADR-027: Local companion and student-agent boundaries](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md).
- [ADR-028: Private notebook, portability and reflection](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- [ADR-029: Opt-in peer inquiry and audience boundaries](../implemented/ADR-029-support-asynchronous-peer-inquiry-through-opt-in-annotations.md).
- [Current student setup](../../learning-companion-setup.md).
- [Current learning workspace contracts](../../learning-workspace.md).
- [Voluntary learner evaluation](../../learning-workspace-evaluation.md).
- [npm package execution](https://docs.npmjs.com/cli/v11/commands/npm-exec/).
