# Course submission and assessment system

The course workspace is part of the book site, outside the book's reading flow.
Open `/admin/courses/` to manage runs and `/course/` as a student.
Both pages use the same API; staff membership controls administration, rather than the URL.
Book feedback moderators do not automatically have access to course records.

## Agreed revision and current behavior

This guide describes the course workspace with four focused administration forms, institutional enrollment and email sessions, and retained GitHub staff access.
The [ADRs](adrs/README.md) record the agreed revision: separate administration workflows, institutional roster import and email magic links, three-person group formation, phase checklists, Cloudflare course email, and an isolated teacher simulation available in the website and local development.
Institutional imports, corrections, account activity and the magic-link flow work with local mock mail and a gated Cloudflare mail adapter.
Student proposals, confirmations, instructor allocation and publication now share the real course workspace.
Late arrivals have recorded catch-up plans and review tasks.
Submission forms include versioned common/phase checklists and staged technical evidence.
Teacher simulation has isolated storage, manual controls and preparation/grading-review presets in both runtimes, plus a verified browser walkthrough of all three teaching phases.
Withdrawals retain history, create group-review tasks and receive no final grade.
Production login delivery remains disabled pending external verification; incoming email uses server-only forwarding configuration.
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
  Duplicate identities, student IDs, emails and optional GitHub logins are rejected before saving.
  **Add or correct one student** handles later individual enrollment and identifier corrections.
  The roster shows whether email access is ready and the last successful email sign-in.
  **Enrollment, catch-up and withdrawals** records catch-up plans, departures and their private group-review notes.
- **Groups** allocates students for the selected phase and lists those awaiting allocation.
  Open the proposal period, review confirmations and private matching notes, save the allocation, then publish approved groups.
  Add group cards and select their members.
  New identifiers are generated automatically, starting at `group-01`; generated numbers are not reused after removing an unused group.
  Later phases can reuse Establish groups and their identifiers.
- **Phase administration** edits only the selected phase's deadlines and audit assignments.
- **Course settings** edits the run name and staff access and displays the retained published rubric.

The review queue links students awaiting allocation, missing catch-up plans, withdrawal arrangements and incomplete audit arrangements to the relevant workflow.
Course creation, roster import and group allocation are separate operations.
Forms and navigation controls pause during a save or course refresh, preventing edits to a form that the response will replace.
Selecting the current phase preserves the open form and its unsaved values.
The local instructor identity is `github:1` / `local-editor`.
Data persists in `.local/course.sqlite` and `.local/course-files/`; restarting the server preserves it.
These records are separate from chapter exercise answers and reader feedback.
For legacy GitHub testing, start a second server with `PORT=3001 COURSE_LOCAL_USER_ID=2 npm run dev` and enroll numeric ID `2`.
For an anonymous browser that exercises email sign-in, use `PORT=3001 COURSE_LOCAL_USER_ID=0 npm run dev` against the same local data directory.
The development server is restricted to loopback; its local identities are not an authentication method for deployment.
The browser tests explicitly enable `COURSE_TEST_IDENTITIES=1`; the deployed Worker ignores the test identity header.

## Institutional enrollment and sign-in

The canonical institutional CSV has four columns:

```csv
student_id,first_name,last_name,email
S001,Alice,Example,alice@example.edu
S002,Bob,Example,bob@example.edu
```

Paste an institutional export, select **Read CSV columns**, and map its columns to these four fields.
Extra columns are ignored.
Use **Preview roster changes** to inspect additions and corrections before saving.
Imports match the institutional student ID within the current course run, rather than sharing identities across institutions or runs.
New records receive an opaque `student:<UUID>` identity, separate from student ID, email, names and group allocation.
GitHub login is optional profile information and cannot grant access to a new institutional account.

To migrate an existing GitHub roster, import institutional details with the same student IDs already stored as student numbers.
Review the corrections in the preview: the existing internal `github:<numeric-id>` keys are retained as opaque historical identities.
Existing submissions, frozen membership, portfolios, grades and history are not rewritten.
If a student ID needs correction, use **Correct student** on that existing row before importing more records.
The manual form pins the internal identity; it does not merge records based on a reused email or name.
Conflicting IDs/emails are rejected for instructor resolution.
The legacy `student_number,name,github_id,github_login` CSV and setup API remain supported for existing integrations.
Legacy imports preserve previously added institutional details.
Staff continue to sign in with GitHub and are entered as `github:<numeric-id>` in **Course settings**.

The website-wide **Account** entry presents GitHub sign-in and enrolled-student email access together.
An instructor's course link supplies the run ID; students can also enter it explicitly or choose an accessible run when signed in.
A remembered course is a tab navigation preference, not proof of enrollment.
Email requests from a reading/peer activity retain a validated internal return location; confirmation returns there instead of the course overview.
Requests from the ordinary course workspace retain its existing overview behavior.
When email opens another tab, unfinished notebook, assistant and exercise writing remains in the original tab; return there and choose **Check sign-in again** if necessary.
GitHub and course sessions can be signed out independently through Account.

Verified email students can also save private chapter exercise answers under their course run and stable student identity.
Existing GitHub answers keep their original ownership; when both sessions are active, the account view identifies GitHub as the selected exercise owner.
Signing out of GitHub selects the email enrollment's separate answers after an explicit in-place load; records are never merged by email or profile name.
Email access does not grant feedback moderation or staff permissions, and does not move notebook records or provider credentials to course storage.

Give students the course workspace URL shown in **Students**.
Students request a magic link using their imported institutional email; there is no registration or self-enrollment flow.
Valid, unknown and per-address-throttled requests have the same public response.
A link expires after 15 minutes and can be consumed once, including under concurrent verification attempts.
Opening the link displays a confirmation button rather than consuming it on a GET, so ordinary link prefetching does not sign the student in.
The credential is in the URL fragment, is removed from the displayed URL, and is never included in HTTP request URLs.
Verification sends it in a bounded POST body and creates a seven-day HttpOnly, SameSite=Lax session; deployed cookies also require HTTPS.
Email sessions grant student access only in that course, even when a historical identity is also listed as staff.
Institutional email and student ID are hidden from other students' directory records.
An email correction revokes links and sessions for the former address while keeping academic record ownership.

