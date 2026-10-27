# Course plan

The course contains nine lectures and three projects: Establish, Challenge, and Compare.
The projects are aligned with the lectures and the three matching book parts.

## Learning outcomes

I've listed the learning outcomes of the course below as it's vital to cover these through the course content.

1. Understands the multiple dimensions of scalability and understands factors that contribute to the scalability of web applications.
2. Knows and applies architectural patterns and techniques for designing and building scalable web applications.
3. Understands the impact of the wide range of design decisions in building scalable web applications.
4. Knows scalability laws and reflects on them in the context of architectural decisions.
5. Can evaluate the scalability of web applications at multiple abstraction levels.
6. Has practical experience in designing, building, and deploying web applications that scale. 

## Time plan

Each lecture introduces or practices a specific form of reasoning and leaves evidence that can be assessed later.
The three projects provide the continuous practical context.
The table includes preparation and project work associated with each lecture; it is not a list of activities to complete in the room.
The [lecture plan](lecture_plan.md) defines the session format, with Lectures 4, 7, and 9 primarily reserved for project presentations.

| Lecture | Part and guiding question                                                                                                            | Teaching and project work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Evidence produced                                                                                                                                                                                                | Learning outcomes            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1       | **Establish — Build and measure a baseline:** What does scalability mean for web development?                                        | Introduce demand, data, contributor, and change pressures; separate those pressures from architectural and infrastructure responses and from product and operating constraints; distinguish scalability from performance, elasticity, resilience, and efficiency; form groups and launch the Establish project.                                                                                                                                                                                                                                                                   | Two bounded scalability claims, initial constraints, and implementation A hypothesis.                                                                                                                            | LO1, LO3, LO6                |
| 2       | **Establish — Build and measure a baseline:** How can coding agents support scalable development?                                    | Practice the constrain–generate–validate loop; create a reproducible project harness; connect tests, documentation, boundaries, and AI review to change capacity; continue implementation A.                                                                                                                                                                                                                                                                                                                                                                                      | README, agent instructions, validation commands, decision record, and AI-use log.                                                                                                                                | LO1, LO3, LO6                |
| 3       | **Establish — Build and measure a baseline:** How can we measure web applications and development workflows?                         | Define workload, load, latency, throughput, errors, resource use, logs, metrics, and traces; introduce Little's Law; establish the shared runtime and development-workflow protocol; complete Establish.                                                                                                                                                                                                                                                                                                                                                                          | Repeatable benchmark protocol, operational run evidence, implementation A baseline, and an interpretation of what the result does not prove.                                                                     | LO1, LO4, LO5, LO6           |
| 4       | **Challenge — Expose architectural assumptions:** How does web architecture shape scalability?                                       | Present implementation A and compare request paths and architecture decisions; use the architecture chapter as preparation on web boundaries and revisit questions in Lecture 5; launch Challenge and its architecture hypothesis for implementation B.                                                                                                                                                                                                                                                                                                                           | Architecture comparison, request trace, API-contract and ownership analysis, and implementation B hypothesis.                                                                                                    | LO2, LO3, LO5, LO6           |
| 5       | **Challenge — Expose architectural assumptions:** How does development friction limit web projects?                                  | Audit setup, comprehension, change, testing, review, operational, and coordination friction; improve one feedback loop; use the external audit to compare author and newcomer experience.                                                                                                                                                                                                                                                                                                                                                                                         | Friction audit, one verified improvement, and cross-team audit evidence.                                                                                                                                         | LO1, LO3, LO5, LO6           |
| 6       | **Challenge — Expose architectural assumptions:** Which web application assumptions fail under pressure?                             | Repeat the primary pressure for B, investigate one bounded correctness or recovery case, and use the wider catalog to introduce concurrency, growth, retries, partial failure, tenancy, automated abuse, data retention, and eventual correctness; connect idempotency, queues, partitioning, backpressure, and graceful degradation to the pressures that justify them; use Little's Law to interpret one queue or bottleneck; complete Challenge.                                                                                                                               | Comparable primary-pressure evidence for A and B, one bounded correctness or recovery investigation, operational evidence for B, and an evidence-based A–B comparison.                                           | LO1, LO2, LO3, LO4, LO5, LO6 |
| 7       | **Compare — Evaluate workflows and scaling responses:** When do agent fleets improve web development?                                | Present Challenge results and launch Compare; use the fleet chapter as preparation on decomposition, roles, task graphs, trust boundaries, integration, review capacity, and Amdahl's Law; revisit formal-model application in Lecture 8.                                                                                                                                                                                                                                                                                                                                         | Fleet plan, task graph, role and permission boundaries, validation gates, and a single-agent counterfactual.                                                                                                     | LO3, LO4, LO5, LO6           |
| 8       | **Compare — Evaluate workflows and scaling responses:** How should web applications respond to scaling pressure?                     | Compare A, B, and C under the shared primary pressure, then use relevant scenarios from the wider catalog to explain consequential differences; evaluate justified responses such as indexing, caching, replication, queues, partitioning, rate limiting, isolation, and geographical distribution; apply one formal model to an application decision and one to the development workflow; implement and remeasure the smallest justified response in one selected implementation; deploy the selected revision in an agreed realistic environment and rerun the shared workload. | Three-way primary-pressure comparison, focused additional analysis, formal-model calculations, before-and-after response evidence, deployed workload evidence, target architecture, and scaling trade-off table. | LO1, LO2, LO3, LO4, LO5, LO6 |
| 9       | **Compare — Evaluate workflows and scaling responses:** What do three agent-assisted implementations teach us about web scalability? | Present implementation C and its fleet debugging findings, using an application view if implemented; compare all three applications and workflows; separate observation from attribution; defend a conditional architecture and development-workflow decision.                                                                                                                                                                                                                                                                                                                    | Final A–B–C evidence package, reflection, and oral or written defense of the decision and its limits.                                                                                                            | LO1, LO2, LO3, LO4, LO5, LO6 |

