# ADR-007: Provide an isolated teacher simulation

**Status:** Accepted

**Date:** 2026-10-05

## Context

The instructor needs to rehearse enrollment, grouping, submissions, audits, and grading before running a real course.
API and browser tests provide useful verification but do not make the entire teaching workflow inspectable from the instructor interface.
Existing development-only test identities are not a teacher-facing simulation and are not suitable deployed impersonation controls.

## Decision

Provide teacher simulation in both the instructor website and local development.
Use synthetic students, groups, submissions, portfolios, and assessments in an isolated simulation environment.
Display a persistent **Simulation** indicator and clearly mark simulation exports.
Never seed from real student data or reset a real course as a simulation operation.

Exercise the same course interface, authorization rules, submission lifecycle, and grade calculations as real use.
Supply separate record/file storage, a controllable simulation clock, and a mock email transport as environment adapters.
Simulation requests must not fall through to live storage, real mail delivery, or live deadline changes.

Let the instructor view and act as mock students within the simulation to confirm what students can see and submit.
Student views retain student permissions; the instructor's staff privileges do not leak into a mock student's request.
Role switching is limited to simulation identities and remains a staff-only simulation control.

Provide a mock inbox to follow magic links and test expiry or reuse without sending mail.
Allow advancing simulated time across implementation, audit, evidence, and grade-release boundaries.
Allow resetting only simulation state to a reproducible starting point.

Include useful starting scenarios for course preparation and grading review, with a compact default cohort and an optional larger roster.
Fixtures should contain small valid archives and realistic evidence rather than empty placeholders everywhere.
Cover incomplete group formation, a fourth-member exception, late enrollment, withdrawal, missing work, stale assessment, and a high project total that still fails mandatory individual work.
Preset names and exact cohort sizes are implementation defaults, not new course policies.

## Trigger

The instructor requested mock students to walk through workflows from the teacher's perspective, then selected availability in both the website and local development.

## Consequences

**Positive:**

- The instructor can inspect the full workflow and student-visible outcomes before collecting real records.
- Shared domain behavior makes rehearsal useful evidence about the actual product.
- A mock inbox and clock make deadline and login edge cases repeatable.

**Negative:**

- Website simulation requires rigorously isolated storage, identities, and side-effect adapters.
- Fixture maintenance becomes part of evolving the course workflows.
- A second clock context must never influence live courses.

**Neutral:**

- Simulation supplements automated checks and does not establish real email delivery or production provisioning.
- Simulation grade exports use the same calculation but must be recognizable as synthetic data.

## Alternatives considered

### Local development only

This is simpler to isolate, but the instructor explicitly selected access through the website as well.

### Seed mock students into a real course

This mixes synthetic and academic records and makes mail, reset, and export behavior difficult to trust.

### Build a separate demonstration interface

It could appear to work while the actual submission and grading rules behave differently.

## Implementation and verification

The isolation boundary and manual teacher controls are implemented in both runtime adapters.
The [simulation router](../../../worker/course-simulation.ts) authorizes the verified instructor before selecting a simulated role, then passes the scoped adapters and clock to the existing course and magic-link handlers.
Mock student roles use course-scoped student permissions; expired mock email sessions cannot inherit the controller's staff access.
The [browser adapter](../../../site/scripts/course-simulation.ts) retains simulation context on requests, uploads, downloads and exports, and shows a persistent Simulation indicator, role control, mock inbox, clock and reset.

The [environment adapter](../../../worker/course-simulation-environment.ts) requires separately marked D1/R2 resources whose identifiers match the configured simulation environment.
Live routing rejects simulation-marked resources; independent backing-resource checks reject aliases even when bindings are different objects.
The [local adapter](../../../scripts/lib/local-course-simulation.ts) uses a separate directory, inspects existing databases read-only before initialization, and rejects existing academic records and filesystem aliases.
Each instructor and reset generation has separate record/file/auth/mail scopes within the dedicated simulation resources.
Reset selects a new generation and clears its login; stale-generation requests fail instead of falling through to live records.
Old synthetic generations remain unreachable through the application rather than requiring destructive deletion during reset.
Clock changes use revision checks and do not change live schedules or another instructor's session quotas, expiry or inbox retention.
Simulation CSVs retain the grade calculation and add a synthetic environment column and filename.

