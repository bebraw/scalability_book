# ADR-003: Import students and use email magic links

**Status:** Implemented

**Date:** 2026-10-05

## Context

The current roster requires a numeric GitHub ID and GitHub login name.
Students may not have GitHub accounts, and the institution can provide a CSV containing student IDs, first and last names, and institutional email addresses.
The instructor needs to import students before the course starts and add or correct records later.

## Decision

Import the institutional roster to create student records and course enrollments.
Store student ID, first name, last name, and institutional email separately.
Use a stable internal student identity independent of email, GitHub, group membership, and displayed name.
Student IDs identify enrollment/export records; they are not credentials.
An email or name correction must preserve submissions, grades, and history.

Support CSV column mapping, with the following canonical example:

```csv
student_id,first_name,last_name,email
S001,Alice,Example,alice@example.edu
```

Preview additions, updates, duplicate IDs/emails, and conflicts before applying an import.
Use the existing student ID within the institution's enrollment context to match updates; flag ambiguous matches for instructor resolution.
An absent row never implicitly deletes or withdraws a student.
Allow individual additions and later incremental imports without recreating the course or its groups.

Students sign in using short-lived, single-use magic links sent to their imported institutional email address.
There is no course registration link or student self-enrollment step.
Unknown addresses do not create accounts or reveal the roster through sign-in responses.
Successful sign-in establishes a normal authenticated session; an entered student ID or GitHub login is never proof of ownership.
GitHub is optional for student course access.

Keep staff authorization distinct from student enrollment and retain existing staff sign-in until an intentional change is agreed.
The student directory and class gallery must not expose institutional emails or student IDs.

## Trigger

The instructor confirmed access to an institutional roster and email, then explicitly preferred importing students and using magic links over a registration link.

## Consequences

**Positive:**

- Students can participate without creating a GitHub account.
- Enrollment and group formation can begin before first sign-in.
- Stable identities preserve records across address and provider changes.

**Negative:**

- The application needs token/session handling and a reliable email delivery path.
- Existing GitHub-keyed records require an explicit migration that preserves ownership and history.
- Duplicate or changed institutional identifiers need instructor review rather than silent merging.

**Neutral:**

- A GitHub login may remain optional profile information; it is not a required roster column.
- Email delivery configuration is a separate operational dependency.

## Alternatives considered

### Require GitHub and simplify to login names

This still excludes students without accounts and couples academic records to a renameable provider identifier.

### Offer course registration or open enrollment links

The institution already supplies the roster, and the instructor rejected an extra registration flow.

### Treat email as the permanent database identity

Addresses can change; using them as record keys would complicate historical ownership and corrections.

## Implementation and verification

Institutional CSV mapping, incremental imports, preview, manual additions/corrections, stable internal identities and the email token/session flow are implemented.
The local server uses a staff-only mock inbox; the Worker has D1 auth/session adapters and a native Cloudflare mail adapter gated by its binding and an explicit enablement variable.
Repository behavior is implemented and verified; this status does not establish production deployment or delivery.
The domain, verified Gmail forwarding and instructor-authorized live delivery check remain operational dependencies in ADR-006.

`worker/course-administration.ts` matches imports by institutional student ID within a run.
Existing GitHub-keyed records retain their keys; new enrollments receive opaque UUID identities.
Explicit manual corrections pin the internal record, and conflicting IDs/emails are rejected rather than merged.
Email/name/student-ID corrections preserve group, portfolio and grade ownership and history.
Legacy imports retain institutional details added earlier.

`worker/course-auth.ts` provides 15-minute single-use links and seven-day course-scoped student sessions.
SQL token consumption and rate counters are atomic in D1 and local SQLite.
Unknown and per-address-throttled emails receive the same response, failed delivery leaves no usable link, and email corrections revoke former-address credentials.
Staff authentication remains GitHub-based; an email session never receives staff permissions.
Other students' institutional addresses and student IDs are redacted.

API tests cover migration/record preservation, conflict rejection, privacy, concurrent reuse, exact expiry boundaries, session scope/logout, request limits and delivery failure.
Worker mail tests cover deferred sending, pending-link rejection, successful activation, setup gating and credential-free failures using a mocked Cloudflare binding.
The browser email flow covers column mapping, import preview, late enrollment, mock mail, first sign-in status, reuse rejection and correction.
See [course-system.md](../../course-system.md#institutional-enrollment-and-sign-in) for the operating flow and migration procedure.

## Resolved implementation details

- Student IDs match only within the course enrollment context; they are never login credentials.
- Existing numeric GitHub keys remain opaque internal identities to avoid rewriting historical references.
- Three link requests per address/course and 30 per IP are allowed per ten minutes; verification permits 15 attempts per IP.
- Tokens use 32 random bytes and are stored only as SHA-256 hashes in auth tables.
- URL fragments and an explicit verification POST avoid query-log disclosure and consumption by a simple link-prefetch GET.
- Successful email access timestamps live separately from the roster, so signing in does not invalidate an instructor's pending import.

## References

- [ADR-006: course email delivery](../accepted/ADR-006-use-cloudflare-for-course-email.md).
- [ADR-007: simulation and mock email](../implemented/ADR-007-provide-an-isolated-teacher-simulation.md).
- [OWASP email verification guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html).
