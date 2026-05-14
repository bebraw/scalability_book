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

**Construct**

1. Introduction to the course - course fundamentals (grading, groupwork etc.), group formation, what is scalability, get Construct started (LO1, LO3, LO6)
2. What is scalability (LO1, LO3)
3. Architecture (LO2, LO3, LO6)

**Deconstruct**

4. Friction (LO1, LO3, LO5)
5. Benchmarking and observability (LO1, LO4, LO5, LO6)
6. Reality - 1. portion (construct) of the groupwork is complete and the students discuss their implementations, discussion about reality, a compact scaling bridge, start of the next portion - reconstruct (LO2, LO3, LO4, LO5, LO6)

**Reconstruct**

7. Agent fleets - 2. portion (reconstruct) of the groupwork is complete and the students discuss their implementations, the topic of agent coordination is considered (LO3, LO5, LO6)
8. Scaling - students synthesize scaling techniques, trade-offs, and the evolution of their architecture under new pressure (LO2, LO3, LO4, LO5, LO6)
9. Recap - 3. portion (deconstruct) of the groupwork is complete and the students discuss their implementations, recap the whole course content and reflect on what was learned (LO1, LO2, LO3, LO4, LO5, LO6)

## Learning outcome alignment

The current book and project structure covers the learning outcomes well overall: the early chapters establish scalability as a multi-dimensional concern, the middle chapters make students evaluate evidence and friction in their own systems, and the later chapters require redesign, trade-off analysis, and reflection. LO4 fits most naturally as a sequence: introduce scalability laws during benchmarking and observability, use them informally when discussing reality and overload, and apply them explicitly during the scaling lecture. The scaling lecture should require students to apply at least one law or formal scalability model to an architectural decision.

| Learning outcome | Primary time plan references | Book/project evidence | Validation note |
| --- | --- | --- | --- |
| LO1. Understands the multiple dimensions of scalability and factors that contribute to web application scalability. | Lectures 1, 2, 4, 5, 9 | `What is scalability?`, `Friction`, `Benchmarking and observability`, recap; Construct begins with a simple event tracking system. | Covered strongly through users, data, teams, change, performance, resilience, friction, and resource efficiency. |
| LO2. Knows and applies architectural patterns and techniques for designing and building scalable web applications. | Lectures 3, 6, 8, 9 | `Architecture`, `Reality`, `Scaling`; Reconstruct architecture proposal, event flow, pressure map, and scaling trade-off table. | Covered strongly if Reconstruct requires students to justify chosen techniques rather than only list them. |
| LO3. Understands the impact of the wide range of design decisions in building scalable web applications. | Lectures 1, 2, 3, 4, 6, 7, 8, 9 | Architecture and data-flow diagrams, friction audit, changed-assumptions list, agent workflow discussion, final reflection. | Covered strongly through repeated reflection on how early choices affect later change, operation, and coordination. |
| LO4. Knows scalability laws and reflects on them in the context of architectural decisions. | Lectures 5, 6, 8, 9 | Benchmarking introduces latency, throughput, percentiles, queue depth, and resource use; Reality applies the laws to overload and bottlenecks; Scaling should add laws such as Amdahl's Law, Little's Law, and the Universal Scalability Law. | Covered if Lecture 5 introduces the laws through measured behavior and Lecture 8 includes an explicit exercise where students use one law to explain a scaling limit or trade-off. |
| LO5. Can evaluate the scalability of web applications at multiple abstraction levels. | Lectures 4, 5, 6, 7, 8, 9 | Friction audit, measurement and observability plan, pressure map, scaling trade-off table, Deconstruct analysis of scalability, reliability, maintainability, simplicity, and resource efficiency. | Covered strongly across code, architecture, operations, collaboration, and system qualities. |
| LO6. Has practical experience in designing, building, and deploying web applications that scale. | Lectures 1, 3, 5, 6, 8, 9 | Construct working application, architecture and deployment decisions, benchmark or observability evidence, Reconstruct redesign or prototype, Deconstruct final analysis and reflection. | Covered through project work if each phase includes lightweight operational evidence, such as a reproducible local run command, hosted URL, container, deployment notes, benchmark run, logs, or screenshots from a running instance. |

## Projects

The three projects are called construct, reconstruct, and deconstruct. The idea is to show the students that scalability is also about the ability to re-engineer existing projects and finally analyze them. In short:

- Construct - build a working baseline.
- Reconstruct - change it under new constraints.
- Deconstruct - measure, explain, and critique the result.

The projects are described in detail behind the `specifications` folder and each has its own technical targets.

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
