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

Teacher simulation is not implemented.
Verify a teacher can import a mock roster, approve groups, follow a mock login, freeze source, complete audits and portfolios, advance deadlines, assess, release, and export results.
Verify student views expose only the correct records and pending or missing mandatory work prevents a passing grade.
Verify reset, role switching, clock changes, file access, and mail requests cannot affect a live course, including deliberately mismatched environment identifiers.
Document the rehearsal steps and expected outcomes in the course-system guide when available.

## Open questions

- Choose the deployed storage and routing arrangement that enforces simulation isolation before implementation.
  Separate backing resources are preferable where a shared resource cannot provide a reliable boundary.
- Choose fixture/reset versioning so a teacher can repeat a scenario after application changes.
