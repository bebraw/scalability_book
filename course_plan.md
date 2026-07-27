# Course plan

The course contains nine lectures and three projects: construct, reconstruct, and deconstruct. The projects are aligned with the lectures.

## Learning outcomes

I've listed the learning outcomes of the course below as it's vital to cover these through the course content.

1. Understands the multiple dimensions of scalability and understands factors that contribute to the scalability of web applications.
2. Knows and applies architectural patterns and techniques for designing and building scalable web applications.
3. Understands the impact of the wide range of design decisions in building scalable web applications.
4. Knows scalability laws and reflects on them in the context of architectural decisions.
5. Can evaluate the scalability of web applications at multiple abstraction levels.
6. Has practical experience in designing, building, and deploying web applications that scale. 

## Time plan

I have sketched out the initial timeline per week/lecture below:

**Establish**

1. What is scalability - course fundamentals (grading, groupwork etc.), group formation, define the central question, and get Construct started (LO1, LO3, LO6)
2. Scalable development - establish the constrain, generate, validate loop and the project harness for implementation A (LO1, LO3, LO6)
3. Benchmarking and observability - define the shared runtime workload and development-workflow evidence, complete Construct after this lecture (LO1, LO4, LO5, LO6)

**Challenge**

4. Architecture - students discuss their Construct implementations in public, use them as architecture cases, and start Reconstruct; most architecture content can be assigned as reading (LO2, LO3, LO6)
5. Friction (LO1, LO3, LO5)
6. Reality - discuss changed assumptions and a compact scaling bridge, then complete Reconstruct after this lecture (LO2, LO3, LO4, LO5, LO6)

**Compare**

7. Agent fleets - students discuss their Reconstruct implementations in public, consider agent coordination, and start Deconstruct (LO3, LO5, LO6)
8. Scaling - students apply the same pressures to all three implementations, synthesize a justified target design, and explain its trade-offs (LO2, LO3, LO4, LO5, LO6)
9. Comparison - students discuss their Deconstruct implementations in public, compare the evidence, and decide what architecture and development workflow they would choose under stated constraints (LO1, LO2, LO3, LO4, LO5, LO6)

## Learning outcome alignment

The current book and project structure covers the learning outcomes well overall: the early chapters establish scalability as a multi-dimensional concern, the middle chapters make students evaluate evidence and friction in their own systems, and the later chapters require redesign, trade-off analysis, and reflection. LO4 fits most naturally as a sequence: introduce scalability laws during benchmarking and observability, use them informally when discussing reality and overload, and apply them explicitly during the scaling lecture. The scaling lecture should require students to apply at least one law or formal scalability model to an architectural decision.

| Learning outcome | Primary time plan references | Book/project evidence | Validation note |
| --- | --- | --- | --- |
| LO1. Understands the multiple dimensions of scalability and factors that contribute to web application scalability. | Lectures 1, 2, 3, 5, 9 | `What is scalability?`, `Benchmarking and observability`, `Friction`, recap; Construct begins with a simple event tracking system. | Covered strongly through users, data, teams, change, performance, resilience, friction, and resource efficiency. |
| LO2. Knows and applies architectural patterns and techniques for designing and building scalable web applications. | Lectures 4, 6, 8, 9 | `Architecture`, `Reality`, `Scaling`; architecture and event-flow comparisons, pressure maps, and scaling trade-off tables. | Covered strongly if students use the architecture reading to interpret Construct and justify implementation B rather than only list techniques. |
| LO3. Understands the impact of the wide range of design decisions in building scalable web applications. | Lectures 1, 2, 4, 5, 6, 7, 8, 9 | Architecture and data-flow diagrams, friction audit, changed-assumptions list, agent workflow discussion, final reflection. | Covered strongly through repeated reflection on how early choices affect later change, operation, and coordination. |
| LO4. Knows scalability laws and reflects on them in the context of architectural decisions. | Lectures 3, 6, 8, 9 | Benchmarking introduces latency, throughput, percentiles, queue depth, and resource use; Reality applies the laws to overload and bottlenecks; Scaling should add laws such as Amdahl's Law, Little's Law, and the Universal Scalability Law. | Covered if Lecture 3 introduces the laws through measured behavior and Lecture 8 includes an explicit exercise where students use one law to explain a scaling limit or trade-off. |
| LO5. Can evaluate the scalability of web applications at multiple abstraction levels. | Lectures 3, 5, 6, 7, 8, 9 | Measurement and observability plan, friction audit, pressure map, scaling trade-off table, Deconstruct analysis of scalability, reliability, maintainability, simplicity, and resource efficiency. | Covered strongly across code, architecture, operations, collaboration, and system qualities. |
| LO6. Has practical experience in designing, building, and deploying web applications that scale. | Lectures 1, 3, 4, 6, 8, 9 | Three working implementations, architecture and deployment decisions, benchmark and observability evidence, and final comparative analysis. | Covered through project work if every phase includes a reproducible run path and the shared benchmark evidence. |

