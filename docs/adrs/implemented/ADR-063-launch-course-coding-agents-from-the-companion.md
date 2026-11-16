# ADR-063: Launch course coding agents from the companion

**Status:** Implemented

**Date:** 2026-11-16

## Context

The pilot has verified GLM and Qwen configurations for single-agent and coordinator/worker coding tasks.
Manual setup still requires students to install a CLI, copy a profile, supply credentials, run a disposable check and select the profile again when starting work.
That is substantial setup for students who have never used a coding agent.
The companion already provides a packaged terminal entry, OS credential storage and local diagnostics.
Some students already have Codex installed and should be able to reuse a sufficiently recent version while retaining a verified fallback.

The study assistant deliberately exposes only book retrieval and reviewed demo interactions.
Its read-only Codex adapter does not provide project editing or machine commands.
Building a new coding runtime inside that provider would also require execution isolation, command lifecycle, fleet coordination and evidence accounting.

## Decision

Add a terminal-only `project` command that prepares and launches the course coding harness.
Use Codex CLI with a verified 0.154.0 baseline as one supported beginner option; students may use OpenCode or another harness with the assigned models, phase rules and equivalent verification.
Bundle the declared phase configurations and disposable checks with the companion so packaged runtime does not depend on the book checkout.

The command guides phase and project-directory selection, displays the exact commands and configuration, selects Codex, obtains the Aalto key through the existing credential primitives, performs the tool check and launches the interactive CLI in the chosen workspace.
Prefer the first executable `codex` on `PATH` if a version probe without the model key reports a stable version at least 0.154.0.
A missing, older, prerelease, unparseable or failed candidate selects a private pinned 0.154.0 installation; never update the global installation.
Provide `--managed-codex` to explicitly select that private baseline.
Installation receives no model credential and disables dependency lifecycle scripts.
Version eligibility is not a compatibility claim: the selected executable must pass the phase preflight, and newer releases are not globally verified.
Bind receipts and cache reuse to the actual executable source, path and version as well as the course configuration, runtime and fixture identity.
A real preflight failure retains its evidence and stops; do not silently substitute another harness and repeat model calls.
Students can print the selection policy, conditional commands and profile without probing Codex or other side effects, or deliberately rerun the check without launching project work.
Reject applicable project-local Codex configuration before launch, leaving it available for review or manual harness use, while preserving project `AGENTS.md` discovery.
Retain the exact managed course settings; permit only narrowly validated project trust records that Codex appends itself.

Keep project state in a separate sibling of the companion directory, named with a `-projects` suffix, under its own lease.
This lets the book companion remain running and leaves its provider settings, notebook records, study conversations and read-only profile unchanged.
New project credentials use a separate endpoint-bound identity in the OS store; existing book credentials may be reused read-only.
Project profiles, session traces, check evidence and success receipts remain private and outside notebook archives and migration.
Use an isolated `harness-probe/` directory for version probes and append `-installed-<version>` to installed CLI phase-profile names so newer Codex versions cannot rewrite the pinned fallback's profile.

The terminal launch grants the selected workspace to the external coding harness.
The browser connection and study-message tool broker gain no project execution endpoint or additional authority.
Codex retains its interactive permissions and lifecycle; Compare uses a shared project directory with declared worker tasks rather than claiming per-worker filesystem isolation.
This decision preserves ADR-027's study-assistant boundary while adding a separate terminal entry for coding.

## Trigger

The instructor asked to integrate the verified commands into the companion because the manual setup was too complex for beginners, while preserving transparency, freedom to use other harnesses and reuse of sufficiently recent Codex installations.

## Consequences

Students can begin with one guided command and inspect the underlying setup when needed.
One bundled configuration owner and artifact checks reduce drift between the setup guide and the commands actually launched.
Maintainers own the launcher, installed-version selection, pinned fallback, credential handoff and verification receipts, while the external harness continues to own coding execution and fleet behavior.
Reusing installed Codex avoids unnecessary installation, but version eligibility alone cannot establish compatibility with the course profiles; each selected harness still needs its own successful phase check.

