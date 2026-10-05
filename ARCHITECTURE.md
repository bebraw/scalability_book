# Architecture

This file describes the current system and its cross-cutting boundaries.
The [ADR index](docs/adrs/README.md) distinguishes this baseline from accepted changes awaiting implementation.

## Runtime and composition

The repository combines a course book, interactive learning material, reader feedback, and a course submission and assessment workspace.
It uses npm and the Node version range in [package.json](package.json).

| Surface              | Entry point                                                                                                    | Responsibility                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Static website       | [scripts/build-site.ts](scripts/build-site.ts), [site.config.jsonc](site.config.jsonc)                         | Render selected book chapters, appendices, case studies, course briefs, and interactive assets into `build/`.         |
| Local development    | [scripts/dev-site.ts](scripts/dev-site.ts)                                                                     | Serve and rebuild local output, expose local editing, and adapt local persistence to the application APIs.            |
| Deployed application | [worker/index.ts](worker/index.ts), [wrangler.jsonc](wrangler.jsonc)                                           | Serve static assets and authenticated APIs on Cloudflare Workers.                                                     |
| Course domain        | [shared/course.ts](shared/course.ts), [worker/courses.ts](worker/courses.ts)                                   | Define course records and rubric calculations; enforce authorization, submission windows, revisions, and assessments. |
| Course persistence   | [worker/course-store.ts](worker/course-store.ts), [scripts/lib/local-courses.ts](scripts/lib/local-courses.ts) | Provide record/history and file storage with production and local adapters.                                           |
| Course interface     | [site/scripts/course.ts](site/scripts/course.ts)                                                               | Present student workflows at `/course/` and staff workflows at `/admin/courses/`.                                     |

Browser code lives in typed modules under `site/scripts/`; templates and styles live under `site/`.
Runtime adapters depend on shared domain contracts, while shared domain calculations remain independent of browser rendering and storage providers.
New course capabilities should preserve this direction and use the same domain rules locally and in the Worker.

## State and access

| Data                                   | Local storage                 | Production storage                      |
| -------------------------------------- | ----------------------------- | --------------------------------------- |
| Course records and revision history    | `.local/course.sqlite`        | Dedicated `COURSE_DB` D1 binding        |
| Course source archives and attachments | `.local/course-files/`        | Private `COURSE_FILES` R2 binding       |
| Reader feedback                        | `.local/comments.json`        | `COMMENTS_KV`                           |
| Chapter exercise answers               | Separate local answer storage | Separate optional `LEARNING_DB` binding |

The course bindings remain commented configuration examples in `wrangler.jsonc`; repository support does not establish that production resources have been provisioned.
The book can run without course storage.
See [course-system.md](docs/course-system.md) and [chapter-exercises.md](docs/chapter-exercises.md) for configuration and state details.

Current deployed authentication uses GitHub OAuth with a verified numeric GitHub identity.
Course staff permissions are separate from reader-feedback moderation permissions.
Development-only local identities and explicitly enabled browser-test headers are not deployed authentication methods.

Course authorization belongs in the API, including every file download.
Technical submissions have timed auditor and class access; individual portfolios and grades remain private.
Frozen records, membership snapshots, optimistic revision checks, and assessment freshness preserve what was submitted and assessed.
The existing [grading decision](docs/adrs/implemented/ADR-008-require-individual-work-for-course-credit.md) and [record/access decision](docs/adrs/implemented/ADR-009-preserve-evidence-and-control-submission-access.md) capture these constraints.

## Documentation ownership

| Document                                                         | Owns                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [README.md](README.md)                                           | Discovery and common entry points                                          |
| This file                                                        | Current system composition and global boundaries                           |
| [AGENTS.md](AGENTS.md)                                           | Concise navigation and development expectations for coding agents          |
| [docs/development.md](docs/development.md)                       | Commands, generated output, and verification                               |
| [docs/course-system.md](docs/course-system.md)                   | Implemented course behavior and operating instructions                     |
| [docs/adrs/](docs/adrs/README.md)                                | Decision rationale, alternatives, accepted future constraints, and history |
| [specifications/](specifications/README.md)                      | Published student project and assessment contracts                         |
| `book/`, `case-studies/`, [site.config.jsonc](site.config.jsonc) | Reading content and its published organization                             |

Keep each fact in its owning document and link to it from other entry points.
Update behavior documentation and the student-facing contract together when a course change affects both.
ADRs explain the reason for a decision; they do not replace setup instructions or duplicate entire phase briefs.

## Accepted course revision

The following decisions are agreed but are not implemented by the current course workspace:

- [Focused administration](docs/adrs/accepted/ADR-002-separate-course-administration-workflows.md): independent student, group, phase, and course-setting workflows.
- [Imported identities and magic links](docs/adrs/accepted/ADR-003-import-students-and-use-email-magic-links.md): roster-provisioned accounts without required GitHub accounts or registration.
- [Group formation](docs/adrs/accepted/ADR-004-form-three-person-groups-with-instructor-oversight.md): student proposals and instructor allocation, normally three members and at most four.
- [Submission expectations](docs/adrs/accepted/ADR-005-submit-reproducible-source-with-phase-checklists.md): small reproducible bundles and clear phase requirements.
- [Course email](docs/adrs/accepted/ADR-006-use-cloudflare-for-course-email.md): Cloudflare sends magic links from `info@scalableweb.dev`; incoming mail forwards to Gmail.
- [Teacher simulation](docs/adrs/accepted/ADR-007-provide-an-isolated-teacher-simulation.md): isolated mock workflows in both the instructor website and local development.

Implement these in bounded changes that retain historical identities, frozen membership, assessment provenance, and privacy.
Record the implementation evidence before moving each ADR to `implemented/`.
