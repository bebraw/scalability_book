# Lecture plan

This is an intentionally loose plan for the first run of the course.
Each lecture has 105 minutes.
The first meeting reserves time for questions at the midpoint and the end.
Later sessions can use up to 15 minutes flexibly for questions, technical delays or extended discussion.

The learning outcomes in `course_plan.md` remain the overall design frame.
They do not need to be presented explicitly during each lecture.
Agentic development provides a current context for studying web scalability and building the three projects rather than an additional learning outcome.

## Working approach

The book gives each lecture a shared conceptual starting point, but the session does not have to reproduce the chapter as a presentation.
Lectures can move among a short framing, student impressions, concrete cases, live demonstrations, project experiences, and open discussion.

Use each chapter's “Try a connection” prompt as a short retrieval discussion before opening the [complete concept graph](https://scalableweb.dev/concepts/).
Ask students to explain an edge using project evidence, follow it into another chapter or case, and name an assumption that limits the transfer.
The graph supports discovery and revisiting ideas without adding a separate submission.

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
Establish uses a large-model single agent, Challenge a small-model single agent, and Compare a declared fleet that may use small models, large models, or a mixture.
Both single-agent models may be department-hosted; frame size and hosting separately, and keep supplied matched small-model trace analysis and any optional live probe distinct from an optional model-assignment comparison.
Implementation A is submitted before Lecture 4, B before Lecture 7, and C before Lecture 9.
Schedule the bounded cross-team audit after each submission within the existing project allocation; announce the audit window and probe release separately so setup and change work do not consume presentation time.

## Lecture sequence

### 1. Course introduction and a common view of scalability

Use the [welcome deck](slides/lecture-01-orientation.md) for the first 55 minutes and the [scalability deck](slides/lecture-01-what-scalability-means.md) for the remaining 50.
Protect ten minutes at the end of each for written questions on any topic.

| Minutes | In the room                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| 0–10    | Introduce Juho and the TAs, then briefly show Moodle, the course workspace and a prepared diary note.             |
| 10–18   | Introduce the Work Activity Tracker and the three builds.                                                         |
| 18–32   | Show how 153 points map to grades and explain how students assess their own work and give each teammate feedback. |
| 32–45   | Start group formation and show how a student can propose a group or ask staff to assign one.                      |
| 45–55   | Take general written questions in Lecture Studio.                                                                 |
| 55–62   | Collect the class word cloud, invite two students to explain a word and save the result.                          |
| 62–68   | Introduce the book’s definition, then apply it to the running tracker and the team developing it.                 |
| 68–76   | Use one tracker example each for demand, data, contributor and change pressure.                                   |
| 76–89   | Run the pipeline demo and ask for a prediction before each change.                                                |
| 89–95   | Discuss what a team could test in Implementation A and what to bring to its first session.                        |
| 95–105  | Take general written questions in Lecture Studio.                                                                 |

For each deck, turn **Live** on and show the audience link so students can use **Ask a question** as questions occur to them.
At each Q&A, open **Responses → Questions**, choose **Discuss** to show a question and answer it.
Copy questions you want to revisit into a private staff note before choosing **Done** or switching decks.
The second deck starts a fresh queue.

Open the chapter with **What is scalability to you?**
Ask for one word or short phrase before offering examples.
Approve responses, choose **Show approved cloud** and invite students to explain what they had in mind.
Save a screenshot of the approved cloud, or its terms and counts, in a private instructor folder labeled with the course run and date.
In Lecture 9, ask the same question before showing the saved cloud.
If the live activity is unavailable, collect the class’s own words on the board and photograph them.

