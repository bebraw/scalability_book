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

| Lecture | Part and guiding question                                                                                                            | Teaching and project work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Evidence produced                                                                                                                                                                                                | Learning outcomes            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1       | **Establish — Build and measure a baseline:** What does scalability mean for web development?                                        | Introduce demand, data, contributor, and change pressures; separate those pressures from architectural and infrastructure responses and from product and operating constraints; distinguish scalability from performance, elasticity, resilience, and efficiency; form groups and launch the Establish project.                                                                                                                                                                                                                                                                   | Two bounded scalability claims, initial constraints, and implementation A hypothesis.                                                                                                                            | LO1, LO3, LO6                |
| 2       | **Establish — Build and measure a baseline:** How can coding agents support scalable development?                                    | Practice the constrain–generate–validate loop; create a reproducible project harness; connect tests, documentation, boundaries, and AI review to change capacity; continue implementation A.                                                                                                                                                                                                                                                                                                                                                                                      | README, agent instructions, validation commands, decision record, and AI-use log.                                                                                                                                | LO1, LO3, LO6                |
| 3       | **Establish — Build and measure a baseline:** How can we measure web applications and development workflows?                         | Define workload, load, latency, throughput, errors, resource use, logs, metrics, and traces; introduce Little's Law; establish the shared runtime and development-workflow protocol; complete Establish.                                                                                                                                                                                                                                                                                                                                                                          | Repeatable benchmark protocol, operational run evidence, implementation A baseline, and an interpretation of what the result does not prove.                                                                     | LO1, LO4, LO5, LO6           |
| 4       | **Challenge — Expose architectural assumptions:** How does web architecture shape scalability?                                       | Compare implementation A request paths and architecture diagrams; teach client, server, data, network, API, state, compatibility, automated-consumer, organizational, and trust boundaries; form the architecture hypothesis for implementation B and launch Challenge.                                                                                                                                                                                                                                                                                                           | Architecture comparison, request trace, API-contract and ownership analysis, and implementation B hypothesis.                                                                                                    | LO2, LO3, LO5, LO6           |
| 5       | **Challenge — Expose architectural assumptions:** How does development friction limit web projects?                                  | Audit setup, comprehension, change, testing, review, operational, and coordination friction; improve one feedback loop; use the external audit to compare author and newcomer experience.                                                                                                                                                                                                                                                                                                                                                                                         | Friction audit, one verified improvement, and cross-team audit evidence.                                                                                                                                         | LO1, LO3, LO5, LO6           |
| 6       | **Challenge — Expose architectural assumptions:** Which web application assumptions fail under pressure?                             | Repeat the primary pressure for B, add one pressure exposed by an architectural difference, and use the wider catalog to introduce concurrency, growth, retries, partial failure, tenancy, automated abuse, data retention, and eventual correctness; connect idempotency, queues, partitioning, backpressure, and graceful degradation to the pressures that justify them; use Little's Law to interpret one queue or bottleneck; complete Challenge.                                                                                                                            | Comparable primary-pressure evidence for A and B, one focused secondary-pressure analysis, operational evidence for B, and an evidence-based A–B comparison.                                                     | LO1, LO2, LO3, LO4, LO5, LO6 |
| 7       | **Compare — Evaluate workflows and scaling responses:** When do agent fleets improve web development?                                | Compare Challenge results; teach decomposition, roles, task graphs, trust boundaries, integration, and review capacity; apply Amdahl's Law to sequential work and fleet speedup; launch the Compare project.                                                                                                                                                                                                                                                                                                                                                                      | Fleet plan, task graph, role and permission boundaries, validation gates, and a single-agent counterfactual.                                                                                                     | LO3, LO4, LO5, LO6           |
| 8       | **Compare — Evaluate workflows and scaling responses:** How should web applications respond to scaling pressure?                     | Compare A, B, and C under the shared primary pressure, then use relevant scenarios from the wider catalog to explain consequential differences; evaluate justified responses such as indexing, caching, replication, queues, partitioning, rate limiting, isolation, and geographical distribution; apply one formal model to an application decision and one to the development workflow; implement and remeasure the smallest justified response in one selected implementation; deploy the selected revision in an agreed realistic environment and rerun the shared workload. | Three-way primary-pressure comparison, focused additional analysis, formal-model calculations, before-and-after response evidence, deployed workload evidence, target architecture, and scaling trade-off table. | LO1, LO2, LO3, LO4, LO5, LO6 |
| 9       | **Compare — Evaluate workflows and scaling responses:** What do three agent-assisted implementations teach us about web scalability? | Present implementation C and its debugging view; compare all three applications and workflows; separate observation from attribution; defend a conditional architecture and development-workflow decision.                                                                                                                                                                                                                                                                                                                                                                        | Final A–B–C evidence package, reflection, and oral or written defense of the decision and its limits.                                                                                                            | LO1, LO2, LO3, LO4, LO5, LO6 |

