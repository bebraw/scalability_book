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
`site/scripts/course-administration.ts` owns the focused staff forms, while `site/scripts/course.ts` coordinates navigation, requests and student/review workflows.
`worker/course-administration.ts` validates configuration updates against the latest course snapshot; `worker/courses.ts` authorizes and persists them.
Staff-only fingerprints expose the fields owned by each form, while the store's whole-record compare-and-swap remains the final concurrency boundary.
Runtime adapters depend on shared domain contracts, while shared domain calculations remain independent of browser rendering and storage providers.
New course capabilities should preserve this direction and use the same domain rules locally and in the Worker.

Course sign-in enters through `/api/course-auth/` in both adapters.
`worker/course-auth.ts` owns token/session and mail-delivery rules; `worker/course-auth-store.ts` shares atomic SQL through the D1 and local SQLite ports.
`shared/course-roster.ts` owns CSV parsing and mapping, while the administration domain validates identities and merges enrollment into the current course snapshot.
`site/scripts/course-signin.ts` renders the email request and explicit link-confirmation flow.
`worker/course-mail.ts` adapts login messages to Cloudflare Email Sending with a fixed course sender; the Worker selects it only when its binding and explicit enablement variable are present.

## State and access

| Data                                   | Local storage                       | Production storage                      |
| -------------------------------------- | ----------------------------------- | --------------------------------------- |
| Course records and revision history    | `.local/course.sqlite`              | Dedicated `COURSE_DB` D1 binding        |
| Course source archives and attachments | `.local/course-files/`              | Private `COURSE_FILES` R2 binding       |
| Reader feedback                        | `.local/comments.json`              | `COMMENTS_KV`                           |
| Chapter exercise answers               | `.local/learning.sqlite` by default | Separate optional `LEARNING_DB` binding |

The course bindings remain commented configuration examples in `wrangler.jsonc`; repository support does not establish that production resources have been provisioned.
The book can run without course storage.
See [course-system.md](docs/course-system.md) and [chapter-exercises.md](docs/chapter-exercises.md) for configuration and state details.

Staff authentication uses GitHub OAuth with a verified numeric GitHub identity.
The course domain also supports institutional roster identities and course-scoped email sessions.
Auth tokens, sessions, rate counters and access activity use dedicated tables in the course database, outside submission records and grade history.
Local development uses mock mail; production uses a gated native Cloudflare binding whose domain, incoming forwarding and live delivery check still need external setup.
Existing GitHub-keyed student records retain their keys during migration to preserve historical ownership.
Course staff permissions are separate from reader-feedback moderation permissions.
Development-only local identities and explicitly enabled browser-test headers are not deployed authentication methods.

Course authorization belongs in the API, including every file download.
Technical submissions have timed auditor and class access; individual portfolios and grades remain private.
Frozen records, membership snapshots, optimistic revision checks, and assessment freshness preserve what was submitted and assessed.
The existing [grading decision](docs/adrs/implemented/ADR-008-require-individual-work-for-course-credit.md) and [record/access decision](docs/adrs/implemented/ADR-009-preserve-evidence-and-control-submission-access.md) capture these constraints.

## Documentation ownership

| Document                                                                                                                     | Owns                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [README.md](README.md)                                                                                                       | Discovery and common entry points                                                 |
| This file                                                                                                                    | Current system composition and global boundaries                                  |
| [AGENTS.md](AGENTS.md)                                                                                                       | Concise navigation and development expectations for coding agents                 |
| [docs/development.md](docs/development.md)                                                                                   | Commands, generated output, and verification                                      |
| [docs/course-system.md](docs/course-system.md)                                                                               | Implemented course behavior and operating instructions                            |
| [docs/adrs/](docs/adrs/README.md)                                                                                            | Decision rationale, alternatives, accepted future constraints, and history        |
| [specifications/](specifications/README.md)                                                                                  | Published student project and assessment contracts                                |
| `book/`, `case-studies/`, [site.config.jsonc](site.config.jsonc)                                                             | Reading content and its published organization                                    |
| [docs/chapter-exercises.md](docs/chapter-exercises.md), [docs/agent-learning-resources.md](docs/agent-learning-resources.md) | Formative exercise, concept discovery, and external-agent resource contracts      |
| [study/README.md](study/README.md), [slides/README.md](slides/README.md)                                                     | Versioned self-study and lecture sources, export behavior, and publication limits |

Keep each fact in its owning document and link to it from other entry points.
Update behavior documentation and the student-facing contract together when a course change affects both.
ADRs explain the reason for a decision; they do not replace setup instructions or duplicate entire phase briefs.

## Recovered historical decisions

The [retrospective ADRs](docs/adrs/README.md#retrospective-records) explain the publishing pipeline, rendering trust boundary, feedback privacy, local preview lifecycle, typed demos, learning resources, portable editions, course comparison design, evidence protocols, and prose review.
Each links historical commits and current implementation evidence.
Their implemented status identifies repository behavior or published course contracts, with operational limits stated in the record.

## Accepted course revision

The following decisions have implementation work outstanding in the current course workspace:

- [Focused administration](docs/adrs/accepted/ADR-002-separate-course-administration-workflows.md): the four forms and independent save boundaries are implemented; account status and institutional enrollment are implemented; student proposals/approvals await the group revision.
- [Group formation](docs/adrs/accepted/ADR-004-form-three-person-groups-with-instructor-oversight.md): student proposals and instructor allocation, normally three members and at most four.
- [Submission expectations](docs/adrs/accepted/ADR-005-submit-reproducible-source-with-phase-checklists.md): small reproducible bundles and clear phase requirements.
- [Course email](docs/adrs/accepted/ADR-006-use-cloudflare-for-course-email.md): the Cloudflare sender integration is implemented; domain setup, verified Gmail forwarding, live delivery verification and the teacher simulation's mock-mail boundary remain outstanding.
- [Teacher simulation](docs/adrs/accepted/ADR-007-provide-an-isolated-teacher-simulation.md): isolated mock workflows in both the instructor website and local development.

Implement these in bounded changes that retain historical identities, frozen membership, assessment provenance, and privacy.
Record the implementation evidence before moving each ADR to `implemented/`.