Request limits are three links per address/course and 30 requests per client IP in a ten-minute window; verification permits 15 attempts per IP in that window.
Counters and token consumption use atomic SQL operations in both local SQLite and D1.
Production delivery is deferred through Worker `waitUntil`; a link becomes usable only after the mail adapter accepts delivery.
A delivery error discards the pending link, logs a credential-free event and retains the generic public response.
There is no automatic mail retry; students can retry within the same bounded limits.
Expired credentials and counters are removed when processing new link requests.
Auth records live in dedicated tables from `course-migrations/0002_course_auth.sql`, outside submission records and revision history.

Local development always uses mock mail.
Request a link in the anonymous browser, then use **Open local mock inbox** from the instructor's Students view and follow its link in that browser.
The inbox is staff-only, retains the latest 1,000 messages locally, and is unavailable in the production Worker.
The deployed request route reports that email is not configured until both the `COURSE_MAIL` binding and `COURSE_EMAIL_ENABLED: "true"` are present; it never uses the local mock inbox as a fallback.
This local flow is not yet the isolated teacher simulation in ADR-007.

## Late arrivals and catch-up

New students receive a recorded enrollment timestamp.
They are flagged as late when imported after a formation deadline or publication, after any implementation has frozen, or after the Establish implementation deadline.
They remain in the selected phase's unassigned queue until staff allocate them.
Existing identities keep their enrollment metadata through roster corrections; historical rosters without an arrival timestamp retain an unknown date.

The review queue lists late arrivals without a recorded plan.
Select **Record catch-up for …** to open that student's arrangement in **Students**, agree the plan with the student, and save it with a private staff reason.
The roster's **Enrollment arrangement** action opens the same form.
Staff can also mark an earlier late arrival or correct that flag with a reason.
An empty plan leaves a late arrival in the review queue.
Successful saves retain the prior course snapshot, actor, timestamp and reason; stale roster/arrangement edits conflict and preserve the browser's text.
Settings and group changes use their separate administration fingerprints.

The student sees their plan in **My progress**.
Other students cannot read enrollment dates, the late-arrival flag or catch-up plans; staff reasons remain private even from the affected student's view.
Recording a plan does not alter groups, deadlines, frozen evidence, assessment freshness or passing requirements.
Allocate students in an unfrozen phase and record any approved replacement activity separately in the gradebook.

## Withdrawals and reinstatement

In **Students**, open **Enrollment, catch-up and withdrawals**, select the student and choose **Mark student withdrawn** with a private reason.
This records a departure date on their existing identity without deleting submissions, files, portfolios, assessments or history.
Roster imports and corrections retain the withdrawal; omitting the student from an import does not reactivate them.

Withdrawn students receive no final grade, including when they already have assessment records.
The gradebook shows **Withdrawn**, and CSV exports retain an explicitly marked row with blank points, percentage and final grade.
Withdrawal is separate from a failing grade or an exemption from passing requirements.
Only active students and groups with active members require current assessments for release; staff cannot create new individual assessments for withdrawn students or project assessments for groups with no active members.

The review queue shows **Review withdrawal for …** until you record the group and audit arrangements with a private reason.
Review remaining members, later-phase allocations and staff audit fallbacks.
Record the actual group/schedule changes in their respective forms; marking the review complete does not make those changes automatically or block grade release.
Frozen membership, source and assessment provenance remain intact.
Correct an unfrozen allocation or approve a smaller continuing group in a later phase when transfer would be impractical.
**Reuse Establish groups** omits withdrawn members and empty teams; a changed non-three-person allocation needs a new explicit size exception.
New proposals and allocations cannot add withdrawn students, and invitations containing a withdrawn member cannot gain further confirmations.
Existing allocated proposals remain historical consent records after approved membership corrections.

The affected student sees their departure status and can read saved work under the existing privacy and access windows, but cannot submit or upload new work.
Staff reasons and group-review notes stay private; other students cannot read enrollment metadata.
If the departure was entered incorrectly, choose **Reinstate student** with a reason.
Reinstatement retains the history and restores ordinary allocation, assessment and passing requirements without changing deadlines or waiving work.

## Instructor group allocation

In **Groups**, set the formation deadline and the end of its correction window, and select **Open group formation**.
Both dates must precede the phase's implementation deadline.
The student **Groups** tab offers **Propose a group** and **Assign me a group**, accepting partial proposals.
The proposer confirms their own participation; every invited member confirms separately.
Editing a proposal resets confirmations, and a student can confirm only one pending proposal at a time.
Each preference/proposal carries a revision; stale responses conflict without silently overwriting another response.
Student changes update only their own preference or an authorized proposal on the latest snapshot, retaining course history.

Students may opt in to show their name as available to join.
Meeting availability and support constraints are private to that student and staff; other students see only the name/opt-in signal.
Invitations are visible only to their proposed members and staff.
Student mutation responses acknowledge a save without exposing the private course snapshot.

Use **Add proposal to allocation** after all proposed members have confirmed.
A confirmed pair can be completed with an instructor-allocated third member.
Allocate others through group cards, reviewing **Private matching notes and allocation requests** as needed.
Group cards display the saved identifier and a multiple selection of enrolled students.
Each student belongs to one group per phase.
Three members is the default; a fourth or smaller group needs an explicit instructor exception recorded with the allocation.
New or changed groups cannot exceed four members, including through the legacy setup API.
Unchanged historical larger groups retain their frozen evidence; use later phases to bring new allocations within policy.
An optional display name does not change the generated identifier (`group-01`, shown as **Group 01**).

After saving, enter a formation change reason and select **Publish approved groups**.
Every active student needs an allocation, and size exceptions need recorded approval before publication.
Publication closes student proposals and announces approved groups and the correction window.
Provisional allocation in this flow does not grant submission/upload access and is hidden from students until published.
Initial allocations through the focused Groups API require opening formation first.
Retained legacy setup integrations remain staff-approved allocations without a proposal period; they enforce size rules and immutable membership/history constraints.