## Learning outcome alignment

The revised structure covers all six outcomes through a progression from introduction to guided practice and demonstrated performance.
Coverage depends on the assessed evidence named below; lecture attendance or exposure to a concept is not sufficient by itself.

| Learning outcome                                                                                                        | Introduced                                                                                                                                                                                          | Practiced and reinforced                                                                                                                                                                    | Demonstrated through assessed evidence                                                                                                                                                                                               | Coverage judgment                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LO1. Understands the multiple dimensions of scalability and factors that contribute to web application scalability.** | Lecture 1 defines demand, data, contributor, and change pressures; separates response surfaces and constraints; and distinguishes scalability, performance, elasticity, resilience, and efficiency. | Lectures 2, 3, 5, and 6 connect development, measurement, friction, architecture, infrastructure, and operating conditions to those pressures.                                              | Lectures 8–9 require a cumulative multi-dimensional analysis anchored by one comparable pressure across A, B, and C and a conditional final decision.                                                                                | **Covered.** The outcome recurs across application and development-system pressures without reducing scalability to throughput or treating a mechanism as a dimension.                           |
| **LO2. Knows and applies architectural patterns and techniques for designing and building scalable web applications.**  | Lecture 4 introduces web boundaries, API contracts, state, failure, and compatibility through the implementation A cases.                                                                           | Lecture 6 connects idempotency, queues, partitioning, backpressure, and degradation to concrete pressures; Lecture 8 selects and implements one bounded response.                           | Lecture 8 requires before-and-after evidence for one implemented response and a target architecture that rejects unjustified alternatives and identifies explicit costs and new failure modes.                                       | **Covered.** Students must implement and evaluate a pattern in their own system rather than only describe or diagram it.                                                                         |
| **LO3. Understands the impact of the wide range of design decisions in building scalable web applications.**            | Lectures 1–2 establish constraints, stack choices, harness decisions, and validation strategy.                                                                                                      | Lectures 4–8 revisit consequences across architecture, friction, failure, orchestration, operations, cost, and sustainability.                                                              | Lecture 9 requires an evidence-based explanation of what changed, what caused or may have caused it, and what the group would choose next.                                                                                           | **Covered strongly.** Decision consequences form the narrative spine of all three parts.                                                                                                         |
| **LO4. Knows scalability laws and reflects on them in the context of architectural decisions.**                         | Lecture 3 introduces Little's Law using measured arrival rate, work in progress, and latency.                                                                                                       | Lecture 6 applies it to an application queue or bottleneck; Lecture 7 introduces Amdahl's Law through fleet parallelism and sequential review work.                                         | Lecture 8 requires one formal model applied to an application-architecture decision and one applied to the development workflow; Lecture 9 interprets the limits of both.                                                            | **Covered after revision.** The outcome now has an explicit two-law teaching sequence and required application evidence.                                                                         |
| **LO5. Can evaluate the scalability of web applications at multiple abstraction levels.**                               | Lecture 3 introduces evidence at request, component, and system levels.                                                                                                                             | Lectures 4–7 extend evaluation to architecture, code and workflow friction, operations, and development-system coordination.                                                                | Lectures 8–9 require a three-way evaluation spanning runtime behavior, architecture, reliability, maintainability, resource efficiency, and human review.                                                                            | **Covered strongly.** The shared protocol and pressure headings make evaluation comparable across levels and builds.                                                                             |
| **LO6. Has practical experience in designing, building, and deploying web applications that scale.**                    | Establish begins in Lecture 1 and establishes the first design and operational baseline.                                                                                                            | Students build and operate A during Lectures 1–3, B during Lectures 4–6, and C during Lectures 7–8, with acceptance checks, architecture records, runtime workloads, and cross-team audits. | By Lecture 9, students have three reproducible implementations, have implemented and remeasured one response to an observed or credibly projected limit, and have deployed the selected revision in an agreed realistic environment. | **Covered.** Building three applications, changing one in response to pressure, and rerunning its workload after realistic deployment connect design, implementation, operation, and deployment. |

