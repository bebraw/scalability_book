# ADR-003: Import students and use email magic links

**Status:** Accepted

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

Current course authentication and roster import still use GitHub IDs.
Implementation must prove imported and later-added students can sign in, unknown emails cannot enroll, expired or reused links fail, and corrections preserve record ownership.
Mock-email checks should cover this flow without sending mail to real students.
Publish the new CSV and sign-in instructions only alongside the implemented migration and access behavior.

## Open questions

- Define the migration and conflict-resolution procedure for existing GitHub-keyed course records before changing identity keys.
- Choose token expiry, session duration, and bounded retry behavior during implementation; these are not yet fixed values.

## References

- [ADR-006: course email delivery](ADR-006-use-cloudflare-for-course-email.md).
- [ADR-007: simulation and mock email](ADR-007-provide-an-isolated-teacher-simulation.md).
- [OWASP email verification guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html).
