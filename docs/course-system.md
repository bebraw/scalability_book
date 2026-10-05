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
Production email provisioning, withdrawal workflows, phase checklists and teacher simulation remain pending.
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
  **Late arrivals and catch-up arrangements** records a private plan for an enrolled student.
- **Groups** allocates students for the selected phase and lists those awaiting allocation.
  Open the proposal period, review confirmations and private matching notes, save the allocation, then publish approved groups.
  Add group cards and select their members.
  New identifiers are generated automatically, starting at `group-01`; generated numbers are not reused after removing an unused group.
  Later phases can reuse Establish groups and their identifiers.
- **Phase administration** edits only the selected phase's deadlines and audit assignments.
- **Course settings** edits the run name and staff access and displays the retained published rubric.

The review queue links students awaiting allocation, missing catch-up plans and incomplete audit arrangements to the relevant workflow.
Course creation, roster import and group allocation are separate operations.
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
The roster's **Catch-up arrangement** action opens the same form.
Staff can also mark an earlier late arrival or correct that flag with a reason.
An empty plan leaves a late arrival in the review queue.
Successful saves retain the prior course snapshot, actor, timestamp and reason; stale roster/arrangement edits conflict and preserve the browser's text.
Settings and group changes use their separate administration fingerprints.

The student sees their plan in **My progress**.
Other students cannot read enrollment dates, the late-arrival flag or catch-up plans; staff reasons remain private even from the affected student's view.
Recording a plan does not alter groups, deadlines, frozen evidence, assessment freshness or passing requirements.
Allocate students in an unfrozen phase and record any approved replacement activity separately in the gradebook.
Withdrawals and their institutional grade-export handling still await the decision recorded in ADR-004.

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
Every enrolled student needs an allocation, and size exceptions need recorded approval before publication.
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
Late imports reach the unassigned queue and the [catch-up workflow](#late-arrivals-and-catch-up); withdrawal actions remain pending in ADR-004.
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
Production email delivery needs the separate mail setup below.
Automatic repository cloning, AI grading, self-enrollment and institutional single sign-on are not included.

### Course mail setup

`worker/course-mail.ts` uses the native Cloudflare Email Sending binding with a fixed sender and reply-to of `info@scalableweb.dev`.
Messages contain plain text and escaped HTML, the course name, an explicit confirmation instruction and UTC expiry.
The transport accepts only sign-in links for `https://scalableweb.dev/course/`.
No SMTP password or Email Sending API token is needed by the Worker.
Application logs contain a `course_login_delivery_failed` event and course ID on failure, without the address, credential or provider error body.
Cloudflare accepting a send is not proof that it arrived in the student's inbox; use the provider's email logs for delivery/bounce diagnosis.

The read-only account check on 2026-10-05 did not list `scalableweb.dev` as an enabled sending domain.
The Gmail forwarding destination has not yet been supplied or verified.
No domain was onboarded, DNS changed, paid plan upgraded, real mail sent or Worker deployed by the implementation checks.

Before live course access:

1. Recheck [Email Sending availability and pricing](https://developers.cloudflare.com/email-service/platform/pricing/) for the selected account.
   Sending to arbitrary institutional recipients requires Workers Paid; a successful send to a verified address alone does not establish that eligibility.
   `npx wrangler email sending list` is a read-only domain inventory.
2. Onboard `scalableweb.dev` under **Compute → Email Service → Email Sending** and review the provider's generated DNS records before applying them.
   Verify sending MX/SPF on `cf-bounce`, sending DKIM and the domain's DMARC setup through the [domain configuration guide](https://developers.cloudflare.com/email-service/configuration/domains/).
   Preserve any existing mail arrangements when reviewing DNS changes.
3. Configure **Email Routing** separately: verify the instructor's existing Gmail destination, then create the exact rule `info@scalableweb.dev` → **Send to an email** → that verified destination.
   Check Routing's own root-domain MX/SPF/DKIM records and the rule's active status.
   Use the [routing-address guide](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/); a Worker email handler or catch-all rule is unnecessary for this forwarding arrangement.
4. Add this binding to the production `wrangler.jsonc`, retaining the existing course and book bindings:

   ```jsonc
   "send_email": [{
     "name": "COURSE_MAIL",
     "allowed_sender_addresses": ["info@scalableweb.dev"]
   }]
   ```

   Merge `COURSE_EMAIL_ENABLED: "true"` into the production `vars` only after domain setup is verified and a controlled delivery check is authorized.
   For that first check, temporarily add `allowed_destination_addresses` containing only the instructor-controlled recipient and enroll that address in a test run.
   The public request route still sends only to enrolled addresses.

5. With explicit authorization to send the test message, request a link through the normal course sign-in form, inspect its sender and inbox delivery, confirm sign-in, and verify reuse rejection.
   Test an incoming question to `info@scalableweb.dev` and confirm forwarding to Gmail.
   Record results without saving a credential or full magic-link URL in reports.
   Remove the temporary recipient restriction only when starting institutional delivery; retain the fixed sender restriction.

Disable login delivery by setting `COURSE_EMAIL_ENABLED` to `"false"` and deploying the configuration if a sender or service problem occurs.
Check enrollment/address corrections and Cloudflare delivery, bounce and suppression logs before asking a student to request another link.
Requests remain bounded by the application limits above; there is no automatic retry or staff endpoint that reveals a production login credential.
Forwarding does not provide branded human replies from Gmail; reply from the existing inbox unless a separate reply arrangement is agreed.
The [mail ADR](adrs/accepted/ADR-006-use-cloudflare-for-course-email.md) tracks the remaining setup and simulation boundary.

`wrangler.course.jsonc` includes a local-only email binding shape with delivery disabled for validation.
Do not use `remote: true` for that binding or enable live email for development or teacher rehearsals.
The application development server uses its own mock inbox independently of these production settings.

## Verification

```bash
npm run test:unit
npx playwright test tests/e2e/course-workspace.spec.ts tests/e2e/course-email-signin.spec.ts tests/e2e/course-formation.spec.ts --project=chromium
npm run build
npm run validate
```

The browser test covers roster preview and incremental enrollment, separate group allocation and phase administration, student archive freezing, private portfolio submission, staff scoring, missing-work assessments, incomplete release rejection, phase release, CSV download, mobile layout and accessibility.
The email browser test covers mapped CSV import, manual late enrollment, account status, mock-inbox login, reuse rejection, email correction, privacy and accessibility.
Formation browser/API checks cover a confirmed pair completed into a trio, a fourth-member exception, unassigned students, deadline closure, stale/unauthorized confirmations, private read/write responses, publication/access separation, working agreements, mobile/accessibility and later-phase transfers retaining frozen work and grade history.
Catch-up checks cover automatic late-arrival flags after publication/frozen work, the staff review task, private student plans, incremental corrections, stale/unauthorized saves, unknown historical dates and unchanged frozen evidence, grades and passing requirements.
API tests cover legacy migration without rewriting evidence or grades, single-use/expired links, session scoping and expiry, request limits, mail failures, conflicting imports, independent administration saves, import preview without writes, conflicts, authorization, generated group identifiers, three-phase grades, mandatory minima, approved arrangements, privacy, timed access, immutable snapshots, optimistic concurrency and corrections.
The mail tests exercise the actual Worker adapter with a mocked Cloudflare binding, checking the enablement boundary, `waitUntil`, pending-link safety, provider failures, fixed sender, escaped templates and absence of a deployed mock inbox.
They do not send real email.

To check real local D1/R2 bindings, use the separate local configuration:

```bash
npx wrangler d1 migrations apply COURSE_DB --config wrangler.course.jsonc --local --persist-to /tmp/course-worker-state
npx wrangler dev --config wrangler.course.jsonc --local --ip 127.0.0.1 --port 8788 --persist-to /tmp/course-worker-state --var SESSION_SECRET:local-course-smoke-test-only --var COURSE_ADMIN_GITHUB_LOGINS:course-smoke-admin
```

In another terminal, run `node scripts/check-course-worker.ts`.
The credential above is a public test-only value for the loopback instance; it must never be used for a deployed session secret.
The check only accepts a loopback URL and verifies signed GitHub sessions, guarded D1 writes/history, streamed R2 uploads/downloads, frozen revisions and access isolation.
It also imports a synthetic institutional student, records and checks a private catch-up plan, seeds one test-only link into the local D1 instance and verifies single-use email access, session logout and the absence of a deployed mock inbox.
If the Worker uses a different local state directory, set `COURSE_SMOKE_D1_STATE` to that same directory when running the check.
Stop the local Worker afterwards.
The local configuration deliberately matches the pinned book runtime's compatibility date; upgrade the runtime and both configurations together.

Regenerate binding types after configuration changes:

```bash
npx wrangler types worker/course-env.d.ts --config wrangler.course.jsonc --include-runtime false --env-interface CourseBindings
```

Cloudflare references: [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [generated binding types](https://developers.cloudflare.com/workers/wrangler/commands/#types).