## Learning outcome alignment

The revised structure covers all six outcomes through a progression from introduction to guided practice and demonstrated performance.
Coverage depends on the assessed evidence named below; lecture attendance or exposure to a concept is not sufficient by itself.

| Learning outcome                                                                                                        | Introduced                                                                                                                                                                                          | Practiced and reinforced                                                                                                                                                                             | Demonstrated through assessed evidence                                                                                                                                                                                               | Coverage judgment                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LO1. Understands the multiple dimensions of scalability and factors that contribute to web application scalability.** | Lecture 1 defines demand, data, contributor, and change pressures; separates response surfaces and constraints; and distinguishes scalability, performance, elasticity, resilience, and efficiency. | Lectures 2, 3, 5, and 6 connect development, measurement, friction, architecture, infrastructure, and operating conditions to those pressures.                                                       | Lectures 8–9 require a cumulative multi-dimensional analysis anchored by one comparable pressure across A, B, and C and a conditional final decision.                                                                                | **Covered.** The outcome recurs across application and development-system pressures without reducing scalability to throughput or treating a mechanism as a dimension.                           |
| **LO2. Knows and applies architectural patterns and techniques for designing and building scalable web applications.**  | Lecture 4 introduces web boundaries, API contracts, state, failure, and compatibility through the implementation A cases.                                                                           | Lecture 6 connects idempotency, queues, partitioning, backpressure, and degradation to concrete pressures; Lecture 8 selects and implements one bounded response.                                    | Lecture 8 requires before-and-after evidence for one implemented response and a target architecture that rejects unjustified alternatives and identifies explicit costs and new failure modes.                                       | **Covered.** Students must implement and evaluate a pattern in their own system rather than only describe or diagram it.                                                                         |
| **LO3. Understands the impact of the wide range of design decisions in building scalable web applications.**            | Lectures 1–2 establish constraints, stack choices, harness decisions, and validation strategy.                                                                                                      | Lectures 4–8 revisit consequences across architecture, friction, failure, orchestration, operations, cost, and sustainability.                                                                       | Lecture 9 requires an evidence-based explanation of what changed, what caused or may have caused it, and what the group would choose next.                                                                                           | **Covered strongly.** Decision consequences form the narrative spine of all three parts.                                                                                                         |
| **LO4. Knows scalability laws and reflects on them in the context of architectural decisions.**                         | Lecture 3 introduces Little's Law using measured arrival rate, work in progress, and latency.                                                                                                       | Lecture 6 applies it to an application queue or bottleneck; Lecture 7 preparation introduces Amdahl's Law through fleet parallelism and sequential review work; Lecture 8 practices its application. | Lecture 8 requires one formal model applied to an application-architecture decision and one applied to the development workflow; Lecture 9 interprets the limits of both.                                                            | **Covered after revision.** The outcome now has an explicit two-law teaching sequence and required application evidence.                                                                         |
| **LO5. Can evaluate the scalability of web applications at multiple abstraction levels.**                               | Lecture 3 introduces evidence at request, component, and system levels.                                                                                                                             | Lectures 4–7 extend evaluation to architecture, code and workflow friction, operations, and development-system coordination.                                                                         | Lectures 8–9 require a three-way evaluation spanning runtime behavior, architecture, reliability, maintainability, resource efficiency, and human review.                                                                            | **Covered strongly.** The shared protocol and pressure headings make evaluation comparable across levels and builds.                                                                             |
| **LO6. Has practical experience in designing, building, and deploying web applications that scale.**                    | Establish begins in Lecture 1 and establishes the first design and operational baseline.                                                                                                            | Students build and operate A during Lectures 1–3, B during Lectures 4–6, and C during Lectures 7–8, with acceptance checks, architecture records, runtime workloads, and cross-team audits.          | By Lecture 9, students have three reproducible implementations, have implemented and remeasured one response to an observed or credibly projected limit, and have deployed the selected revision in an agreed realistic environment. | **Covered.** Building three applications, changing one in response to pressure, and rerunning its workload after realistic deployment connect design, implementation, operation, and deployment. |