## Projects

The book parts are Establish, Challenge, and Compare. Within them, the three projects retain the operational labels Construct, Reconstruct, and Deconstruct. They are three independent implementations of one common, bounded application brief. The required behavior and acceptance checks stay stable while the AI-assisted development setup changes. In short:

- Construct - build a working baseline with a locally hosted model and a single-agent workflow.
- Reconstruct - build the same required behavior afresh with a foundation model and compare the process and result.
- Deconstruct - build it again with an agent fleet, load the fleet's execution trace into the resulting application as debugging data, then measure, explain, and critique all three implementations and workflows.

The full handover-and-return cycle is no longer the main mechanism. A bounded cross-team audit should preserve the unfamiliar-system lesson: another group runs the project from its documentation, applies the common checks, identifies a hidden assumption, and attempts or estimates one small standardized change.

The first specification draft now consists of a [common application contract](specifications/00_common_project.md) and separate [Construct](specifications/01_construct.md), [Reconstruct](specifications/02_reconstruct.md), and [Deconstruct](specifications/03_deconstruct.md) overlays. The rationale, comparison design, risks, and evidence requirements are recorded in [`docs/three-build-project-direction.md`](docs/three-build-project-direction.md).

## AI development-system comparison

The earlier proposal used a declining-capability arc: strong foundation model, weaker mini model, then weak department-hosted model. Replace that with a progression from a local single agent to a foundation-model single agent and finally to a declared agent fleet.

The comparison has two main transitions. Construct to Reconstruct changes model capability while keeping the single-agent workflow broadly comparable. Reconstruct to Deconstruct changes orchestration while keeping the fleet's base model declared and, preferably, equal to the Reconstruct model. This avoids treating a fleet as if it were a model category.

Possible phase mapping:

- Construct: use a supported locally hosted model and a single-agent workflow to create the smallest compliant implementation and the first evidence package.
- Reconstruct: start from the same specification, not the Construct code, and use a foundation model through a single-agent workflow. Compare capability, speed, defects, architecture, review effort, and resource use.
- Deconstruct: build a third implementation through bounded fleet roles and explicit integration. Transform the fleet trace into application data so the result becomes a debugging and observability tool for its own development workflow. Compare the fleet with the foundation-model single-agent workflow and analyze coordination cost, duplicated work, review throughput, and quality.

This arc can help grading: evaluate the common required behavior, scalability reasoning, quality of evidence, and the group's ability to constrain, generate, validate, integrate, and review AI-assisted work. Do not reward generated output volume.

The default project theme is a modest event tracking application, but groups may choose an ambitious event-oriented domain if they keep the required core small. One useful advanced option is a constrained visual agentic workflow platform where workflow definitions, runs, node executions, tool calls, retries, and failures are modeled as events. This should remain a domain choice within the event-tracking brief rather than a new mandatory course project, since weaker groups could otherwise spend too much time on visual editor details instead of scalability, reconstruction, and deconstruction.

Each project phase should include evidence that the application or design has been run in a realistic environment: a local deployment command, hosted URL, container, deployment notes, benchmark run, logs, screenshots from a running instance, or another operational artifact appropriate to the phase.

The students are expected to perform self- and peer-assessment after each phase of the project so feedback may be shared with the project group and the students can reflect on their groupworking.

## Course learning diary

During the course, the students are expected to maintain a learning diary that should contain an entry per lecture about what they learned. There will also be additional reading available related to each lecture besides the course book. Note that the entries don't have to be written but can also be provided in an audio or video format.

## Grading

The grading for the course is formative and it is derived based on the following factors:

1. Completion of the course projects within groups - up to 30 points are available per project (total: 90), 10 points from each project needed
2. Participation to the lectures (either live or remote) and learning diaries - 3 points are gained per participation (total: 27)
3. Self- and peer-assessment for project stages and for other students - up to 12 points per project (total: 36). These need a clear rubric so the criteria are fair and understandable to the students.

There's slight bias towards project work in the point system so you cannot complete the course by participation alone.

Half of the total points are required to pass the course. The grades are then scaled so that 90% of points results in a 5 and the rest of the grades fall between 50% and 90% as follows:

- 50% - 1
- 60% - 2
- 70% - 3
- 80% - 4
- 90% - 5

(I know this can be turned into a formula easily.)

- Individual tweaks to grades based on peer feedback

## Workload

Given the course has 5 ECTS, that gives 135 hours of work. That means 15 hours of effort per week so the course is demanding time-wise. I've done a rough calculation of the hour distribution below (average case):

- Lectures - 9 \* 2 = 18h
- Course learning diary - 9 \* 2 = 18h
- Projects and reflection - 33 \* 3 = 99h

## Topics to consider

- Privacy - how to avoid getting scraped and hit by bots
- AI-assisted development - how to review, constrain, and maintain code developed with AI assistance
- Expanded API contract design - how to define APIs and keep them compatible, decouple APIs from clients, and account for Conway's Law in API design
