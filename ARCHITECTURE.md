# Architecture

This file describes the current system and its cross-cutting boundaries.
The [ADR index](docs/adrs/README.md) distinguishes this baseline from accepted changes awaiting implementation.

## Runtime and composition

The repository combines a course book, interactive learning material, reader feedback, and a course submission and assessment workspace.
It uses npm and the Node version range in [package.json](package.json).

| Surface                      | Entry point                                                                                                                                      | Responsibility                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Static website               | [scripts/build-site.ts](scripts/build-site.ts), [site.config.jsonc](site.config.jsonc)                                                           | Render selected book chapters, appendices, case studies, course briefs, and interactive assets into `build/`.         |
| Local development            | [scripts/dev-site.ts](scripts/dev-site.ts)                                                                                                       | Serve and rebuild local output, expose local editing, and adapt local persistence to the application APIs.            |
| Deployed application         | [worker/index.ts](worker/index.ts), [wrangler.jsonc](wrangler.jsonc)                                                                             | Serve static assets and authenticated APIs on Cloudflare Workers.                                                     |
| Course domain                | [shared/course.ts](shared/course.ts), [worker/courses.ts](worker/courses.ts), [worker/course-administration.ts](worker/course-administration.ts) | Define course records and rubric calculations; enforce authorization, submission windows, revisions, and assessments. |
| Course persistence           | [worker/course-store.ts](worker/course-store.ts), [scripts/lib/local-courses.ts](scripts/lib/local-courses.ts)                                   | Provide record/history and file storage with production and local adapters.                                           |
| Course interface             | [site/scripts/course.ts](site/scripts/course.ts)                                                                                                 | Present student workflows at `/course/` and staff workflows at `/admin/courses/`.                                     |
| Formative exercises          | [shared/exercises.ts](shared/exercises.ts), [worker/learning.ts](worker/learning.ts)                                                             | Render versioned canonical questions and privately persist checked answers independently of course grades.            |
| Concepts and agent resources | [scripts/lib/concept-export.ts](scripts/lib/concept-export.ts), [shared/explorations.ts](shared/explorations.ts)                                 | Publish authored concept connections, visuals, and optional activity resources for readers and external agents.       |
| Self-study export            | [scripts/lib/study-build.ts](scripts/lib/study-build.ts), [study/](study/README.md)                                                              | Build pinned public learning bundles without hosting the authoring service.                                           |
| Portable editions            | [scripts/build-pdf.ts](scripts/build-pdf.ts), [scripts/build-lecture-pdfs.ts](scripts/build-lecture-pdfs.ts)                                     | Generate reading and lecture PDFs from versioned content.                                                             |