## Projects

The book parts and projects use the same names: Establish, Challenge, and Compare.
They produce three independent implementations of one common, bounded application brief.
The required behavior and acceptance checks stay stable while the AI-assisted development setup changes.
In short:

- Establish - build a working baseline with an approved large model and a single-agent workflow.
- Challenge - build the same required behavior afresh with an approved small model and compare the process and result.
- Compare - build it again with a declared fleet of small models, large models, or a mixture, analyze its actual execution record with optional trace import into the resulting application, then measure, explain, and critique all three implementations and workflows.

The full handover-and-return cycle is no longer the main mechanism.
A bounded cross-team audit should preserve the unfamiliar-system lesson: another group runs the project from its documentation, applies the common checks, identifies a hidden assumption, and attempts one phase-specific but structurally equivalent change.

The course requirements consist of a [common application contract](specifications/00_common_project.md) and separate [Establish](specifications/01_establish.md), [Challenge](specifications/02_challenge.md), and [Compare](specifications/03_compare.md) overlays.
The course briefs above own the current comparison design and evidence requirements.
The historical proposal in [`docs/three-build-project-direction.md`](docs/three-build-project-direction.md) records the original rationale and risks.
The highest-leverage operational opportunities before the first run are recorded in [`docs/first-run-course-improvements.md`](docs/first-run-course-improvements.md).

## AI development-system comparison

The progression compares a large-model single agent, a small-model single agent, and a declared agent fleet with approved model assignments.
Both single-agent models may be hosted by the department; size and hosting are separate choices.
The first phase introduces the engineering workflow, the second tests which practices transfer under the small-model configuration, and the third investigates coordination and model assignment.
Model capability is an observed, task-dependent result rather than a ranking built into the phase names.

The comparison has two main transitions.
The three builds are comparative engineering case studies: practice, design, model, and environment can change together, so their differences do not identify model or orchestration effects.
Establish to Challenge changes the assigned model and potentially its serving configuration while keeping the single-agent workflow broadly comparable.
Record changes to tools, context, hardware, and hosting so they are not mistaken for effects of model capability alone.
Challenge to Compare changes orchestration and may also change model assignment; B's small model remains the reference configuration.
Declare role/task assignments, actual routes, fallback, and the hypothesis about accepted quality, time, and total cost.
Within Compare, the supplied matched-trace activity examines a narrower single-agent versus fleet contrast under the same small model, checks, routing policy and resource limits, with provenance and missing observations explicit.
Students may run their own bounded matched pair as an optional exploration within the existing rehearsal budget.
An optional small-only/mixed-fleet comparison holds the task graph fixed and assigns a large model to one named role within the remaining rehearsal budget.
Mixed fleets are permitted for the main C implementation without requiring another complete application or a new submission.

Possible phase mapping:

- Establish: use a supported large model and a single-agent workflow to create the smallest compliant implementation and the first evidence package.
- Challenge: start from the same specification, not the Establish code, and use a small model through a single-agent workflow.
  Compare capability, speed, defects, architecture, review effort, and resource use.
- Compare: build a third implementation through bounded fleet roles and explicit integration.
  Retain compact redacted actual-run evidence and at least two debugging findings; transforming and importing the trace into C is an optional extension.
  Compare the fleet with the small-model single-agent workflow and analyze coordination cost, duplicated work, review throughput, quality, and any changed model assignments.

