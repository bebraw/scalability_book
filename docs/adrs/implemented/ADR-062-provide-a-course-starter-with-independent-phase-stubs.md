# ADR-062: Provide a course starter with independent phase stubs

**Status:** Implemented

**Date:** 2026-11-09

## Context

The pilot student had difficulty getting started with Establish.
The course already requires reproducible setup, maintained specifications, evolving decisions and comparable evidence, but leaves students to translate those requirements into a repository and a first actionable task.
The [first-run improvement notes](../../first-run-course-improvements.md) proposed an executable evidence template.

The [common contract](../../../specifications/00_common_project.md) permits public starters, separate clean implementation directories and transfer of written specifications and reasoning.
It forbids transferring earlier application source, implementation-specific tests and configuration into later builds, and deliberately leaves stack choice open.
[ADR-048](../implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md) requires decision history and phase-specific evidence without imposing a directory layout or record quota.

## Decision

Publish an optional downloadable starter from `course-tools/project-starter/` with:

- one short first-session walkthrough, progressing from a setup check to a student-built persistent feature;
- shared behavioral-specification prompts referring to the authoritative course contract;
- a shared ADR guide, blank template and provisional stack-choice prompts;
- independent `01-establish`, `02-challenge` and `03-compare` directories, each with a runnable stub, smoke checks, phase guidance, architecture prompts and one evidence index.

Use Node's standard library for the default HTTP stub and pin the rehearsal runtime in `.nvmrc`.
Supply no Work Activity Tracker behavior, persistence, application workload adapter or model integration.
Other stacks remain valid; adoption of the default belongs in the student's own decision record.
Smoke checks establish setup only and the page explicitly identifies application behavior as unfinished.

Each phase begins from identical pristine runtime files retained in the original starter download, not from an earlier implemented phase.
There is no shared runtime package or cross-phase application import.
Shared specifications and decisions carry intent and reasoning; implementation status, architecture, tests, configuration and evidence remain scoped to each phase and submitted revision.
Keep readable specification and decision snapshots with phase evidence.
Agent instructions identify allowed shared context and prohibit inspecting or copying sibling source; these instructions do not claim to enforce filesystem isolation or model routing.

Package an explicit file allowlist through the existing ZIP writer and generate a manifest with base source and contract revisions, dirty-state indicators and content hashes.
Dirty and unversioned builds must not claim to be exact Git releases.
Reference the existing benchmark runner rather than duplicate it or expose the private audit reference.
Add an optional download action to project-page navigation without changing frozen course requirements, scoring or mandatory deliverables.

## Trigger

The instructor requested a starter after the trial student's difficulty and accepted the proposed shared specifications, ADR setup, independent phase stubs and first-session walkthrough.

## Consequences

- Students can verify their local environment and begin a bounded task without first designing the repository layout.
- The default makes a concrete stack available while retaining the course's technical freedom.
- Small duplicated runtime stubs preserve independent builds; changes to the distributed baseline must keep those copies aligned.
- The evidence prompts expose existing obligations without requiring a separate report for every field.
- One repository makes shared reasoning convenient but requires deliberate agent scoping to avoid accidental source transfer.
- Packaging and onboarding guidance need maintenance and a new student rehearsal; automated checks cannot establish improved learning or successful completion of the first feature.

## Alternatives considered

### Documentation-only folders

This helps organize work but leaves setup and the first executable step unresolved.

### Adopt the complete vibe-template

Its separation of specifications, architecture and decisions is useful, and the book's existing ADR workflow already adapts it.
Importing its full Cloudflare application and engineering tooling would add installation and conceptual overhead and make more architectural choices for students.

### Share application code across phases or evolve A into B and C

This reduces duplication but conflicts with the fresh-build comparison.
Only written behavioral context, reasoning and other permitted generic materials transfer.

### Maintain one starter for every stack

This preserves equally supported executable choices at a disproportionate maintenance cost.
One optional default with replaceable runtime files gives students a concrete entry without narrowing assessment.

## Implementation and verification

The [starter source](../../../course-tools/project-starter/README.md), [allowlisted packager](../../../scripts/lib/project-starter-download.ts), build integration and project-page download action implement the decision.
The [tooling guide](../../course-tooling.md#student-project-starter) owns distribution and the [development guide](../../development.md#course-project-starter) owns verification commands.

Verification on 9 November 2026:

- All ten packaging and ZIP checks pass, including missing-file rejection, file/directory/root symlink rejection, exclusion of synthetic private records, content hashes, dirty-source provenance and identical independent runtime seeds.
- The generated ZIP was extracted outside the book repository; all 35 source hashes and seven contract hashes were checked against the actual files.
  Each phase was copied into its own standalone directory with no siblings and passed its three smoke checks on Node 24.22.1 and Node 26.13.0, with no dependency installation.
- The first malformed-request regression failed with `ERR_INVALID_URL` for request target `//`.
  The server now returns 400 and continues serving health requests; the same check passes in all three phase copies.
  Initial socket tests were blocked by sandbox loopback restrictions and were rerun with loopback available; this was an environment failure, not an application retry.
- The Worker build, type/HTML/local-link validation, all 18 benchmark checks and all 14 Chromium project-specification browser checks pass.
- Isolated Chromium and WebKit checks verify the download, starter page, health link and absence of horizontal overflow at 1280px and 390px; screenshots were inspected.
  The first ad hoc browser inspection used a relative request without a base URL and failed in the inspection harness; configuring that base URL resolved it.
- The published-link check reports no broken links and 15 inconclusive external destinations due to access-denied responses or confirmed Cloudflare challenges.

Generated rehearsal files, screenshots and the retained external-link report stay under ignored `.local/project-starter-verification/`.
These checks establish repository implementation and local behavior; deployment is verified separately against the pushed commit.
No completed student walkthrough or improvement in learning is claimed.