Use **Reuse Establish groups** when membership is stable; future-phase membership can change.
Open and publish formation for each later phase when using the focused workflow.
Reused identifiers, display names and exceptions remain; earlier proposals do not become new invitations.
Once a submission freezes, change its membership in a later phase to retain original submission and assessment ownership.
Unfrozen allocations can be corrected by staff with a recorded reason; announced correction dates remain in history.
Clear audit assignments before removing an unused group.
Groups with saved submissions, audits or assessments cannot be removed.
Approved members can save a short shared working agreement in the student Groups view.
Agreement revisions use the course store/history, are private to the group and staff, and contribute no rubric points.
Agreement saves require an existing group, including staff saves; a nonexistent identifier creates neither a record nor history.
Students can read and edit agreements only for their published allocation.
If staff removes an unused allocation, its agreement history remains available to staff without granting student access to the absent group.
Late imports reach the unassigned queue and the [catch-up workflow](#late-arrivals-and-catch-up); departures use the [withdrawal review workflow](#withdrawals-and-reinstatement).
The audit field uses `group-01 > group-02`.
Circular matching produces one incoming and one outgoing assignment per group; the instructor can edit it before audits are submitted.
With only one group or a missing frozen implementation, staff arrange and record a fallback audit.

## Solo route across all three phases

Solo participation is an individually approved exception.
The public grading page publishes the standard group criteria; staff agree any equivalent assessment arrangements with the student in writing before work begins and retain them in the private portfolio.

The [October to December 2026 pilot review pack](solo-pilot-2026/README.md) provides a draft study agreement, dated milestones, independent lecture activities and an instructor preparation checklist for a pre-course solo run.
Complete its operational choices and retain the agreed arrangement privately before using it with a student.

New runs use requirements `2026-10-v2` and rubric `2026-10-solo-equivalence-v2`.
Historical runs keep their pinned requirements and rubric; do not rewrite them to enable this route.
The [project introduction](../specifications/00_introduction.md#approved-solo-route) and all three phase briefs describe the work for an allocated exception; the [assessment equivalents below](#solo-assessment-equivalents) guide the individual agreement.
The common application, three fresh implementations, workload, points and passing minima remain required.

1. Agree a realistic workload/schedule, supported environments, a human reviewer and a short instructor discussion for each phase.
   In **Groups**, allocate exactly one student, select **Approved solo route**, record instructor approval in the size exception and save/publish the allocation.
   **Reuse Establish groups** retains the solo route for later phases; review and publish each phase normally.
2. In **Phase administration**, assign the student's outgoing audit to another course group when possible.
   Otherwise, in **Group submission → Solo route: independent review and reference audit**, supply a legitimate reference repository, full commit hash, setup/validation and a phase-specific change probe with the common tool policy.
   Reference fields can remain empty when a course group is assigned.
   Save the human reviewer and arrangement reason before work freezes where practical.
3. The student freezes source and initial evidence through the usual submission flow.
   Reference details remain hidden from students until the implementation deadline opens the audit window.
   Once the student's source freezes, an existing reference assignment is retained; the student cannot audit the same implementation commit.
4. Conduct the instructor discussion and independent human audit.
   Record the completed prediction/challenge/check/acceptance discussion and incoming audit in the solo review form.
   The report is bound to the student's frozen revision.
   The student submits their outgoing audit in **Assigned audit**, whether it targets another group or the supplied reference, and answers the incoming findings in final technical evidence.
5. **My portfolio** uses independent implementation review and solo reflection prompts.
   The private individual assessment uses the four solo equivalents, retaining the twelve-point assessment maximum, contribution minimum and lecture requirements.
   Ordinary solo assessment requires the completed discussion and incoming/outgoing audits; incomplete work can be explicitly recorded as missing with zero scores and a reason.
6. Assess, release and export through the existing gradebook.
   A changed solo review or outgoing audit makes both project and individual assessments stale until reassessed, in addition to the ordinary submission/portfolio revision checks.

Solo review arrangements are staff-written records at `/api/courses/:course/solo-review/:phase/:group`.
Student audit reports use the existing audit API and preserve the supplied reference metadata and commit.
The student's instructor discussion and portfolio stay private to that student and staff; incoming technical audit reports become available with class technical work after the audit window closes.
Route changes are blocked after frozen source or review/portfolio evidence exists; choose a different route in a later phase instead of reinterpreting saved work.
Recorded human-review evidence establishes what staff attested, rather than automatically establishing a completed learning outcome or awarding points.
The [solo API walkthrough](../tests/course-solo.test.ts) covers all three phases through grade release/export, and [browser checks](../tests/e2e/course-solo.spec.ts) exercise allocation, review, reference audit and portfolio/assessment prompts.

### Solo assessment equivalents

For an explicitly allocated exception on the solo rubric edition, agree the following four criteria in the same score positions and with the same twelve-point maximum:

| Criterion                                       | Points | Full-credit evidence                                                                                                                                                    |
| ----------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence-based self-assessment                  |    0–3 | Concrete decisions, completed and missed commitments, learning and next improvement linked to the student's work.                                                       |
| Useful independent implementation review        |    0–3 | Specific, actionable findings from the outgoing reference or cross-group audit, supported by checks and clear limitations.                                              |
| Response to feedback and solo reflection        |    0–3 | A considered response to the independent human audit/instructor challenge, one adjustment and a working condition that affected the outcome.                            |
| Reliable contribution and accountable ownership |    0–3 | Instructor judgment against project history, checks, the portfolio and completed discussion shows that the student understands and accepts responsibility for the work. |

The private portfolio's review field holds independent-implementation review evidence rather than invented feedback to teammates.
The instructor records a completed discussion and incoming independent audit, and the student submits the outgoing audit before ordinary solo assessment.
Incomplete work may be explicitly assessed as missing with zero scores and a reason; it does not waive passing requirements.
A reviewer or agent recommendation is evidence, not an automatic grade.

Keep the three 30-point projects, nine lecture activities, 153-point maximum, grade thresholds and per-phase minima.
The six-point assessment minimum and one-point contribution minimum apply to these equivalent criteria.
The individual portfolio itself remains required, and instructor check-ins do not automatically satisfy lecture participation.
An approved exception changes the evidence for human collaboration criteria; it does not claim that the student practiced team collaboration.
Historical runs retain their published rubric and requirements.

## Submission and access flow

1. A group member uploads a source archive, supplies the full commit hash, supported setup/validation and initial evidence, then freezes the implementation.
   Submit the smallest complete reproducible bundle: source, relevant tests, synthetic fixtures, manifests/lockfiles, migrations, setup scripts, example configuration and curated technical evidence.
   Exclude installed dependencies, `.git`, caches, reproducible output, model weights, secrets and personal data; document necessary vendored/generated exceptions.
   Inspect the file listing and reproduce the supported unpack/install/initialize/run/validate path in a clean directory.
   The archive SHA-256, timestamp and registered phase membership are retained.
   The uploader attests that the archive matches the revision; the system does not clone or execute submitted code to verify that claim.
2. After the implementation deadline, assigned auditors can download the target's frozen archive and inspect setup/evidence.
   Their report identifies the frozen record revision and records setup time, prior inspection, tools, change-probe timing and findings.
3. Authors complete the technical evidence index, checklist and audit response by the evidence deadline.
   Upload final technical attachments using **Attach final technical evidence**, select the files to attach, and save a private evidence draft or submit the completed evidence and response.
   The revision preserves the frozen source, setup, initial evidence, initial checklist and membership.
   Evidence drafts and unattached files remain private to the group and staff; submitted attachments follow the same auditor/class access as the frozen record.
   Private portfolio files cannot be attached to technical evidence.
   Compare selects existing frozen A and B records; the references retain their frozen revision and open a read-only technical view without duplicate archive uploads.
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
The uploaded archive supplies a stable course copy for auditors and classmates; a public repository or personal credentials are not required.
An optional HTTPS repository URL supplies context and does not replace the course archive.
The read-only `GET /api/courses/:id/submission/:phase/:group` route enforces the same timed access and draft redaction; `frozenRevision` may pin the implementation identity while the response includes currently submitted final evidence.

The limits are 100 students per run, 50 groups per phase, four members for new/changed allocations, 20 MiB per file and 12 uploads per owner/phase.
Unchanged historical larger groups are retained.
Source and final evidence share the upload count; submission records allow 64,000 serialized characters, and JSON request bodies remain bounded at 96 KiB.
Keep technical evidence inside the source archive when practical and compress large media before uploading.
Staff must manage storage cleanup outside the UI; no destructive removal of original evidence is exposed in this version.

## Run requirements and evidence checklists

New runs retain the current requirement edition, `2026-10-v2`.
The course has not run yet; this is the sole pre-course contract and there are no earlier run contracts to maintain.
It assigns a large model to Establish, a small model to Challenge, and a declared small/large or mixed-model fleet to Compare.
The pre-course scope review retains three fresh builds, maintained specifications and an evolving ADR-style log, with a standard six-field ownership card in each phase's evidence index.
Required pressure work follows one primary procedure across A–B–C, a bounded correctness or recovery case in B, and one measured scaling response with its new obligation checked in Compare.
Keep both bounded audits and one evidenced friction finding with a checked improvement or justified follow-up per phase.
Actual fleet-run analysis and supplied matched-trace analysis remain required; trace import, student-run matched pairs and additional pressure scenarios are optional and unnecessary for grade 5.
Students may reference an exact retained course-configuration version, confirming actual models, routes and environment and recording deviations and material exposed settings.
The optional course benchmark runner and dedicated private audit reference are locally implemented and validated; [course-tooling.md](course-tooling.md) owns their boundaries, release preparation and evidence.
The supplied matched-trace package still needs preparation; local tooling validation does not establish a completed model experiment or released audit assignment.
The workspace's project guide, rubric and checklist links open the archived documents for that edition.
**Course settings** shows the edition; ordinary administration cannot replace it on an existing run.
See [requirements/README.md](../requirements/README.md) for publication/versioning.

Common and selected phase entries appear beside preparation/final-evidence forms and in technical review views.
Choose **Evidence located** with a path, link or index reference, **Missing / incomplete** with an explanation, or leave **Not indexed**.
One artifact can serve several entries; entries do not require separate uploads and presence does not award points or establish quality.
Students can freeze honestly incomplete work and submit later evidence with declared gaps.
The server does not execute source or infer safety/completeness from archive filenames.

The checklist indexes the complete common evidence categories, A's large-model workflow/claims, B's small-model comparison/pressures/case transfer/Little's Law, and C's model assignments/fleet/trace/paired contrast, separate application/workflow models, scaling/deployment and conditional decision.
The detailed archived briefs and retained rubric remain the requirements; private individual portfolios have their separate workflow.
Freezing retains the initial checklist; final evidence stores its own checklist without replacing the original.
Changing final evidence creates another revision and makes prior project assessments stale until reviewed.

## Review and grading

### Scoring records and feedback

Assess one project bundle per group and phase.
Record its group identifier, frozen membership, assessed implementation revision, criterion scores, brief reasons, and missing evidence.
Link that result to each member’s individual record rather than assessing duplicate project submissions.
Keep private individual portfolios together by phase, scoring diary entries by lecture and self/peer assessment by criterion.

Release the group project breakdown and feedback to the group, and each student’s individual breakdown, total, and status against every passing requirement to that student.
Show completed lecture activities and each phase’s assessment and contribution scores so unmet minima are visible.
Confidential peer reports remain available to staff; the class submission index excludes scores and private records.
Retain the original evidence, score, and reason when correcting a result or applying an approved arrangement, and explain the adjustment to affected students.

### Review, release, and grade export

The review queue shows frozen implementations, missing incoming audits, author responses, private portfolios and ungraded or stale assessments.
Staff score each criterion from the [published rubric](../specifications/grading.md), with reasons and missing evidence.
The contribution criterion is an instructor judgment; peer reports are not automatic grade votes.
One project score applies to every frozen phase member.
Lecture participation, diaries and self/peer assessments remain individual.

The rubric is versioned per run.
The sole supported rubric, `2026-10-solo-equivalence-v2`, retains 153 points, at least 10/30 per project, two fully completed lecture activities in each phase, a submitted individual assessment earning at least 6/12 with at least 1/3 contribution per phase, and at least 50% overall.
Individually approved solo exceptions use the [agreed assessment equivalents](#solo-assessment-equivalents) in the same score positions.
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

Course storage is configured separately from the book and incoming email.
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
Production email delivery needs the separate mail setup below.
Automatic repository cloning, AI grading, self-enrollment and institutional single sign-on are not included.

### Course mail setup

Both mailboxes are server-only configuration: `COURSE_EMAIL_FROM` is the course sender, reply-to and exact incoming recipient; `COURSE_EMAIL_FORWARD_TO` is the instructor's existing Fastmail-hosted destination.
Keep their actual values out of source, documentation, tests and public website assets.
Use Worker secrets in production and ignored local environment files when configuring the service.
The tracked `.dev.vars.example` contains synthetic values only.
Cloudflare still holds the exact incoming address in its routing rule and the verified destination in its account settings.

On 2026-10-06, both address secrets were configured on the production Worker, the Fastmail destination was verified, and the exact incoming rule was activated with catch-all routing disabled.
Cloudflare reports Email Routing ready and Email Sending enabled for the course domain.
Production configuration includes `COURSE_MAIL` with login delivery explicitly disabled.
Later that day, public DNS resolution confirmed the required sending records, and the instructor confirmed Workers Paid eligibility and inbox arrival for independent incoming mail and the Cloudflare sending-to-course-inbox check.
The normal sign-in form was verified with one instructor-controlled enrollment in a temporary isolated D1 database and the sending binding restricted to the instructor's verified destination.
The instructor confirmed the configured sender and reply-to, inbox delivery, successful explicit confirmation and rejection of link reuse; D1 recorded successful access and consumption of the link.
No raw credential or full magic-link URL was retained in the verification record.
The regular Worker configuration was restored with login delivery disabled and no verification database binding.
The temporary D1 database and local verification enrollment records were removed.
This check establishes mail readiness; production course storage and institutional delivery still require the rollout steps below.

`worker/course-mail.ts` uses native Cloudflare Email Sending through `COURSE_MAIL`.
It accepts a configured sender on the course domain and sign-in links for `https://scalableweb.dev/course/`.
Messages contain plain text and escaped HTML, the course name, an explicit confirmation instruction and UTC expiry.
Recipients see the sender and reply-to in their private email messages.
No SMTP password or Email Sending API token is needed by the Worker.
Application logs contain a `course_login_delivery_failed` event and course ID on failure, without the address, credential or provider error body.
Cloudflare accepting a send is not proof that it arrived in the student's inbox; use provider delivery/bounce logs to diagnose failures.

`worker/course-forwarding.ts` handles incoming messages through the Worker's `email()` entry point.
It checks the configured recipient and forwards the original message stream using `COURSE_EMAIL_FORWARD_TO` without reading, storing or logging message contents.
Missing or invalid configuration, unknown recipients and a destination equal to the course inbox are rejected.
Provider errors are replaced with a generic error that cannot contain the destination or message metadata.
Incoming forwarding does not depend on course databases, student enrollment or the login-delivery flag.

Configure the incoming path:

1. Inspect existing MX and authentication records before enabling Email Routing for `scalableweb.dev`; preserve existing mail arrangements.
   Cloudflare adds Routing's root-domain MX/SPF/DKIM records.
2. Add the instructor's receiving mailbox as a Cloudflare destination and click its verification email.
   Destination verification applies to every mailbox provider; Fastmail requires no SMTP integration here.
3. Configure both private values with interactive secret prompts:

   ```bash
   npx wrangler secret put COURSE_EMAIL_FROM
   npx wrangler secret put COURSE_EMAIL_FORWARD_TO
   ```

   For unattended setup, use `wrangler secret bulk` with an ignored, access-restricted JSON file populated from private environment configuration.
   Do not put values in command arguments or commit that file.

4. Deploy the Worker with these secrets retained, then create an exact routing rule for the configured course address: **Send to a Worker** → `scalability-book`.
   Leave catch-all routing disabled; the handler also checks the exact recipient independently.
5. Send an incoming question from a different account than the forwarding destination and confirm arrival in the instructor's inbox.
   Cloudflare route status alone does not prove inbox delivery.

Before live course sign-in:

1. Recheck [Email Sending availability and pricing](https://developers.cloudflare.com/email-service/platform/pricing/) for the selected account.
   Sending to arbitrary institutional recipients requires Workers Paid; a successful send to a verified address alone does not establish that eligibility.
   `npx wrangler email sending list` is a read-only domain inventory.
2. Onboard the domain for Email Sending and verify its separate `cf-bounce` MX/SPF, sending DKIM and DMARC records through the [domain configuration guide](https://developers.cloudflare.com/email-service/configuration/domains/).
3. Retain the transactional binding in production configuration alongside the book and course bindings:

   ```jsonc
   "send_email": [{ "name": "COURSE_MAIL" }]
   ```

   The server chooses the sender exclusively from `COURSE_EMAIL_FROM`; requests cannot override it.
   For a controlled first check, apply a temporary destination restriction privately in Cloudflare and enroll only the instructor-controlled recipient in a test run.

4. Enable `COURSE_EMAIL_ENABLED: "true"` only after mail setup and course storage are ready and a controlled delivery check is authorized.
   Missing binding or sender configuration leaves sign-in delivery unavailable.
5. Request a link through the normal sign-in form, inspect its sender and inbox delivery, confirm sign-in and verify reuse rejection.
   Record results without saving credentials or full magic-link URLs.
   Remove the temporary recipient restriction only when starting institutional delivery.

Disable login delivery by setting `COURSE_EMAIL_ENABLED` to `"false"` and deploying if a sender or service problem occurs.
Check enrollment/address corrections and provider delivery, bounce and suppression logs before asking a student to request another link.
Requests remain bounded by the application limits above; no automatic retry or staff endpoint reveals production login credentials.
Human replies use the instructor's existing mailbox identity, as agreed; forwarding does not create an additional Fastmail sending identity.
The [mail ADR](adrs/implemented/ADR-006-use-cloudflare-for-course-email.md) records the provider choice, verified integration and rollout boundary.

`wrangler.course.jsonc` validates the local email binding with delivery disabled.
Do not enable remote mail in development or teacher rehearsals; both use their own scoped mock inboxes.

## Teacher simulation

In the instructor workspace, choose **Open teacher simulation** when its resources are configured.
Local application development initializes a separate `.local/course-simulation/` directory automatically; deployed/local Worker use requires the explicit setup below.
Only a verified GitHub course administrator or instructor can open simulation or use its controls.
Development uses the existing loopback instructor identity; production ignores test identity headers.
An institutional student session alone does not authorize simulation.

The persistent **Simulation** banner identifies the rehearsal and its clock.
**Teacher controls** can start a preparation or grading-review scenario, choose a compact or larger cohort, start an empty rehearsal, switch between instructor and enrolled mock students, advance time, and open a mock inbox.
Create a course through the ordinary form and import a synthetic institutional CSV through **Students**.
The group, submission, audit, portfolio and grading forms use the existing authorization and domain handlers.
Role switching retains student permissions; **Return to instructor** restores the teacher role and revokes the current simulated email login while retaining the real GitHub session.
Use **Email sign-in**, request a mock student's link, then follow **Confirm mock sign-in** from the banner's inbox to test the actual single-use login flow.
Advancing the clock controls course windows and mock credential expiry; it does not change saved schedules or real time.
The clock only moves forward; restart selects the chosen scenario's starting time.
Empty/preparation rehearsals start at `2026-10-05T08:00:00.000Z`; grading review starts at `2026-12-13T08:00:00.000Z`.
Role and clock controls are shared by this instructor's browser tabs and use revision checks.

Each instructor has their own record/file/auth/mail namespace.
Reset selects a new generation and clears its simulated login; old-generation requests fail.
It does not delete or reset any backing resource or live course.
Old synthetic generations remain stored but are inaccessible through the application; resource cleanup is a separate operator task.
The simulations do not load real rosters as presets or select live mail as a fallback.
CSV exports add an `environment` column containing `Simulation` and use `SIMULATION-course-grades.csv`; numerical grading is unchanged.
**Leave simulation** returns to the live workspace and retains the instructor's real GitHub session.
Malformed environment/generation context is rejected; course requests, file links and exports do not default to live routes.

### Starting scenarios

The default is **Course preparation** with 10 mock students; **Larger** supplies 31.
All emails use the reserved `.invalid` domain and all institutional numbers start with `SIM`.
The names, evidence and scores are authored fixtures, never copied from a live course.

| Scenario           | Starting state                                                                                                                 | What to inspect                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course preparation | Roster imported; Establish formation open; one confirmed trio allocated privately                                              | A four-person request needs allocation and an exception; a pair awaits consent; remaining students request allocation privately; publication requires everyone assigned.            |
| Grading review     | Three phases of frozen source, audit reports, technical responses, private portfolios and assessments; A/B released, C private | Late enrollment, a withdrawal review task with retained work and no final grade, explicit missing work, stale assessment and full project scores that still fail individual minima. |
| Empty rehearsal    | No courses or students                                                                                                         | Walk through creation/import using the downloadable mock CSV and source in Teacher controls.                                                                                        |

Fixture edition `2026-10-v2` identifies the starting data and scenario construction, including the grading-review withdrawal case.
Restart regenerates identities/revisions but retains the edition's authored content, deadlines and expected outcomes.
When those meanings change, bump the fixture edition; an unfinished preparation from an older edition must be restarted.
Preparation uses the existing course handlers with an in-memory adapter to validate every change, then replays their accepted writes/history into a private generation in six-operation batches.
Records become available only when all batches finish.
If preparation is interrupted, reopen Teacher controls and choose **Continue preparation**; accepted writes are reused, not duplicated.
A concurrent reset invalidates the old control revision and keeps staged records inaccessible.
This bounded persistence does not make scenario construction compatible with the Free plan's CPU budget; deployed presets require a Workers Paid CPU allowance.
See [Workers CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) and [D1 invocation limits](https://developers.cloudflare.com/d1/platform/limits/).
Local simulation does not require paid infrastructure.

The source download contains a tiny dependency-free Node project with a lockfile, tests and a reproducible demo.
Unpack it, run `npm ci --ignore-scripts --offline`, `npm test`, and `npm run demo` with Node 24 or later.
The README states what the fixture lacks; it is not a complete project submission.
Rehearsal audit timings are illustrative, not collected benchmarks.
Project scores are authored outcomes for an imagined assessed project, not a quality judgment supported by the tiny source archive.
The evidence index names actual fixture files and explicitly marks missing performance measurements.

### Preparation review

1. Start **Course preparation**.
   Open **Administration → Groups** for Establish.
   The trio is allocated but students cannot use unpublished groups.
   The other proposals and allocation requests remain visible to staff.
2. Switch to Iris Example, open **Groups**, and confirm the pending invitation from Hugo Example.
   Student views expose only their own proposal and matching notes.
   Return to instructor.
3. Allocate the confirmed four-person proposal and record its size exception.
   Complete the confirmed pair with the remaining student and allocate any larger-cohort remainder into trios.
   Group identifiers are generated by the normal allocation form.
4. Publish formation only after saving all allocations.
   Switch to a student and verify that the published group and submission controls are available.
   The instructor's private matching notes remain hidden.
5. For a creation/import rehearsal, choose **Empty rehearsal** and use the banner's mock CSV download in **Students**.
   Read columns, preview additions, record a reason, and save.
   Reimporting the same CSV retains course identities.

### Grading review

1. Start **Grading review** and inspect the Establish queue.
   Jules Late joined on October 27 after A froze, has a pending catch-up arrangement, and has explicit missing A scores.
   Later phases place Jules in an approved four-person group.
   Frozen A memberships remain intact.
   Finn Example withdrew on December 12 after submitting evidence and receiving provisional assessments.
   Open **Review withdrawal for Finn Example**, inspect the retained membership and record the group/audit arrangements with a private reason.
   Historical scores remain stored, and the review does not assign a final grade or rewrite the groups.
2. Open **Class submissions**, **Assigned audit**, **Group submission**, and **Private portfolios** across the phases.
   Downloads contain valid small source/evidence files; audit targets and Compare's A/B references retain frozen revisions.
3. Open **Compare → Gradebook**.
   Ada Example has a passing provisional result.
   Ben Example has only one completed Challenge lecture activity, despite 90 project points.
   Cora Example has no Compare portfolio and explicit zeros.
   Eli Example is pending because a portfolio correction made its assessment stale.
   Finn Example shows **Withdrawn** with no final grade or numeric total.
4. Try **Release phase results** with a reason: release fails while Eli's assessment is stale.
   Open **Private portfolios**, select Eli, inspect the correction and stale record, then record the reviewed assessment with a reason.
5. Release Compare again.
   Ada receives grade 5; Ben fails the lecture minimum and Cora fails mandatory portfolio/individual requirements despite a high total.
   Eli's result now passes.
   Jules retains the missing A outcome until any approved course response is documented and assessed through the ordinary workflow.
6. Switch to Ben and confirm the released failing requirement is visible in **My course progress**; other students' individual evidence remains private.
   Return to instructor and export: every row is marked `Simulation`, Ben/Cora have grade 0, and the filename starts with `SIMULATION`.
   Finn's row has status `withdrawn` and blank numeric grade fields, preserving the distinction from a failure.
7. Switch to Finn and inspect retained work.
   His private departure reason and group-review notes are hidden, and submission/portfolio controls are read-only.
   **Students → Enrollment, catch-up and withdrawals → Reinstate student** can reverse the departure with a reason and restore the ordinary course requirements while keeping history.

### Complete teaching walkthrough

Start **Empty rehearsal** to exercise the entire workflow from course creation.
The [browser walkthrough](../tests/e2e/course-simulation-walkthrough.spec.ts) follows these steps using only synthetic fixtures; course mutations go through the visible forms.

1. Download the mock roster and tiny source fixture from **Teacher controls**.
   Create a course, import the first six students through **Students**, preview the additions, and save with a reason.
2. Open Establish formation.
   As Ada, propose a trio with Ben and Cora; switch to each invited student to confirm.
   As instructor, allocate the confirmed proposal and a second trio of Dara, Eli and Finn, then publish.
   Reuse those groups in Challenge and Compare, publish each phase, and fill circular audit assignments in **Phase administration**.
3. Request Ada's mock email link and confirm it through the inbox.
   Save the team's working agreement, then **Return to instructor**.
4. Before each phase's implementation deadline, switch to Ada and Dara to upload and freeze each group's source, setup instructions, initial evidence and checklist.
   Identify the fixture's limited scope and mark missing measurement evidence honestly.
   Class access remains closed during the audit window.
5. Advance the clock past implementation freeze but before the audit deadline.
   As each group's representative, download the assigned team's frozen source and submit an audit.
   As every student, submit a private portfolio with two complete live or equivalent remote lecture activities; leave Ben with only one in Challenge to inspect the mandatory minimum.
6. Advance past the audit deadline but before final evidence closes.
   Inspect **Class submissions** and the incoming audit, then attach final technical evidence and submit the response.
   Compare should reference each group's earlier A/B frozen submissions.
   The class catalogue exposes technical work, while peer feedback remains private.
7. As instructor, attempt release before assessment and inspect the rejection.
   Record current project and individual assessments, then release the phase with a reason.
   Repeat steps 4–7 for all three phases, advancing the clock to each phase's windows.
8. Export released grades and switch to Ben to inspect his failing requirement.
   The automated walkthrough uses 12/30 project points and 18/21 individual points per phase, with 15/21 for Ben's Challenge portfolio.
   Five students receive grade 1; Ben receives grade 0 despite exceeding the overall points threshold because Challenge has only one completed lecture activity.
   Exports are marked `Simulation`; frozen archives, membership and audit target revisions remain intact.

The browser flow also checks delayed-save/refresh behavior, mobile layout, accessibility and the absence of escaped live course/auth requests.
[ADR-007](adrs/implemented/ADR-007-provide-an-isolated-teacher-simulation.md) records the completed simulation decision and its verification; production resource provisioning remains an operator task.

### Separate Worker resources

Provision a new empty D1 database and a new empty private R2 bucket solely for teacher simulation.
Add `COURSE_SIMULATION_DB` with `migrations_dir: "course-migrations"`, `COURSE_SIMULATION_FILES`, and a `COURSE_SIMULATION_ID` of 3–64 lowercase letters/digits/hyphens to the production configuration, retaining the independent live bindings.
Do not reuse existing academic resources or enable remote bindings for local rehearsals.
Apply the course migrations to the simulation D1 binding, including `0003_simulation_mail.sql`.
Generate matching initialization files in a new directory:

```bash
node scripts/prepare-course-simulation.ts teacher-v1 .local/simulation-provisioning/teacher-v1
```

Apply `environment.sql` only to the new simulation database; it inserts a marker only when the record, history, credential, quota, activity and mock-mail tables are empty.
Confirm its final query returns `simulation-environment`, `simulation`, and the exact configured identifier.
Upload `environment.json` only to the new simulation bucket at the key `simulation/environment.json`.
The initializer does not overwrite another marker, and the Worker checks both resource markers before opening controls or data.
Live routing also rejects marked resources, so aliasing bindings to the same backing resources fails rather than sharing them.
Do not remove or change markers to bypass a failed isolation check; correct the bindings.
This repository support does not provision production resources or deploy the Worker.

For the separate local Worker configuration, use fresh isolated temporary resources:

```bash
node scripts/prepare-course-simulation.ts course-simulation-local-v1 /tmp/course-simulation-markers
npx wrangler d1 migrations apply COURSE_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state
npx wrangler d1 migrations apply COURSE_SIMULATION_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state
npx wrangler d1 execute COURSE_SIMULATION_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state --file /tmp/course-simulation-markers/environment.sql
npx wrangler r2 object put scalability-book-course-simulation-files/simulation/environment.json --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state --file /tmp/course-simulation-markers/environment.json
```

Then start the loopback Worker using the command below and run `node scripts/check-course-simulation.ts` in another terminal.
The check only accepts loopback and writes synthetic records to those local resources.
It verifies actual D1/R2 isolation and streaming, a frozen student-owned archive/history, student visibility, mock login/reuse/expiry, clock, marked export and reset, while retaining a live sentinel.
Stop that Worker afterwards.

## Optional peer inquiry

Optional book inquiry enters through **Teaching assistant → Peer discussion**, using this workspace's course identity and published phase allocations.
[The learning-workspace guide](learning-workspace.md#peer-inquiry-contract) owns attempt-first disclosure, group/cohort scope, membership corrections, moderation and consented editorial offers.
Private initial notes stay in the student's companion; shared threads are separate ungraded course records and do not appear in ordinary course snapshots.
Optional reasoning outlines, role-rotation cues and reviewed summaries reuse the existing inquiry contribution and provenance contract.
Students select which visible contributions enter a draft; summaries preserve named contributors, disagreement and evidence limitations and require the ordinary sharing action.
Each learner can return to a separately saved private takeaway or changed case without waiting for absent members.
These prompts add no roster, participation score, common self-assessment, course credit or required report; required session practice remains in [the common project specification](../specifications/00_common_project.md#shared-engineering-sessions).
Apply all course migrations, including `0004_learning_inquiry.sql`, to live and simulation course databases before enabling these routes.
The additive index bounds discovery to the requested source/activity; it does not change existing submission or feedback audiences.

## Verification

```bash
npm run test:unit
npx playwright test tests/e2e/course-workspace.spec.ts tests/e2e/course-email-signin.spec.ts tests/e2e/course-formation.spec.ts tests/e2e/course-withdrawal.spec.ts tests/e2e/course-evidence.spec.ts tests/e2e/course-simulation.spec.ts tests/e2e/course-simulation-walkthrough.spec.ts --project=chromium
npm run build
npm run validate
```

The browser test covers roster preview and incremental enrollment, separate group allocation and phase administration, student archive freezing, private portfolio submission, staff scoring, missing-work assessments, incomplete release rejection, phase release, CSV download, mobile layout and accessibility.
The email browser test covers mapped CSV import, manual late enrollment, account status, mock-inbox login, reuse rejection, email correction, privacy and accessibility.
Formation browser/API checks cover a confirmed pair completed into a trio, a fourth-member exception, unassigned students, deadline closure, stale/unauthorized confirmations, private read/write responses, publication/access separation, working agreements, mobile/accessibility and later-phase transfers retaining frozen work and grade history.
Agreement API checks reject unknown groups without writes, hide unpublished allocations from their prospective members, retain published-team privacy, and preserve staff history when an unused allocation is removed.
Catch-up checks cover automatic late-arrival flags after publication/frozen work, the staff review task, private student plans, incremental corrections, stale/unauthorized saves, unknown historical dates and unchanged frozen evidence, grades and passing requirements.
Withdrawal checks cover private review tasks, read-only student access, blank final grades, release for active students without grading inactive groups, retained frozen records/assessments, roster corrections, invitation/allocation constraints, later-phase reuse and reinstatement without waivers.
Evidence checks cover incomplete work, optional repository links, archived requirement links/drift rejection, private drafts, technical attachments versus private portfolios, retained frozen fields/history, stale assessments, late corrections and earlier A/B references without duplicate archives.
The controlled source fixture is unpacked into a clean temporary directory, installs from its lockfile offline, initializes synthetic data and runs validation/readiness commands; this verification never executes student uploads.
API tests cover legacy migration without rewriting evidence or grades, single-use/expired links, session scoping and expiry, request limits, mail failures, conflicting imports, independent administration saves, import preview without writes, conflicts, authorization, generated group identifiers, three-phase grades, mandatory minima, approved arrangements, privacy, timed access, immutable snapshots, optimistic concurrency and corrections.
The mail tests exercise the actual Worker adapter with a mocked Cloudflare binding, checking the enablement boundary, `waitUntil`, pending-link safety, provider failures, fixed sender, escaped templates and absence of a deployed mock inbox.
They do not send real email.
Simulation checks cover teacher/student permissions, live sentinels, teacher and reset-generation isolation, scoped expiry/quotas/inbox retention, immutable history, clock, export labels and malformed context.
Worker adapter tests reject missing/wrong markers, distinct binding objects aliasing the same resources, live-file/database aliases and forged test identities, and prove simulation selects no live mail even when delivery is enabled.
The simulation browser checks cover synthetic roster import, mock login, role switching, clock, export, reset, both presets, private withdrawal review and read-only student access with a blank exported grade, stale-release rejection/reassessment, failing individual outcomes, mobile/accessibility and the absence of escaped live course/auth requests.
The complete teaching flow creates two consented/allocated trios, retains their phase identifiers, and submits all three phases through the interface: source freezing, assigned audits, private portfolios, final evidence, current assessments, release and a marked final export.
It verifies that missing mandatory participation fails despite sufficient overall points, and that delayed saves/refreshes cannot accept edits that would be discarded.
Preset API checks exercise both cohort sizes, real frozen history/A–B references, late enrollment, withdrawal with retained assessments/private review/no grade, explicit zeros, mandatory minima, interrupted/concurrent preparation, isolation and reproducible source download.

To check real local D1/R2 bindings, use the separate local configuration:

```bash
npx wrangler d1 migrations apply COURSE_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state
npx wrangler dev --config wrangler.course.jsonc --local --ip 127.0.0.1 --port 8788 --persist-to /tmp/course-worker-state --var SESSION_SECRET:local-course-smoke-test-only --var COURSE_ADMIN_GITHUB_LOGINS:course-smoke-admin
```

In another terminal, run `node scripts/check-course-worker.ts`.
The credential above is a public test-only value for the loopback instance; it must never be used for a deployed session secret.
The check only accepts a loopback URL and verifies signed GitHub sessions, guarded D1 writes/history, streamed R2 uploads/downloads, frozen revisions and access isolation.
It also checks private initial-work declarations, source-scoped inquiry discovery, group isolation, exclusion from course responses and stale replies through real local D1 bindings.
It also streams and attaches final technical evidence while retaining the frozen source/checklist, checks a read-only frozen reference, imports a synthetic institutional student, records and checks a private catch-up plan, seeds one test-only link into the local D1 instance and verifies single-use email access, session logout and the absence of a deployed mock inbox.
It records withdrawal and private review notes, verifies retained frozen history/files and blank withdrawn export fields, rejects new student submissions and inactive assessments, then reinstates the same identity.
If the Worker uses a different local state directory, set `COURSE_SMOKE_D1_STATE` to that same directory when running the check.
The dedicated simulation check also loads the larger grading-review preset, verifies frozen files/history, records a private withdrawal review without altering evidence or historical assessments, verifies the student's read-only view and blank final grade, rejects stale release, refreshes the assessment and checks mandatory minima after release.
Stop the local Worker afterwards.
The local configuration deliberately matches the pinned book runtime's compatibility date; upgrade the runtime and both configurations together.

Regenerate binding types after configuration changes:

```bash
npx wrangler types worker/course-env.d.ts --config wrangler.course.jsonc --include-runtime false --env-interface CourseBindings
```

Cloudflare references: [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [generated binding types](https://developers.cloudflare.com/workers/wrangler/commands/#types).