This arc can help grading: evaluate the common required behavior, scalability reasoning, quality of evidence, and the group's ability to constrain, generate, validate, integrate, and review AI-assisted work.
Do not reward generated output volume.

The default project theme is a modest event tracking application, but groups may choose an ambitious event-oriented domain if they keep the required core small.
One useful advanced option is a constrained visual agentic workflow platform where workflow definitions, runs, node executions, tool calls, retries, and failures are modeled as events.
This should remain a domain choice within the event-tracking brief rather than a new mandatory course project, since weaker groups could otherwise spend too much time on visual editor.

Each project phase should include evidence that the application or design has been run in a realistic environment: a local deployment command, hosted URL, container, deployment notes, benchmark run, logs, screenshots from a running instance, or another operational artifact appropriate to the phase.

Each phase includes one approximately 30-minute [shared engineering session](specifications/00_common_project.md#shared-engineering-sessions), with operator, challenger, and validator responsibilities rotating across phases.
Each student predicts first, the group investigates with the agent, and a student other than the operator explains the acceptance decision.
The record belongs in the existing decision record or AI-use log.

Each student must submit self- and peer-assessment after every phase so useful feedback can be shared with the group and the student can reflect on their collaboration.
Collect this assessment and the phase's lecture diary entries in one private individual portfolio, following the [course submission workflow](specifications/00_introduction.md#groups-submissions-and-access).

## Course learning diary

During the course, the students are expected to maintain a learning diary that should contain an entry per lecture about what they learned.
There will also be additional reading available related to each lecture besides the course book.
Note that the entries don't have to be written but can also be provided in an audio or video format.

## Grading

The grading for the course is formative and follows the student-facing [course assessment rubric](specifications/grading.md).
It is derived from the following factors:

1. Group course projects - up to 30 points per project, shared by the registered members (total: 90), with at least 10 points from each project needed.
2. Individual lecture participation, either live or through the announced remote equivalent, and learning diaries - up to 3 points per lecture under the separate participation and diary criteria (total: 27).
3. Individual self- and peer-assessment after every project phase - up to 12 points per phase (total: 36).

There's slight bias towards project work in the point system so you cannot complete the course by participation alone.

Passing requires at least half the available total points, at least 10 points from every project, and the [mandatory individual work](specifications/grading.md#mandatory-individual-work):

- two of three lecture activities in each phase, each earning its participation point and both diary points; and
- at least 6 of 12 self- and peer-assessment points in each phase, including at least 1 point for reliable contribution and shared ownership.

Approved absence and support arrangements specify any replacement activity or adjusted requirement alongside any points adjustment.
Once all passing requirements are met, the grades are scaled from the percentage of available points as follows:

- 50% - 1
- 60% - 2
- 70% - 3
- 80% - 4
- 90% - 5

Peer reports provide evidence for the rubric's individual collaboration criterion; they do not change grades automatically.

## Workload

Given the course has 5 ECTS, that gives 135 hours of work.
That means 15 hours of effort per week so the course is demanding time-wise.
I've done a rough calculation of the hour distribution below (average case):

- Lectures - 9 \* 2 = 18h
- Reading, lecture preparation, and course learning diary - 9 \* 2 = 18h
- Projects and reflection - 99h in total, distributed approximately as:
  - Establish - 30h: core build 14h, harness and validation 6h, workload and evidence 5h, audit 3h, reflection and assessment 2h
  - Challenge - 30h: fresh build 13h, architecture and validation 5h, pressure and comparison evidence 7h, audit 3h, reflection and assessment 2h
  - Compare - 39h: fleet build and correction 18h, scaling response and deployment 9h, final synthesis 6h, audit 3h, reflection and assessment 3h

The phase allocations are planning budgets rather than required time sheets.
When the common core or evidence cannot fit the budget, reduce optional scope before weakening acceptance, recovery, or review evidence.

The shared engineering sessions replace ordinary project discussion and reflection within these budgets.
The supplied matched-trace analysis uses the existing Compare study allocation; an optional live pair uses the fleet rehearsal budget and adds no fourth application.
Maintained specifications, evolving decision records, the standard ownership card and one evidenced friction finding with a response use the existing project evidence.
Additional pressures and trace import remain optional, with full credit available through the required path.
Reuse session decisions in existing records rather than adding reports; the total remains 135 hours.
