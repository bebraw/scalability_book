# Lecture plan

This is an intentionally loose plan for the first run of the course.
Each lecture is approximately 90 minutes, with about 15 additional minutes left uncommitted for questions, technical delays, extended discussion, or an activity that proves more useful than expected.

The learning outcomes in `course_plan.md` remain the overall design frame.
They do not need to be presented explicitly during each lecture.
Agentic development provides a current context for studying web scalability and building the three projects rather than an additional learning outcome.

## Working approach

The book gives each lecture a shared conceptual starting point, but the session does not have to reproduce the chapter as a presentation.
Lectures can move among a short framing, student impressions, concrete cases, live demonstrations, project experiences, and open discussion.

The first run should remain adaptable:

- use student questions and project evidence to decide where discussion needs to go deeper;
- prefer a concrete example or live demonstration when terminology becomes abstract;
- capture initial views before introducing the chapter's framing;
- allow unresolved questions and failed attempts to remain visible;
- avoid adding presentation work that is separate from the projects;
- record after each meeting what landed, what remained unclear, and what should change in the next lecture.

Lectures 4, 7, and 9 are primarily project-presentation sessions.
Lectures 4 and 7 reserve only enough additional time to introduce the next project phase and answer immediate practical questions.
The matching book material can be studied independently and revisited in later discussion when it helps interpret project evidence.
The remaining lectures develop the ideas and practices that the teams need for the current project phase.
The course-plan table describes the associated reading and project work as well as class activity; its evidence is not all produced during the lecture itself.
The slide drafts are a pool of framing and discussion material, especially in presentation-led sessions.

Before each phase begins, complete the [course environment sheet](specifications/course_environment.md) and confirm supported access, budget, and fallback arrangements.
Implementation A is submitted before Lecture 4, B before Lecture 7, and C before Lecture 9.
Schedule the bounded cross-team audit after each submission within the existing project allocation; announce the audit window and probe release separately so setup and change work do not consume presentation time.

## Lecture sequence

### 1. Course introduction and a common view of scalability

Possible elements:

- introduce the course, related work, practical arrangements, and the three-project structure;
- form teams, unless already formed: groups must have three students wherever possible, with instructor-arranged exceptions for cohort remainders, support needs, or membership changes;
- explain how group projects, lectures, learning diaries, reflection, and assessment fit together;
- collect students' initial associations with scalability through a word cloud or similar activity;
- discuss the different views of scalability developed in the first chapter;
- distinguish pressures, maintained goals, responses, constraints, and neighboring properties without trying to exhaust the topic;
- briefly introduce agent-driven development so teams can begin Establish.

The lecture should leave teams ready to choose a project direction and state their first bounded scalability claims.
Preserve the initial word cloud so it can be compared with the final lecture.

### 2. Coding agents and first experiences

Possible elements:

- collect teams' first impressions, surprises, problems, and questions from working with coding agents;
- use these experiences to open the chapter's discussion of intent, constraints, validation, correction, ownership, and development throughput;
- compare places where agents accelerated work with places where they moved effort into review or debugging;
- demonstrate a bounded agent-supported development task live;
- discuss what evidence would be needed before accepting the demonstrated result;
- connect the demonstration to the required reproducible harness, validation commands, and decision and AI-use records;
- introduce the shared engineering-session protocol for use during Establish project work.

The exact live demonstration can follow current student concerns.
It is more useful to expose observation, failure, correction, and validation than to present a perfectly scripted successful run.

### 3. Measurement and observability

Possible elements:

- establish the practical vocabulary teams need for workloads, load, latency, throughput, errors, distributions, resource use, logs, metrics, and traces;
- discuss two or three concrete measurement or observability cases;
- introduce Little's Law as a way to check whether measurements at one declared boundary are coherent;
- demonstrate a benchmark, browser measurement, request trace, or observability workflow;
- connect the examples to the shared baseline workload, one repeatable primary pressure, and development-workflow evidence teams will reuse across A, B, and C.

One or two live demonstrations can be used depending on time and what the teams have already managed to implement.
The goal is to leave teams able to create and interpret a modest, repeatable evidence baseline rather than to survey every observability tool.

### 4. Establish presentations and Challenge launch

Reserve most of the session for teams to present implementation A.
The exact allocation depends on the number of teams.

Presentations should draw from the project rather than require a separate polished deck.
A team might show:

- the running application or core user path;
- one bounded scalability claim;
- one consequential architecture or development decision;
- one measurement, trace, failure, or surprising observation;
- one question the group is carrying forward.

Connections to web architecture can emerge through the presentations and questions, but the session does not need to teach the architecture chapter separately.
Assign the architecture chapter as preparation and revisit unclear boundaries during Lecture 5.
Finish with a concise introduction to Challenge, the expectations for a fresh implementation B, the architecture hypothesis, permitted transfer of artifacts, and the practical questions teams need answered before starting.

### 5. Development friction

Possible elements:

- capture how students currently understand development friction, for example through another word cloud;
- discuss setup, comprehension, change, testing, review, deployment, operational, and coordination friction;
- use experiences from Establish to distinguish protective friction from repeated work that adds little confidence;
- trace one apparently small web change across browser, contract, validation, data, and deployment boundaries;
- prepare teams for the cross-team audit and feedback-loop improvement in Challenge.

The discussion can focus on the forms of friction that are actually appearing in the projects rather than treating every category equally.

### 6. Assumptions under pressure

Possible elements:

- discuss how local correctness leaves production assumptions untested;
- work through one or more concrete failure or incident chains;
- connect pressure, failed assumption, saturation boundary, amplification, user-visible effect, response, and recovery;
- revisit retries, idempotency, queues, backpressure, degradation, and recovery when the cases justify them;
- apply Little's Law to a suitable queue or in-flight boundary;
- connect the discussion to the repeated primary pressure and one revealing secondary pressure required for Challenge;
- show how a documented case becomes a project pressure map, distinguishing source facts, interpretation, and transfer to the students' application.

The lecture can lean toward cases, a live pressure-map exercise, or project discussion depending on which form makes the causal chain clearest to the group.

### 7. Challenge presentations and Compare launch

Reserve most of the session for teams to present implementation B and their comparison with A.
Useful presentation material includes:

- a consequential difference between A and B;
- comparable pressure or measurement evidence;
- one architectural assumption exposed by the second implementation;
- one friction or recovery finding;
- an interpretation together with a plausible alternative explanation.

Use the presentations to separate observed differences from attribution to a model, stack, workflow, or growing team experience.
Finish with a concise launch of Compare and implementation C, including the fleet constraint, task and authority boundaries, integration and validation gates, and immediate practical questions.
Point students to the portable trace example and the requirement to load their transformed fleet trace into C and explain at least two debugging findings.
Assign the fleet chapter as preparation, including task decomposition, authority, integration, review capacity, and Amdahl's Law.
Use Lecture 8 to work through the application and workflow models students must apply.

### 8. Scaling pressure and justified responses

Possible elements:

- capture how students currently see scaling pressure and compare the answers with earlier discussions;
- begin from observed or credibly projected limits rather than from a catalog of techniques;
- discuss saturation, formal models, and examples of caching, indexing, queues, partitioning, rate limiting, orchestration, or geographical distribution;
- work through one application-level model and one workflow-level model, naming variables, assumptions, evidence, and limits; use Amdahl's Law to discuss sequential integration or review work;
- examine how each response moves complexity and creates another failure or recovery obligation;
- connect the discussion to the before-and-after intervention in one selected implementation, a check of its new failure or recovery obligation, and the shared workload rerun after realistic deployment required for Compare.

The balance between cases, interactive demonstrations, and project clinics can follow the evidence teams have available.
Negative or unresolved interventions are worth discussing when the baseline, change, and uncertainty are clear.

### 9. Compare presentations and course reflection

Reserve most of the session for teams to present implementation C and their A–B–C comparison.
Ask teams to emphasize:

- the strongest observed evidence, including a finding from implementation C's fleet debugging view;
- one important inference and its alternatives;
- one proposed response that remains untested;
- the conditional application and development-workflow decision they would make;
- the first boundary or question they would investigate next.

Use the presentations to recap the connections among application scalability, development scalability, architecture, measurement, pressure, formal models, and engineering judgment.

Repeat the opening scalability word cloud or another equivalent activity.
Compare the two views and discuss:

- which ideas persisted;
- which became more precise;
- which new dimensions appeared;
- which apparent certainties disappeared;
- what the class still does not know.

Leave time for individual and group reflection on the course and the three projects.

## Project presentations