Eight unit tests cover live sentinels, teacher/generation isolation, actual source freezing and streamed files, immutable history, student permissions, mock link expiry/reuse, scoped cleanup, initializer safety and mismatched environment/binding/path identities.
The browser check covers synthetic roster import through the shared interface, mock login, role switching, clock, export, reset, mobile layout and accessibility, and rejects any escaped live course/auth request.
The [local Worker check](../../../scripts/check-course-simulation.ts) verifies actual D1/R2 records and streaming, frozen history, mock authentication, clock and exports while retaining a live sentinel.
The [operating guide](../../course-system.md#teacher-simulation) documents the implemented manual rehearsal and resource setup.
No production resources have been provisioned or deployed by this work.

Compact (10-student) and larger (31-student) preparation/grading-review presets are implemented through the shared course handlers.
The [fixture owner](../../../worker/course-simulation-fixtures.ts) supplies only authored synthetic names, reserved-domain emails, a valid dependency-free source archive, reproducible checks/demo, audit reports, indexed technical responses and private evidence.
Scores and audit timings are explicitly illustrative; the small archive does not claim to satisfy the complete project briefs.
The [preset builder](../../../worker/course-simulation-seed.ts) validates the entire scenario in memory before persisting its accepted operations/history into a private generation.
Revision-guarded six-operation batches resume without duplicate histories; only the final control revision publishes the prepared generation.
The fixture edition is retained in control state; incomplete preparations from another edition require restart.
Four preset tests verify both sizes, consent/allocation/privacy, late enrollment and retained frozen membership, missing-work zeros, stale release/reassessment, mandatory minima despite high totals, interrupted/concurrent/reset preparation and unpacked offline source reproduction.
A second browser flow covers both presets and the teacher's stale-assessment review/release, followed by the student's failing requirement view.
The local D1/R2 check exercises the larger grading preset and verifies frozen history/files and release/gates against actual bindings.

The [complete browser walkthrough](../../../tests/e2e/course-simulation-walkthrough.spec.ts) creates a course and imports six synthetic students, confirms a proposed trio, allocates/publishes both groups, retains their identifiers across phases, follows a mock magic link and saves a working agreement.
It freezes actual archives, downloads assigned audit targets, submits reciprocal audits and private portfolios, attaches final technical evidence with Compare's frozen A/B references, records current assessments, releases all three phases and exports marked final grades through the shared interface.
Release fails before assessment; one incomplete Challenge participation requirement produces grade 0 despite sufficient overall points, while the other five students pass.
It checks retained frozen fields/audit revisions, individual privacy, mobile accessibility, no live request escape and delayed-save/refresh input protection.
The interface captures form values before disabling controls and keeps replacement forms paused until the owning request finishes; selecting the current phase preserves unsaved input.

This ADR remains Accepted: the withdrawal case is still outstanding.
The withdrawal scenario depends on ADR-004's institutional handling decision.

## Implementation choices

- Use dedicated D1/R2 bindings with positive environment markers and reciprocal live-resource rejection rather than selecting a course in live storage by a client flag.
- Scope records, files and authentication by verified instructor and reset generation; select a new generation for reset instead of deleting resources or rewriting a live course.
- Keep the verified controller identity separate from the student identity supplied to the existing domain handlers.
  Role switching is a teacher control, not a deployed test header or a student impersonation privilege.
- Version authored fixture semantics separately from the storage environment and random reset identities.
  Retain validated operations in a bounded private R2 plan, persist in revision-guarded resumable batches, and expose records only after preparation completes.
  This preserves shared validation and history without relying on one long database-writing request.
  Deployed preset construction requires a Workers Paid CPU allowance; local checks do not establish production account provisioning.