Private project state needs separate backup and retention because notebook migration intentionally does not include it.
A successful disposable check establishes tool compatibility, not correctness of the student's application.
The managed launcher rejects applicable project-local Codex configuration rather than silently accepting a different route or coordination policy.
Model service availability, unknown interrupted-request usage and cancellation beyond the local process boundary remain explicit limits.

## Alternatives considered

### Keep only manual commands

The full profiles and manual setup remain useful for inspection and recovery, but they impose avoidable work on first-time users.

### Build a native coding harness in the companion

This could eventually integrate task and file views with the companion, but would introduce a new execution and fleet runtime before establishing that students need one.
The launcher addresses the observed setup problem with the already verified harness.

### Always install the pinned CLI

This offers a single baseline but duplicates an eligible installation a student may already use.
Prefer the installed candidate with its own profile and preflight, and retain the private pinned copy as an explicit recovery path.

### Require one harness for every student

This would simplify support but needlessly replace familiar tools.
The course constrains models and coordination rules; the companion supplies a supported starting path.

## Implementation and verification

Implementation is owned by [the project orchestrator](../../../scripts/lib/learning-project.ts), [bundled configuration owner](../../../scripts/lib/learning-project-config.ts), [Codex selector](../../../scripts/lib/learning-project-codex.ts), [process owner](../../../scripts/lib/learning-project-process.ts), [preflight owner](../../../scripts/lib/learning-project-preflight.ts) and [project-configuration boundary](../../../scripts/lib/learning-project-boundary.ts).
The [student setup guide](../../learning-companion-setup.md#start-a-course-coding-project) and [development guide](../../development.md#course-project-launcher) own the command and verification instructions.
Focused automated checks exercise preserved notebook state, credential handoff, managed version/configuration validation, meaningful preflight rejection, worker attribution, failed-recheck cache invalidation and process interruption.
A clean prepared package passed installation, native-keyring import, 42 CLI/authentication checks and local-service verification; packaging checks remain part of the release gate.

On 16 November 2026, real Aalto launcher checks using the pinned Codex CLI 0.154.0 baseline on macOS with Node 24 completed for Establish in 9.28 seconds including clean managed installation, Challenge in 9.74 seconds and Compare in 43.10 seconds with actual child-session checks.
A real terminal rehearsal exercised guided phase/directory selection, cached Establish handoff to the correct GLM model and workspace, and `/exit` with status zero.
The first terminal rehearsal exposed Codex appending project-trust tables, which the original byte-exact profile guard rejected on reuse.
That failure was retained; the corrected validator permits only strictly parsed trust records while protecting the course fields, with regression coverage.
The installed-CLI selection was also verified against the existing macOS Codex 0.154.0 installation: Challenge passed in 8.66 seconds, recorded the installed executable and version, and created no private harness installation.
Synthetic checks cover newer stable versions, outdated and broken candidates, executable/version cache invalidation, isolated version probes, explicit managed selection and failure without an automatic model rerun.
These checks establish local setup and handoff for that baseline, not compatibility of newer Codex releases, course-application correctness, upstream cancellation or Windows support.
The current registry release 0.3.1 does not include the launcher; source implementation and package publication are separate milestones.

## References

- [ADR-027: study-assistant execution boundary](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md)
- [ADR-030: packaged companion and guided setup](../implemented/ADR-030-distribute-the-learning-companion-with-guided-student-setup.md)
- [ADR-051: versioned course configurations](../implemented/ADR-051-reference-versioned-course-configurations-in-student-evidence.md)
- [ADR-061: OS credential storage](../implemented/ADR-061-store-companion-credentials-in-the-os-keychain.md)
- [Course environment](../../../specifications/course_environment.md)