The presentation format can remain flexible during the first run.
The number of teams will determine whether presentations are short demonstrations, longer discussions, or a mixture of stage presentations and a gallery format.

A useful default is to ask each team to show one working path, one piece of evidence, one consequential decision, and one unresolved question.
This keeps the presentations comparable without forcing all teams into the same conclusion or creating a second deliverable.

Questions from other students should be part of the presentation period.
The lecturer can help by asking about boundaries, evidence, trade-offs, alternative explanations, and what the result does not prove.

### Large-cohort option

With approximately 50 students, plan for about 17 teams and adapt presentation timing to the actual cohort.

Before Lectures 4, 7, and 9, each team can submit a lightweight **project card** assembled from its existing deliverables:

- one screenshot, diagram, trace, result, or other central artifact;
- one observed claim supported by evidence;
- one consequential decision or interpretation;
- one limitation, surprise, or unresolved question;
- links to the running application and fuller evidence where available.

The cards can be placed in one shared deck, page, or gallery and made available before the lecture.
They let the lecturer and students notice recurring themes, prepare questions, and reduce time lost while switching between projects.
They support rather than replace the stage presentations.

When every team presents at every checkpoint, a workable default is:

1. **Team presentations, approximately 68 minutes.** Give each of about 17 teams four minutes, including a brief clarifying question or transition.
2. **Shared interpretation, approximately 10 minutes.** Collect questions and comparisons during the presentations, then discuss recurring themes or two particularly useful contrasts rather than opening a long question period after every team.
3. **Phase transition.** In Lectures 4 and 7, use the remaining planned time and, when useful, part of the 15-minute margin to introduce the next project.
   Lecture 9 can use this time for the final word cloud and reflection.

This deliberately gives the presentation-focused lectures a different balance from the other meetings.
The architecture, fleet, and recap chapters do not also need to be delivered as condensed lectures during the same session.

If some projects need deeper discussion, rotating spotlight presentations remain an alternative.
Every team can still provide a short update, while a few teams receive a longer question period because their results expose a useful contrast, failure, or unresolved issue.

If the room supports movement, a demo gallery is another option.
One member of each trio hosts the project while two visit; rotate through three rounds so everyone hosts and visits.
A short plenary then brings forward contrasting results or questions that occurred across several teams.

The presentation focus can change by phase:

- **Lecture 4:** one working path, one bounded scalability claim or baseline observation, and one surprise from implementation A;
- **Lecture 7:** one consequential A–B difference, the evidence for it, and one alternative explanation;
- **Lecture 9:** one conditional decision, the strongest observation supporting it, and the next boundary or question.

Teams can rotate speakers across the three phases.
Neither a project card nor a four-minute stage contribution is meant to summarize the whole submission; each gives the class enough shared evidence to notice patterns and decide what deserves discussion.

## Shared engineering sessions

Schedule one approximately 30-minute shared engineering session within each phase's project work, following the [common protocol](specifications/00_common_project.md#shared-engineering-sessions).
Rotate operator, challenger, and validator responsibilities across Establish, Challenge, and Compare.
Use the existing decision record or AI-use log for its evidence.
These sessions take place within project work and replace ordinary discussion and reflection; they are not additional lecture activities or submissions.

## Learning diary and reflection

The learning diary provides the main individual space alongside the bounded group experience.
Entries do not need a rigid lecture template, but prompts can be offered when useful:

- What idea, case, or project observation changed or sharpened my view?
- What did I learn from another team?
- Which claim or decision would I now revise?
- What did I personally contribute to or investigate in the current phase?
- What remains uncertain, and how might I learn more?

In each phase's existing self-assessment, require one consequential decision the student challenged, tested, or reviewed, with an evidence link and outcome, as specified in the [rubric](specifications/grading.md).

At the end of each phase, students can reflect on the relationship between the group's evidence and their own current understanding.
This does not require every student to have completed every task.
It asks them to make their learning, contribution, and remaining questions visible.

## Adapting during the first run

After each lecture, keep a short teaching note:

1. What discussion or demonstration produced useful learning?
2. What concept remained unclear?
3. What recurring project obstacle appeared?
4. What should receive more or less time in the next lecture?
5. Which student question should be carried forward?

This is a working plan rather than a promise to follow the same format every week.
The course should become more specific in response to what the first cohort actually builds, measures, questions, and learns.
