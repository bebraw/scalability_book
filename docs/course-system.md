# Course submission and assessment system

The course workspace is part of the book site, outside the book's reading flow.
Open `/admin/courses/` to manage runs and `/course/` as a student.
Both pages use the same API; staff membership controls administration, rather than the URL.
Book feedback moderators do not automatically have access to course records.

## Agreed revision and current behavior

This guide describes the currently implemented GitHub-based workspace with four focused administration forms.
The [accepted ADRs](adrs/README.md#accepted) record the agreed revision: separate administration workflows, institutional roster import and email magic links, three-person group formation, phase checklists, Cloudflare course email, and an isolated teacher simulation available in the website and local development.
The administration split is in place; institutional identities, account activity, student group proposals and approvals, checklists, email delivery and simulation remain pending.
Use the ADRs for the intended design and this guide for commands and workflows that work today.
Update this guide as each decision is implemented.

## First run locally

```bash
npm run dev
```

Open `http://127.0.0.1:3000/admin/courses/` and create a run.
**Administration** has four workflows, each with its own save and change reason:

- **Students** imports and previews the roster.
  Import all students initially, or paste just later additions and corrections.
  Omitted rows remain enrolled; imports cannot remove students.
  Existing records retain their stable identity when names, student numbers or logins are corrected.
  Duplicate identities, student numbers and logins are rejected before saving.
- **Groups** allocates students for the selected phase and lists those awaiting allocation.
  Add group cards and select their members.
  New identifiers are generated automatically, starting at `group-01`; generated numbers are not reused after removing an unused group.
  Later phases can reuse Establish groups and their identifiers.
- **Phase administration** edits only the selected phase's deadlines and audit assignments.
- **Course settings** edits the run name and staff access and displays the retained published rubric.

The review queue links students awaiting allocation and incomplete audit arrangements to the relevant workflow.
Course creation, roster import and group allocation are separate operations.
The local instructor identity is `github:1` / `local-editor`.
Data persists in `.local/course.sqlite` and `.local/course-files/`; restarting the server preserves it.
These records are separate from chapter exercise answers and reader feedback.
To use a different local student identity, start a second server with `PORT=3001 COURSE_LOCAL_USER_ID=2 npm run dev` and enrol numeric ID `2` in the roster.
The development server is restricted to loopback; its local identities are not an authentication method for deployment.
The browser tests explicitly enable `COURSE_TEST_IDENTITIES=1`; the deployed Worker ignores the test identity header.

The roster CSV has four columns:

```csv
student_number,name,github_id,github_login
S001,Alice Example,123456,alice
S002,Bob Example,234567,bob
```

`github_id` is the stable numeric user ID, not a username or student number.
Students who sign in at `/course/` before enrolment can read their numeric ID and share it with the instructor for the roster.
Find it in the GitHub user API response at `https://api.github.com/users/<login>`.
Access follows the numeric ID in the verified GitHub session, so a renamed username does not change course membership.
Enter staff as `github:<numeric-id>`, one per line.
Check the imported roster before releasing the course to students.

Group cards display the saved identifier and a multiple selection of enrolled students.
Each student belongs to one group per phase.
Use **Reuse Establish groups** when membership is stable; future-phase membership can change.
Clear audit assignments before removing an unused group.
Groups with saved submissions, audits or assessments cannot be removed.
The audit field uses `group-01 > group-02`.
Circular matching produces one incoming and one outgoing assignment per group; the instructor can edit it before audits are submitted.
With only one group or a missing frozen implementation, staff arrange and record a fallback audit.

## Submission and access flow

1. A group member uploads a source archive, supplies the full commit hash, supported setup/validation and initial evidence, then freezes the implementation.
   The archive SHA-256, timestamp and registered phase membership are retained.
   The uploader attests that the archive matches the revision; the system does not clone or execute submitted code to verify that claim.
2. After the implementation deadline, assigned auditors can download the target's frozen archive and inspect setup/evidence.
   Their report identifies the frozen record revision and records setup time, prior inspection, tools, change-probe timing and findings.
3. Authors submit an audit response by the evidence deadline.
   The response appends to the record while preserving the frozen source, setup and initial evidence.
   A source correction remains a separate branch/artifact; staff decide whether a late response or portfolio correction is accepted and record a reason.
   For a permitted late initial archive, staff must enter a reason before uploading and freezing it; a frozen archive cannot be replaced.
4. Classmates can browse technical submissions after the audit window closes, even while grading remains unfinished.
   The catalogue excludes portfolios, confidential peer reports, student numbers and scores.
5. Students submit one private portfolio per phase: three lecture entries, self-assessment, private peer reports, reflection and evidence of a consequential decision they challenged, tested or reviewed.
   Text, audio and video attachments are supported; attachments must be described in the relevant evidence fields.

Private portfolios and attachments are available only to their owner and course staff.
Students see their own group feedback and individual scores after release.
All file downloads go through the authorised API and use attachment responses; there are no public bucket links.
GitHub OAuth requests identity access, not access to private repositories.
The uploaded archive supplies a stable course copy for auditors and classmates.

The initial limits are 100 students per run, 50 groups per phase, 10 members per group, 20 MiB per file and 12 uploads per owner/phase.
Keep technical evidence inside the source archive when practical and compress large media before uploading.
Staff must manage storage cleanup outside the UI; no destructive removal of original evidence is exposed in this version.

## Review and grading

The review queue shows frozen implementations, missing incoming audits, author responses, private portfolios and ungraded or stale assessments.
Staff score each criterion from the [published rubric](../specifications/grading.md), with reasons and missing evidence.
The contribution criterion is an instructor judgment; peer reports are not automatic grade votes.
One project score applies to every frozen phase member.
Lecture participation, diaries and self/peer assessments remain individual.

The rubric is versioned per run.
This first version implements `2026-10-individual-minima-v1`: 153 points, at least 10/30 per project, two fully completed lecture activities in each phase, a submitted self/peer assessment earning at least 6/12 with at least 1/3 contribution per phase, and at least 50% overall.
Grades use the published 50/60/70/80/90% thresholds.

An ungraded record is pending, not zero.
Missing work requires an explicit assessment with zero scores and a reason.
Before releasing a phase, staff must assess every registered group and student against the current evidence.
The instructor gradebook shows provisional totals; students and CSV exports use released assessments.
A high total cannot produce a passing grade while a mandatory requirement is unmet, and pending assessments leave the final grade blank.

Use **Approved individual arrangement** in the gradebook to record a private replacement activity/reason, lecture minimum, assessment minimum, contribution minimum and available individual points for a phase.
The available points cannot fall below earned individual points.
Restoring the standard requirements uses the same form and records another reason.
The self/peer submission itself remains required, including when a replacement activity is used.

Every saved revision records its actor, timestamp and reason.
Concurrent saves use revision checks; a stale browser tab cannot overwrite another submission.
Administration checks the fields owned by each workflow, with groups and schedules checked separately for each phase.
A settings form opened before a roster addition can still save without losing that addition.
Two edits to the same settings form conflict; the rejected form retains its text until the instructor reloads.
The final database write also checks the current whole-course revision, so a change made while the server is processing a save produces a conflict.
Every successful administration save retains a complete course snapshot in history.
The legacy staff-only `PUT /api/courses/:id/setup` endpoint remains for existing integrations and local Worker verification; it uses the same validation rules and requires the whole-course revision.
Changed evidence makes its old assessment stale and returns that component to pending until staff reassess it.
The previous score and evidence remain available in **Record history**.
History lists revision metadata first and loads a chosen snapshot on demand; the latest 1,000 entries appear in the dialog, while all snapshots remain stored and are retrievable by revision ID.
Frozen membership and an implementation deadline that has opened the audit are locked; corrections to historical group membership require a separately designed administrative process.

**Export released grades (CSV)** includes student number, name, stable identity, earned/available points, percentage, final grade, pending assessments and unmet requirements.
An assessed failure is grade `0`; an incomplete assessment has a blank grade.
CSV cells are quoted and spreadsheet formula prefixes are neutralised.
There is no institutional grade-system integration yet.

## Production configuration

The implementation is ready for configuration; this change does not provision resources or deploy it.
The book can still deploy without course bindings, in which case the course API reports that storage is unavailable.

1. Create a dedicated D1 database and private R2 bucket:

   ```bash
   npx wrangler d1 create scalability-book-course
   npx wrangler r2 bucket create scalability-book-course-files
   ```

2. Add `COURSE_DB` to `d1_databases` in `wrangler.jsonc`, using the returned database ID and `migrations_dir: "course-migrations"`.
   Add the `COURSE_FILES` R2 binding using that bucket name.
   If chapter exercise storage is enabled, retain its separate `LEARNING_DB` binding and migration directory.
   Do not use `wrangler.course.jsonc` for production: its database ID is an isolated local placeholder and it omits the book's routes and feedback bindings.
3. Apply the course migration:

   ```bash
   npx wrangler d1 migrations apply COURSE_DB --remote
   ```

4. Keep the existing GitHub OAuth and session secrets from [feedback setup](feedback-setup.md).
   Configure `COURSE_ADMIN_GITHUB_LOGINS` separately from `ADMIN_GITHUB_LOGINS`, using only course administrators' GitHub usernames.
   This bootstrap allowlist grants access to all course runs; per-course staff use stable numeric IDs.
   Remove a bootstrap login if it changes or is no longer an administrator.
5. Enable Worker observability in the production config and deploy through the existing `npm run deploy` command.
   Create a run and verify its roster with a real student account before collecting assessed submissions.

Keep R2 public access disabled.
Choose the institution's required storage location, retention and backup arrangements before collecting student records.
Back up the D1 database and R2 bucket together; grade CSV exports alone do not preserve portfolios, source archives or assessment history.
No email delivery, automatic repository cloning, AI grading, self-enrolment or institutional identity integration is included.

## Verification

```bash
npm run test:unit
npx playwright test tests/e2e/course-workspace.spec.ts --project=chromium
npm run build
npm run validate
```

The browser test covers roster preview and incremental enrollment, separate group allocation and phase administration, student archive freezing, private portfolio submission, staff scoring, missing-work assessments, incomplete release rejection, phase release, CSV download, mobile layout and accessibility.
API tests cover independent administration saves, import preview without writes, conflicts, authorization, generated group identifiers, three-phase grades, mandatory minima, approved arrangements, privacy, timed access, immutable snapshots, optimistic concurrency and corrections.

To check real local D1/R2 bindings, use the separate local configuration:

```bash
npx wrangler d1 migrations apply COURSE_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state
npx wrangler dev --config wrangler.course.jsonc --local --ip 127.0.0.1 --port 8788 --persist-to /tmp/course-worker-state --var SESSION_SECRET:local-course-smoke-test-only --var COURSE_ADMIN_GITHUB_LOGINS:course-smoke-admin
```

In another terminal, run `node scripts/check-course-worker.ts`.
The credential above is a public test-only value for the loopback instance; it must never be used for a deployed session secret.
The check only accepts a loopback URL and verifies signed sessions, guarded D1 writes/history, streamed R2 uploads/downloads, frozen revisions and access isolation.
Stop the local Worker afterwards.
The local configuration deliberately matches the pinned book runtime's compatibility date; upgrade the runtime and both configurations together.

Regenerate binding types after configuration changes:

```bash
npx wrangler types worker/course-env.d.ts --config wrangler.course.jsonc --include-runtime false --env-interface CourseBindings
```

Cloudflare references: [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [generated binding types](https://developers.cloudflare.com/workers/wrangler/commands/#types).
