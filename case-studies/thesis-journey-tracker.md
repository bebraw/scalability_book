# Thesis Journey Tracker – Small scope made production success possible

[Thesis Journey Tracker](https://github.com/bebraw/thesis-journey-tracker) is a private dashboard for a small thesis-supervision team.
It tracks students, thesis phases, meetings, topics, notes, workload, and backups without trying to become a general student information system.
I developed it with coding agents beginning in March 2026.
At the time of this case review, I was using it successfully in production.

The project is useful as a counter-case to Slideotter and Kirjolab.
All three used rapid agent-assisted development and strong validation.
Thesis Journey Tracker succeeded with a smaller product boundary, a simpler runtime, and production concerns that were allowed to shape later work.

The repository evidence cannot independently establish user satisfaction or long-term reliability.
The production assessment above is based on my direct use of the deployed application; the repository supports analysis of how it was built and hardened.

## Case at a glance

| Evidence                                     | Observation                                      |
| -------------------------------------------- | ------------------------------------------------ |
| Development interval reviewed                | 22 March–30 July 2026                            |
| Repository history                           | 282 commits                                      |
| Commits made by 31 March                     | 175, about 62% of the history                    |
| Focused security-hardening interval          | 29 commits on 13–14 July                         |
| TypeScript files                             | 0 in the initial README-only commit; 160 at head |
| TypeScript test or specification files       | 25                                               |
| Application, test, and script lines reviewed | About 20,500                                     |
| Runtime                                      | Cloudflare Workers and D1                        |
| Rendering model                              | Server-rendered HTML with limited client script  |
| Production status at review                  | Deployed and working in the author's use         |

## The first pass was deliberately narrow

The repository began with a README.
The next commit, explicitly named [“First pass by codex-5.3”](https://github.com/bebraw/thesis-journey-tracker/commit/246884b5e84f99f09c63800b76d1ca6942548b29), added an 838-line Worker, one database migration, basic configuration, and the package setup.
It was a large first implementation, but the problem was bounded: represent the supervision workflow in one private dashboard.

The same day, the history shows rapid correction rather than endless feature expansion.
The project moved to TypeScript, added security and browser tests, simplified the interface, extracted database and view code, adopted server-rendered HTML components, and added Lighthouse checks.
Three days later, a commit explicitly [hardened import for production rollout](https://github.com/bebraw/thesis-journey-tracker/commit/f69e019a36ce5cdc832bba02925ba9b1de548358).

This sequence resembles a spike followed by consolidation.
The generated first pass made the real workflow concrete, and the following commits converted what was learned into types, modules, tests, and operating controls.

## Why the scope scaled

### The product says what it is not

The [README](https://github.com/bebraw/thesis-journey-tracker/blob/main/README.md) describes the project as intentionally small and focused on thesis advising rather than a generic student information system.
That negative boundary is consequential.

The application can add more views or improve scheduling without acquiring course registration, grading, messaging, organization-wide identity, or other adjacent institutional concerns.
Agents therefore receive a smaller decision space, and each feature can be judged against one recognizable workflow.

### The runtime matches the problem

The system uses one Cloudflare Worker, D1, server-rendered HTML, and small browser interaction scripts.
The current [project structure](https://github.com/bebraw/thesis-journey-tracker/blob/main/docs/project-structure.md) keeps the Worker entrypoint thin and groups routes, persistence, rendering, authentication, calendar behavior, backups, and student-domain rules by capability.

At the reviewed head, `src/worker.ts` is 447 lines even though the application has grown substantially beyond the original 838-line Worker.
Complexity moved into feature-owned routes and stores rather than remaining in one entrypoint.
The project still has large modules, but their names and ownership follow the user workflow.

### Production use changed the kind of work performed

Later changes are less about adding visible surface area and more about making the existing system dependable.
The July hardening interval includes strong independent secrets, revocable sessions, bounded request bodies, same-origin mutation checks, encrypted calendar credentials, login throttling, Markdown-injection protection, restricted calendar metadata, pinned CI dependencies, and safer backup retention.

Later commits added structured incident logging and validated database mutation outcomes.
This is a healthy shift from feature discovery to operational learning.
Once the application had a real delivery context, security, recovery, and diagnosis became product requirements rather than optional infrastructure.

## The development system supports operation

### CI mirrors a local gate

The [CI workflow](https://github.com/bebraw/thesis-journey-tracker/blob/main/.github/workflows/ci.yml) audits dependencies, verifies generated Worker types, typechecks, runs unit and D1-backed integration tests, exercises browser workflows, and enforces a Lighthouse performance threshold.
The same workflow can run locally through Agent CI.

This alignment reduces the difference between an agent's local evidence and the repository's shared evidence.
Pinned runner images, restricted installation scripts, read-only workflow permissions, and discarded checkout credentials also treat the build environment as part of the security boundary.

### Deployment is intentionally separate from validation

The [deployment guide](https://github.com/bebraw/thesis-journey-tracker/blob/main/docs/deployment.md) separates version upload from production promotion.
A connected Cloudflare build creates a deployable version, but a reviewed version is promoted explicitly after CI succeeds.

That boundary matters in agentic development.
Passing a gate authorizes consideration for release; it does not have to grant an agent or build system automatic [production authority](/concepts/#authority).
The repository also documents migrations, account creation, secret rotation, backup retention, preview-URL exposure, and rollback-relevant version handling.

### Recovery is a first-class feature

The application supports JSON export and restore as well as scheduled R2 backups.
Backups are written only when data changes, with periodic refresh so retention policies preserve recent restore points.
The setup instructions require the R2 lifecycle rule to be inspected rather than assuming that a command succeeded.

This is validation applied to operations: the intended safety property is a [recoverable dataset](/concepts/#recovery), not merely a successful backup API call.

## Why this evidence is still bounded

Production use is stronger evidence than a working repository, but it is not universal evidence of [scalability](/concepts/#scalability).
The current application serves a private personal or small-team context.
Its own security documentation accepts residual denial-of-service and cost exposure that would need edge controls under broader traffic.

The repository has one contributor and does not expose adoption, uptime, support burden, or realistic load measurements.
Several modules remain large, including calendar parsing and complex view components.
The case therefore demonstrates fit and sustainability at its intended scale, not readiness for an institution-wide deployment.

Evaluate the development and operational model against the demand the system actually serves.

## Comparison with the larger projects

| Project                | Dominant source of learning                            | Result at reviewed point                       |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| Slideotter             | Broad product and architecture exploration             | Capable alpha; production path still uncertain |
| Thesis Journey Tracker | Repeated use of one bounded operational workflow       | Working production tool at small-team scale    |
| Kirjolab               | Very high implementation throughput and later revision | Integrated prototype with major consolidation  |

The key difference is not simply repository size or commit count.
Thesis Journey Tracker had a narrower answer to “for whom, for what task, and in what operating environment?”
That answer constrained generation and made production feedback interpretable.

Slideotter and Kirjolab needed implementation to discover more of their product and architecture.
That exploration was valuable, but it also meant that new code could answer questions that had not yet been prioritized by use.

## What I would preserve and improve

I would preserve the narrow product statement, server-rendered default, capability-owned modules, local/remote CI alignment, manual production promotion, and explicit recovery path.

I would improve the evidence around the deployed system:

1. **Record operational measures.** Availability, error rate, D1 query latency, backup freshness, and restore drills would turn “working well” into inspectable longitudinal evidence.
2. **Test recovery periodically.** A backup is only proven when a representative restore is rehearsed and checked.
3. **Track change friction.** Lead time for common workflow changes and churn in the largest modules would show when current boundaries stop scaling.
4. **Add usage evidence carefully.** Privacy-preserving counts or structured interviews could reveal which views and integrations actually reduce supervision work.
5. **Reassess the exposure boundary.** If the user population or public reach grows, identity, rate limiting, audit needs, and data governance should be revisited before adding features.

## What Thesis Journey Tracker teaches

The tracker became a useful production tool by keeping one supervision workflow small, consolidating the first implementation, and letting use reveal operational requirements.
That experience supports its fit at the intended small-team scale.
Broader adoption would need new evidence about availability, load, support, and recovery.
