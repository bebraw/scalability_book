# Independent lecture activities

**Draft activities for the October to December 2026 solo arrangement.**

These nine activities provide the participation equivalents used with the [study agreement](study-agreement.md).
Plan approximately **two hours of reading, preparation and diary work plus two hours of active study per topic**, for 36 hours across the course.
Use the book introduction and corresponding part opening before starting each part.
Project implementation, full measurement runs and audits use the separate 99-hour project allocation.
Reuse their evidence here and count actual working time only once.

Before the proposed 2–4 November kickoff, use approximately 6–8 hours for the orientation described in the agreement.
Count this within Establish's 12 study hours, retaining reading notes and questions for the later activities and diary.
Complete project-dependent activity work after the assessment and tool arrangements are agreed at kickoff.

Before consulting an agent or a worked answer, write a short prediction or initial explanation.
Then inspect a case, operate a demonstration, calculate, or check evidence; finish by explaining what changed and what remains uncertain.
Agents may provide help under the phase's tool policy.
Keep enough independent reasoning to explain the conclusion in the instructor discussion.

For every activity, record its number, what you did and a link to the observation, calculation or existing artifact.
Add a short diary entry identifying one concrete idea and its connection to project evidence, an assumption or a decision.
Written, audio and video entries are supported.
One compact entry can contain both the completion record and the diary, with the two identified separately.
Activity completion and the two diary criteria are scored separately under the [rubric](../../specifications/grading.md#participation-and-learning-diary-3-points-per-lecture).

## Establish activities due 16 November

### Activity 1 Scalability claims

Read [Chapter 1](../../book/01_establish/01_what_is_scalability.md).
Before using the chapter's scalability dimensions lab, describe what must remain true as demand or data grows.
Explore a second pressure and explain why the same response might not address it.
Keep two bounded claims for A, with the pressure, maintained goal, relevant signal and evidence that could contradict each claim.

### Activity 2 Accepting agent work

Read [Chapter 2](../../book/01_establish/02_scalable_development.md).
Choose one bounded agent-assisted change already needed for A and predict a plausible incorrect implementation.
Use the maintained specification to state the intended behavior and acceptance condition before the agent acts.
Inspect the relevant behavior and checks, challenge the agent's explanation, and explain your acceptance or rejection.
Keep links to the change, one check capable of detecting the predicted error, and the human decision in the existing AI-use log.
Link any consequential design choice to the evolving ADR-style decision log.

### Activity 3 Measurement and boundaries

Read [Chapter 3](../../book/01_establish/03_benchmarking.md).
Predict a queue or latency result, investigate it with the chapter's queue balance or simulated benchmark lab, and calculate a Little's Law relationship with explicit units and assumptions.
Compare the lesson with A's existing baseline: identify the measured boundary, workload, distributions, errors and one conclusion the evidence cannot support.
Keep the calculation and a link to the baseline, distinguishing simulated observations from application measurements.

## Challenge activities due 30 November

### Activity 4 Architecture and authority

Read [Chapter 4](../../book/02_challenge/04_architecture.md).
Trace an existing A user action through browser, request handling, authoritative state and visible result.
Use the request boundary or cache decision lab to examine an alternative placement of work or data.
Keep the request path, one correctness obligation and a falsifiable architecture hypothesis for B.
Revisit a relevant A decision in the log and explain why it is retained, revised or rejected for B.
Review and improve the relevant specification using the implementation and audit lessons, keeping the common behavioral requirements stable.

### Activity 5 Development friction

Read [Chapter 5](../../book/02_challenge/05_friction.md).
Investigate the workflow loop or friction audit lab and predict where one apparently small change creates waiting, review or rework.
Compare this with your outgoing reference audit, separating setup time from change time and unfamiliarity from missing instructions.
Reuse the phase's evidenced friction finding and response: a checked improvement or a justified follow-up decision, distinguishing the observed result from a proposed next step.
The actual reference audit follows the instructor's separately released protocol and time box.

### Activity 6 Failure and recovery

Read [Chapter 6](../../book/02_challenge/06_reality.md).
Attempt the chapter's status-and-activity retry exercise before revealing its worked reasoning.
Change one assumption, such as whether the repeated effect is a domain event or a diagnostic log, and explain whether your verdict changes.
Choose a documented incident from the chapter and briefly explain the failed assumption, observable signal, response and recovery obligation that could matter for B.
Separate source facts from your interpretation and proposed transfer.
Keep this analysis in the activity entry and link it from the project evidence index; no additional detailed incident pressure map is required in the project record.
Link the existing A–B pressure evidence and explain one alternative to attributing its difference to model size.

## Compare activities due 16 December

### Activity 7 Fleet coordination

Read [Chapter 7](../../book/03_compare/07_agent_fleets.md).
Predict whether additional agents improve accepted output, then examine the chapter's Amdahl example and a delegation or correction lab.
Apply the reasoning to C's task graph, integration boundary and human review capacity.
Before inspecting the supplied matched single-agent/fleet traces, predict an outcome for their task.
Then compare the recorded controls, acceptance outcomes, elapsed time, human effort, resources and corrections; explain provenance, missing observations and what the pair cannot establish.
Distinguish supplied observations from your own C workflow, and label any synthetic teaching data.
Reuse this activity entry in the Compare evidence index; running your own matched pair and importing the actual C trace are optional extensions.

### Activity 8 Scaling response

Read [Chapter 8](../../book/03_compare/08_scaling.md).
Attempt the model-choice exercise before consulting the references and justify the assumptions of an application model and a workflow model.
Use a chapter demonstration to investigate the limit relevant to your selected scaling response.
Keep the model reasoning, a link to the project's before-and-after evidence and deployed workload result, and an explanation of the response's new failure or recovery obligation.
An unchanged or worse result should remain visible and be interpreted honestly.

### Activity 9 Engineering judgment

Read [Chapter 9](../../book/03_compare/09_recap.md).
Use the existing A–B–C evidence matrix to identify one observation, one inference with an alternative explanation and one untested proposal.
Prepare a concise walkthrough using the running application and existing evidence for the final discussion on 15 December.
Defend a conditional architecture and workflow choice, explain one fleet-debugging finding, and name the next measurement that could change your decision.
Keep the resulting reflection in the final private portfolio; a separate polished presentation is unnecessary.
Update the relevant decision records with the final evidence and revisit condition, retaining the earlier reasoning and phase-specific status.