**Pipeline demonstration.** Open **Can the tracker keep up?** in the live deck.
The same [pipeline model](https://scalableweb.dev/learn/pilot/responses/#slide-capacity) is linked in the student slides.
Ask the class to keep the event queue from growing.
Start at 100 new events per second with retries at zero and admission control off.
The database has room for 10 more events per second.

1. Ask for a prediction, then raise **New work /s** to **150**.
   Read the result together.
   The model's database can handle 110 per second, so the queue grows by 40 per second.
2. Ask whether adding 40 per second of database capacity will close the gap.
   Choose **Add 40/s at limit**.
   The downstream stage can handle 130 per second, leaving 20 per second to accumulate.
3. Ask which two counts students would compare to check the same claim in a real tracker over one minute.
   The displayed rates come from the model.
   A team would need observations of arrivals, completions and anything rejected in its own system.

If the controls are unavailable, draw the two stages with capacities of 110 and 130 on the board.
Offer 150 events in one second and let students work out the excess before and after increasing the database capacity.

After the demo, ask what the team could check about its running tracker and what it could check about changing the code.
Teams take those two claims to their first session, build A with the approved large model and one coding agent at a time, and submit before Lecture 4.
Students follow the [diary setup guide](docs/course-diary.md) independently after class and keep their private cache prediction for Lecture 9.

Before class, rehearse the [systems tour and Q&A controls](docs/course-system.md#prepare-the-first-lecture).
Confirm the TAs’ names and contact route, the course link and group-formation dates.
If time runs short, show the prepared diary note briefly and take one prediction per change in the demo.

### 2. Coding agents and first experiences

Follow the same CSV export from a colleague’s request to a file they can open.
First have the class describe how a team would deliver it.
Then put an agent in charge of writing the patch and ask what the team is now waiting for. [Student slides](slides/lecture-02-agent-supported-development.md)

| Minutes | In the room                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| 0–12    | Poll the class about their own agent experience and ask two people what they would check themselves.             |
| 12–24   | Walk through a developer-led CSV change from a user example to release and a bug report.                         |
| 24–35   | Use the comparison table to decide who supplies the export rules, who makes edits and who can accept the result. |
| 35–44   | Trace the book’s CSV diagram together, using a title containing commas to explain the failing check.             |
| 44–57   | Predict the review queue with a second poll, then work out the flow for both columns.                            |
| 57–67   | Compare the classroom model with the reported contribution and review experience at epilot.                      |
| 67–84   | Predict, test and discuss the tracker’s retry behavior across a worker restart.                                  |
| 84–96   | Drive the release demo through a requested change and ask which checks the new patch still needs.                |
| 96–105  | Apply one check to Implementation A, revisit the opening answers and take written questions.                     |

**Read the room.** Start Lecture Studio’s live session and show the audience link before offering examples.
Give students who have never used a coding agent time to answer.
If many are new, explain how a coding agent reads files, chooses a tool, edits the code and sees the result of a command.
If many have run agents, ask for a recent change that took longer to check than to write.
For either group, ask what would make them give the tool more or less responsibility.
Students can use **Ask a question** throughout; review their written questions at the end.
If polling is unavailable, take a show of hands, then invite someone from two different groups to explain their choices.

**Before and after.** Ask who decides the exported columns and who will notice if they change.
Show how a human developer could use a library, tests and continuous integration before delegating edits to an agent.
Point at the same acceptance step in both columns.
In the book figure, the title `Build, measure, learn` is one field and location is the second.
The unquoted commas produce four parsed fields.
Ask what input the team should keep in its test suite and who would decide whether adding an event ID is acceptable.

**Queue poll.** Count a patch when it is ready for review, then again when review finishes.
Assume steady arrivals to an initially empty queue, equal-size patches, no rework and capacity for three reviews per hour.
At two patches per hour, both can clear review and none accumulate.
At six per hour, three clear review and three accumulate each hour.
Ask what students would measure if reviewers instead spent most of their time waiting for the requester to clarify the task.

**epilot.** Viljami Kuosmanen reported that non-engineers initiated 807 agent pull requests from February through September 2026, of which 543 were merged.
In one customer-success case, an engineer declined a proposed duplicate-detection fix and addressed the underlying cause.
Ask which part of that judgment a preview supplied and which part required knowledge of the system.
To estimate review waiting time, pair the time a patch became ready with the time its first review began.
The two counts alone give neither that interval nor the reasons other patches had yet to merge. [Kuosmanen’s SDLCAI slides, pp. 21–22, 41, 45](https://www.sdlcai.org/media/talks/non-engineers-vibe-code-production/404574e7-178f-48ea-bca5-02245c74ab6a.pdf#page=22)

**Recorder demo.** Open the [event-recorder exercise](https://scalableweb.dev/explore/challenge-an-explanation/) and show the code before the proposed test.
Ask everyone to write down the three counts for request `C7`.
Have the agent propose a check, or use the exercise’s same-recorder test.
Ask whether that test would still pass if a restarted worker wrote a duplicate.
To run the comparison, paste the exercise’s `makeRecorder` function into a browser console, then run:

```js
const events = [];
const append = (id) => events.push(id);
let record = makeRecorder(append);
await record("C7");
console.log(events.length);
await record("C7");
console.log(events.length);
record = makeRecorder(append);
await record("C7");
console.log(events.length);
```

The counts are 1, 1 and 2.
Constructing a new recorder clears its in-memory set while the same event list survives.
On the board, keep one column for that set and another for the stored events.
Ask a student to redraw only the state that a restart replaces.

**Release demo.** In the [release model](https://scalableweb.dev/learn/pilot/agent-development/#slide-gates), choose **Plan approved**, **Patch ready**, **Tests pass**, **Review start** and **Request changes**.
Have someone predict what will be available after the next **Patch ready**.
Choose **Review start** and **Approve** on the revised patch, then ask why **Release** is still unavailable.
Choose **Tests pass** to enable release.
If projection fails, draw two boxes labeled “checks” and “review” and clear both when the patch changes.

Close by asking which step in the team’s first build they would delegate now and what observation would make them reconsider.
Direct teams to the existing 30-minute [engineering session](specifications/00_common_project.md#shared-engineering-sessions) to try their chosen check.
Someone other than the operator explains the result and the team records its decision in the existing project log.

### 3. Measurement and observability

Possible elements:

- establish the practical vocabulary teams need for workloads, load, latency, throughput, errors, distributions, resource use, logs, metrics, and traces;
- show the two runs in [Which requests counted?](https://scalableweb.dev/chapters/benchmarking/#which-requests-counted) and let students check both the dashboard's p95 and the user's deadline.
  Then give them the sample assistant conclusion and ask for one sentence they would publish;
- discuss [a request to rank contributors by completed items](https://scalableweb.dev/chapters/benchmarking/#should-the-tracker-rank-contributors).
  Ask what decision the lead needs to make and whose work the log leaves out.
  If the aim is to offer help, ask which items students would inspect and whom they would talk to;
- introduce Little's Law as a way to check whether measurements at one declared boundary are coherent;
- use the book's [event-to-review question](https://scalableweb.dev/chapters/benchmarking/#exercise-measurement-transfer) for a brief individual calculation, then compare boundaries and assumptions in pairs;
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

Open the discussion by asking students to find one expectation they recorded during Establish in a diary entry or project decision.
Ask them to recall why they thought so and set that expectation beside one thing they have since observed in their own work, an audit or another team's demonstration.
For example, a student might have expected setup to slow a newcomer down, then watched a reviewer start the app in a minute and spend twenty finding where a work item is saved.
In their usual diary entry, students explain how that observation supports or changes their expectation and what they will do or check in implementation B.
If the evidence leaves the question open, identify the observation that would help settle it.
Use the same prompt for remote reflection and invite students to share whichever example they choose in discussion.

Possible elements:

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
- use the [status-and-activity retry exercise](https://scalableweb.dev/chapters/reality/#exercise-pressure-retries): ask students to predict individually, inspect all promised effects in pairs, and explain their verdict before revealing the worked answer; change the duplicate domain event to a diagnostic request log and revisit the boundary;
- use [Appendix C's HTTP method discussion](https://scalableweb.dev/appendices/advanced-web-boundaries/#distinguish-http-method-semantics-from-domain-retry-safety) when teams need the distinction between method semantics, response differences, and application-specific retry guarantees;
- apply Little's Law to a suitable queue or in-flight boundary;
- connect the discussion to the repeated primary pressure and bounded correctness or recovery investigation required for Challenge;
- assess a compact documented-incident transfer in this lecture activity, distinguishing source facts, interpretation and project transfer; link its entry from the project index without another detailed incident pressure map.

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
Require compact redacted actual-run evidence and at least two debugging findings; offer the portable trace example and import into C as an optional extension.
Prepare supplied matched traces with provenance, brief, configurations, acceptance outcomes and accounting limits for the Compare activity; a student-run matched pair is optional.
Assign the fleet chapter as preparation, including task decomposition, authority, integration, review capacity, and Amdahl's Law.
Use Lecture 8 to work through the application and workflow models students must apply.

### 8. Scaling pressure and justified responses

Possible elements:

- capture how students currently see scaling pressure and compare the answers with earlier discussions;
- begin from observed or credibly projected limits rather than from a catalog of techniques;
- discuss saturation, formal models, and examples of caching, indexing, queues, partitioning, rate limiting, orchestration, or geographical distribution;
- work through one application-level model and one workflow-level model, naming variables, assumptions, evidence, and limits; use Amdahl's Law to discuss sequential integration or review work;
- use the [feature-and-review exercise](https://scalableweb.dev/chapters/agent-fleets/#exercise-fleets-amdahl): have students predict individually whether doubling agents doubles accepted output, calculate in pairs, then explain the review backlog and challenge one assumption before revealing the worked answer;
- revisit Little's Law and Amdahl's Law through the [model-choice question](https://scalableweb.dev/chapters/scaling/#exercise-scaling-model-choice), asking students to justify the choice before opening the references;
- examine how each response moves complexity and creates another failure or recovery obligation;
- connect the discussion to the before-and-after intervention in one selected implementation, a check of its new failure or recovery obligation, and the shared workload rerun after realistic deployment required for Compare.

The balance between cases, interactive demonstrations, and project clinics can follow the evidence teams have available.
Negative or unresolved interventions are worth discussing when the baseline, change, and uncertainty are clear.

### 9. Compare presentations and course reflection

Reserve most of the session for teams to present implementation C and their A–B–C comparison.
Ask teams to emphasize:

- the strongest observed evidence, including a debugging finding from the actual fleet run that produced C; show C's fleet debugging view only if implemented;
- one important inference and its alternatives;
- one proposed response that remains untested;
- the conditional application and development-workflow decision they would make;
- the first boundary or question they would investigate next.

Use the presentations to recap the connections among application scalability, development scalability, architecture, measurement, pressure, formal models, and engineering judgment.

Use five minutes of the closing reflection to revisit the Lecture 1 cache case individually.
Give the same two prompts in order in the remote equivalent.

1. Show the original case.
   Give students two minutes to answer independently in their private lecture diary, with any earlier entry closed and before using an agent.
   Ask for their provisional recommendation, first measurement and reason.
2. Then reveal what staff saw during shift handover.
   Completed items sometimes still appear as active in the summary.
   Give students three minutes to explain whether they would keep the cache, what they would measure next and how the result would affect their decision.

During the discussion, invite students to compare with their opening entry if they have it, or identify an uncertainty the handover observation raised.
When reviewing the diaries, look for a connection between a user's decision, an observable effect and evidence that could change the student's recommendation.

Ask **“What is scalability to you?”** again.
Collect the new words before showing the class its first answers.
Then show the approved final cloud alongside the opening screenshot or transcription saved for this course run.
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