Browser code lives in typed modules under `site/scripts/`; templates and styles live under `site/`.
The optional [local learning companion](scripts/learning-companion.ts) currently exposes the private notebook API, independently of course storage and model providers.
[Its shared contract](shared/learning-workspace.ts), [SQLite owner](scripts/lib/learning-notebook.ts) and [HTTP boundary](scripts/lib/learning-companion-http.ts) separate learning records, local persistence and browser pairing.
The shared book layout exposes a lazy notebook interface through [learning-loader.ts](site/scripts/learning-loader.ts) and [learning-workspace.ts](site/scripts/learning-workspace.ts), including capture, reflection, concept judgments and selective submission drafts.
Agent/shared-learning integrations remain accepted future work; [the workspace guide](docs/learning-workspace.md) distinguishes current behavior from ADRs 027–029.
The static build owns [the compiled asset URL registry](scripts/lib/site-assets.ts): production HTML and lazy loaders reference content-fingerprinted CSS/JS, while editable previews use stable filenames.
The Worker owns browser cache policy, keeping fingerprinted CSS/JS immutable and revalidating HTML and stable CSS/JS; [the development guide](docs/development.md#asset-urls-and-caching) describes compatibility copies and deployment limits.
`site/scripts/course-administration.ts` owns the focused staff forms, while `site/scripts/course.ts` coordinates navigation, requests and student/review workflows.
`worker/course-administration.ts` validates configuration updates against the latest course snapshot; `worker/courses.ts` authorizes and persists them.
Staff-only fingerprints expose the fields owned by each form, while the store's whole-record compare-and-swap remains the final concurrency boundary.
Runtime adapters depend on shared domain contracts, while shared domain calculations remain independent of browser rendering and storage providers.
New course capabilities should preserve this direction and use the same domain rules locally and in the Worker.

Course sign-in enters through `/api/course-auth/` in both adapters.
`worker/course-auth.ts` owns token/session and mail-delivery rules; `worker/course-auth-store.ts` shares atomic SQL through the D1 and local SQLite ports.
`shared/course-roster.ts` owns CSV parsing and mapping, while the administration domain validates identities and merges enrollment into the current course snapshot.
`site/scripts/course-signin.ts` renders the email request and explicit link-confirmation flow.
`worker/course-mail.ts` adapts login messages to Cloudflare Email Sending with a server-configured sender; the Worker selects it only when its binding, valid `COURSE_EMAIL_FROM` secret and explicit enablement variable are present.
`worker/course-forwarding.ts` owns incoming mail, invoked by the Worker's `email()` entry point through an exact Email Routing rule.
It accepts only the configured course inbox and forwards the original message to the verified `COURSE_EMAIL_FORWARD_TO` destination; neither address nor message content is published, stored or logged by the application.

Group formation enters through `/api/courses/:course/formation/:phase`, student preference/proposal/confirmation routes and the existing staff Groups save.
`shared/course-formation.ts` owns types and public projection; `worker/course-formation.ts` owns validation and consent changes; `site/scripts/course-formation.ts` renders the staff/student flow.
Phase formation state lives in the course snapshot, with history and atomic course revision checks.
Staff Groups fingerprints cover allocation and formation responses; student actions also check their own preference/proposal revision.
Working agreements are separate ungraded records, private to their group and staff.

Solo participation is an explicitly approved one-person allocation on the current requirements/rubric edition, retained per phase.
`shared/course-solo.ts` owns route detection, equivalent assessment criteria, review records and grading freshness; `worker/course-solo.ts` validates reference assignments and independent review evidence.
The staff-only solo-review API persists versioned records through the existing store/history, while outgoing reference audits use the existing audit boundary.
`site/scripts/course-solo.ts` renders review and reference-audit forms; the ordinary submission, portfolio and grade flows remain shared.
Review corrections invalidate affected assessments, and old runs retain their published editions.
See [the operating guide](docs/course-system.md#solo-route-across-all-three-phases) for allocation, privacy and assessment boundaries.

Enrollment arrangements enter through staff-only `/api/courses/:course/enrollment` and the Students/review-queue interface.
`shared/course-enrollment.ts` owns active-student/group projections and pending catch-up/withdrawal tasks; `worker/course-enrollment.ts` records arrivals, departures, private review notes and reinstatement; `site/scripts/course-enrollment.ts` renders the workflow.
Enrollment metadata lives on the student's stable course identity in the course snapshot, guarded by the Students fingerprint and final whole-record revision check.
Students receive only their own plan and dates/status, with staff reasons and withdrawal-review notes removed.
Withdrawal preserves frozen membership, records, files and assessments; the affected student retains read-only access.
Active projections govern new allocation, assessment and release; withdrawn students receive a blank final grade and marked export row.
Reinstatement restores ordinary requirements without rewriting evidence or granting waivers.

Submission checklists enter through the shared course submission API and `site/scripts/course-evidence.ts`.
`shared/course-requirements.ts` owns versioned evidence-index entries; each run pins an edition, and `requirements/` retains the corresponding owner documents and digests.
`scripts/lib/course-requirements.ts` rejects source/checklist drift and the site build publishes archived readable briefs and downloads.
`worker/course-submission.ts` validates indexed/missing evidence, technical attachments and earlier A/B references.
Final evidence lives on new submission revisions; frozen source/setup/initial evidence/checklist/membership remain unchanged.
Private draft redaction and file authorization stay in `worker/courses.ts`; submitted final evidence changes assessment freshness using the existing revision boundary.
The [submission decision](docs/adrs/implemented/ADR-005-submit-reproducible-source-with-phase-checklists.md) records this extension and its verification.

Teacher rehearsal enters through instructor-only `/api/simulation/` and the shared course interface's simulation context.
`worker/course-simulation.ts` separates the verified controller from the selected mock student and invokes the existing course/auth handlers.
`worker/course-simulation-store.ts` scopes records, files, login credentials, quotas and mock mail by instructor and reset generation; `shared/course-simulation.ts` owns the browser/control state contract.
Simulation state is a revision-checked record in dedicated storage, including its clock and selected role; requests retain their generation and cannot fall through to live adapters.
`worker/course-simulation-environment.ts` checks positive D1/R2 environment markers and rejects aliases to live resources; `scripts/lib/local-course-simulation.ts` provides a separate local directory with read-only initialization checks.
`site/scripts/course-simulation.ts` owns teacher controls, persistent indication and request/download context; ordinary forms and grade calculations remain shared.
Reset selects a new namespace and clears its login without deleting backing resources; old synthetic generations remain inaccessible through the course API.
`worker/course-simulation-fixtures.ts` owns versioned synthetic source/evidence; `worker/course-simulation-seed.ts` constructs presets through the shared handlers and replays their validated records/history in resumable batches.
Control state retains preparation progress, while the staged generation stays inaccessible until complete.
A [complete browser walkthrough](tests/e2e/course-simulation-walkthrough.spec.ts) verifies creation, consent/allocation, all three submission/audit/portfolio phases, assessment, release and marked export through the shared interface.
Versioned grading-review presets also exercise retained work through withdrawal, private teacher review and read-only student access with no final grade, as recorded in [ADR-007](docs/adrs/implemented/ADR-007-provide-an-isolated-teacher-simulation.md).

## State and access

| Data                                    | Local storage                               | Production storage                              |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Course records and revision history     | `.local/course.sqlite`                      | Dedicated `COURSE_DB` D1 binding                |
| Course source archives and attachments  | `.local/course-files/`                      | Private `COURSE_FILES` R2 binding               |
| Teacher simulation and revision history | `.local/course-simulation/course.sqlite`    | Separate `COURSE_SIMULATION_DB` D1 binding      |
| Simulation archives and attachments     | `.local/course-simulation/course-files/`    | Separate `COURSE_SIMULATION_FILES` R2 binding   |
| Reader feedback                         | `.local/comments.json`                      | `COMMENTS_KV`                                   |
| Chapter exercise answers                | `.local/learning.sqlite` by default         | Separate optional `LEARNING_DB` binding         |
| Private learning notebook               | `.local/learning-companion/notebook.sqlite` | Student's local companion; never Worker storage |

The course bindings remain commented configuration examples in `wrangler.jsonc`; repository support does not establish that production resources have been provisioned.
The book can run without course storage.
See [course-system.md](docs/course-system.md) and [chapter-exercises.md](docs/chapter-exercises.md) for configuration and state details.

Staff authentication uses GitHub OAuth with a verified numeric GitHub identity.
The course domain also supports institutional roster identities and course-scoped email sessions.
Auth tokens, sessions, rate counters and access activity use dedicated tables in the course database, outside submission records and grade history.
Local development and teacher simulation use explicit mock mail; production uses a gated native Cloudflare binding.
Domain setup, incoming forwarding and instructor-controlled live sign-in delivery were verified in [ADR-006](docs/adrs/implemented/ADR-006-use-cloudflare-for-course-email.md).
Live course login remains disabled pending production course storage and institutional rollout.
Existing GitHub-keyed student records retain their keys during migration to preserve historical ownership.
Course staff permissions are separate from reader-feedback moderation permissions.
Development-only local identities and explicitly enabled browser-test headers are not deployed authentication methods.

Course authorization belongs in the API, including every file download.
Technical submissions have timed auditor and class access; individual portfolios and grades remain private.
Frozen records, membership snapshots, optimistic revision checks, and assessment freshness preserve what was submitted and assessed.
The existing [grading decision](docs/adrs/implemented/ADR-008-require-individual-work-for-course-credit.md) and [record/access decision](docs/adrs/implemented/ADR-009-preserve-evidence-and-control-submission-access.md) capture these constraints.

## Documentation ownership

| Document                                                                                                                     | Owns                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [README.md](README.md)                                                                                                       | Discovery and common entry points                                                             |
| This file                                                                                                                    | Current system composition and global boundaries                                              |
| [AGENTS.md](AGENTS.md)                                                                                                       | Concise navigation and development expectations for coding agents                             |
| [docs/development.md](docs/development.md)                                                                                   | Commands, generated output, and verification                                                  |
| [docs/course-system.md](docs/course-system.md)                                                                               | Implemented course behavior and operating instructions                                        |
| [docs/learning-workspace.md](docs/learning-workspace.md)                                                                     | Learning workspace, private companion setup, portability and executable integration contracts |
| [docs/adrs/](docs/adrs/README.md)                                                                                            | Decision rationale, alternatives, accepted future constraints, and history                    |
| [specifications/](specifications/README.md)                                                                                  | Published student project and assessment contracts                                            |
| [requirements/](requirements/README.md)                                                                                      | Immutable run requirement editions, archived owner documents and their publication workflow   |
| `book/`, `case-studies/`, [site.config.jsonc](site.config.jsonc)                                                             | Reading content and its published organization                                                |
| [docs/chapter-exercises.md](docs/chapter-exercises.md), [docs/agent-learning-resources.md](docs/agent-learning-resources.md) | Formative exercise, concept discovery, and external-agent resource contracts                  |
| [study/README.md](study/README.md), [slides/README.md](slides/README.md)                                                     | Versioned self-study and lecture sources, export behavior, and publication limits             |

Keep each fact in its owning document and link to it from other entry points.
Update behavior documentation and the student-facing contract together when a course change affects both.
ADRs explain the reason for a decision; they do not replace setup instructions or duplicate entire phase briefs.

## Recovered historical decisions

The [retrospective ADRs](docs/adrs/README.md#retrospective-records) explain the publishing pipeline, rendering trust boundary, feedback privacy, local preview lifecycle, typed demos, learning resources, portable editions, course comparison design, evidence protocols, and prose review.
Each links historical commits and current implementation evidence.
Their implemented status identifies repository behavior or published course contracts, with operational limits stated in the record.