## Projects

The book parts and projects use the same names: Establish, Challenge, and Compare.
They produce three independent implementations of one common, bounded application brief.
The required behavior and acceptance checks stay stable while the AI-assisted development setup changes.
In short:

- Establish - build a working baseline with a locally hosted model and a single-agent workflow.
- Challenge - build the same required behavior afresh with a foundation model and compare the process and result.
- Compare - build it again with an agent fleet, load the fleet's execution trace into the resulting application as debugging data, then measure, explain, and critique all three implementations and workflows.

The full handover-and-return cycle is no longer the main mechanism.
A bounded cross-team audit should preserve the unfamiliar-system lesson: another group runs the project from its documentation, applies the common checks, identifies a hidden assumption, and attempts one phase-specific but structurally equivalent change.

The first specification draft now consists of a [common application contract](specifications/00_common_project.md) and separate [Establish](specifications/01_establish.md), [Challenge](specifications/02_challenge.md), and [Compare](specifications/03_compare.md) overlays.
The rationale, comparison design, risks, and evidence requirements are recorded in [`docs/three-build-project-direction.md`](docs/three-build-project-direction.md).

## AI development-system comparison

The earlier proposal used a declining-capability arc: strong foundation model, weaker mini model, then weak department-hosted model.
Replace that with a progression from a local single agent to a foundation-model single agent and finally to a declared agent fleet.

The comparison has two main transitions.
Establish to Challenge changes model capability while keeping the single-agent workflow broadly comparable.
Challenge to Compare changes orchestration while keeping the fleet's base model declared and, preferably, equal to the Challenge model.
This avoids treating a fleet as if it were a model category.

Possible phase mapping:

- Establish: use a supported locally hosted model and a single-agent workflow to create the smallest compliant implementation and the first evidence package.
- Challenge: start from the same specification, not the Establish code, and use a foundation model through a single-agent workflow.
  Compare capability, speed, defects, architecture, review effort, and resource use.
- Compare: build a third implementation through bounded fleet roles and explicit integration.
  Transform the fleet trace into application data so the result becomes a debugging and observability tool for its own development workflow.
  Compare the fleet with the foundation-model single-agent workflow and analyze coordination cost, duplicated work, review throughput, and quality.

This arc can help grading: evaluate the common required behavior, scalability reasoning, quality of evidence, and the group's ability to constrain, generate, validate, integrate, and review AI-assisted work.
Do not reward generated output volume.

The default project theme is a modest event tracking application, but groups may choose an ambitious event-oriented domain if they keep the required core small.
One useful advanced option is a constrained visual agentic workflow platform where workflow definitions, runs, node executions, tool calls, retries, and failures are modeled as events.
This should remain a domain choice within the event-tracking brief rather than a new mandatory course project, since weaker groups could otherwise spend too much time on visual editor.

Each project phase should include evidence that the application or design has been run in a realistic environment: a local deployment command, hosted URL, container, deployment notes, benchmark run, logs, screenshots from a running instance, or another operational artifact appropriate to the phase.

The students are expected to perform self- and peer-assessment after each phase of the project so feedback may be shared with the project group and the students can reflect on their groupworking.

## Course learning diary

During the course, the students are expected to maintain a learning diary that should contain an entry per lecture about what they learned.
There will also be additional reading available related to each lecture besides the course book.
Note that the entries don't have to be written but can also be provided in an audio or video format.

## Grading

The grading for the course is formative and follows the student-facing [course assessment rubric](specifications/grading.md).
It is derived from the following factors:

1. Completion of the course projects within groups - up to 30 points are available per project (total: 90), 10 points from each project needed
2. Participation to the lectures (either live or remote) and learning diaries - 3 points are gained per participation (total: 27)
3. Self- and peer-assessment for project stages and for other students - up to 12 points per project (total: 36).

There's slight bias towards project work in the point system so you cannot complete the course by participation alone.

Half of the total points and at least 10 points from every project are required to pass the course.
The grades are scaled from the percentage of available points as follows:

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
