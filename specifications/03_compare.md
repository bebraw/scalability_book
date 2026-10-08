# Compare Project

## Implementation C: Agent Fleet and Final Analysis

The [common project specification](00_common_project.md) applies to this phase.

---

## 1. Purpose

Compare creates a third fresh implementation of the Work Activity Tracker through an [agent fleet](/concepts/#agent-fleet) and then analyzes all three implementations and development workflows.

A fleet is an orchestration strategy, not a model category.
The central question is whether decomposition, specialization, and parallelism improve the result enough to justify coordination, duplicated work, integration, review, and resource cost.

Complete and submit implementation C before lecture 9. The public discussion and brief recap during lecture 9 use the fleet debugging views and final comparisons as evidence.

---

## 2. Starting Conditions

Begin in a new repository or clean implementation directory.

Use:

- the same common specification and acceptance scenarios;
- the transfer policy in the common specification;
- a declared model set and assignment policy: the Challenge small model is the reference configuration, and an approved fleet may use small models, large models, or a mixture;
- normally the same primary stack used for Challenge.

With the Challenge model held constant, B–C foregrounds orchestration while practice and architecture still differ.
A mixed-model fleet also changes model assignment, so B–C compares complete development systems rather than isolating either effect.
Declare the model assigned to each role or task, any routing or fallback rule, and the hypothesis about accepted quality, time, and cost.
Record the actual models used and any stack or configuration differences as interpretation limits.

---

## 3. What Counts as a Fleet

For this project, a fleet must include:

- at least two independently operating agent instances or delegated agent executions;
- explicit responsibility or task boundaries;
- a defined output from each delegated task;
- at least one handoff, integration point, or parallel branch;
- human or agent review before the integrated result is accepted.

Asking one agent to write from several fictional perspectives does not count as a fleet.

More agents are not automatically better.
Use the smallest fleet that allows the group to study a real coordination question.

---

## 4. Fleet Plan

Before implementation, record:

- the [task graph](/concepts/#task-graph) or workflow;
- each role or delegated responsibility;
- permitted models, their role or task assignments, routing and fallback rules, and the quality, time, or cost hypothesis behind the assignment;
- allowed tools, files, or modules where relevant;
- shared state that can survive between delegated runs, including who can write and later read it, how writes are attributed, how long it persists, and how it is cleared;
- when session orchestration and resource access are separate, their policy ownership and precedence, bypass paths, and the authenticated identity, [scoped delegated authority](/concepts/#authority), and task, budget, policy, and trace identifiers passed across the boundary;
- expected output and validation for each task;
- dependencies and possible parallel work;
- who or what owns integration;
- where human approval is required;
- the conditions for reducing or stopping the fleet.

Role names such as scout, planner, implementer, and reviewer are examples, not requirements.

The plan may change.
Preserve important changes and explain why they were made.

---

## 5. Required Work

### 5.1 Implement the common core again

Complete implementation C through the documented fleet workflow.

### 5.2 Evaluate coordination

In addition to the common evidence, record where possible:

- number and purpose of delegated tasks;
- work performed in parallel;
- duplicated exploration or implementation;
- handoffs and integration failures;
- conflicts or incompatible assumptions;
- idle time or blocked tasks;
- total model usage across the fleet;
- the model and route actually used for each task or attempt, including substitutions and fallback;
- total cost or resource use across all workers, retries, and failed attempts, with a declared cost basis for departmental inference and unavailable measurements marked;
- active human integration and [review time](/concepts/#review-budget);
- defects found after individual agents considered their work complete.

### 5.3 Turn the fleet trace into debugging data

Export or transform evidence from the actual fleet run into a documented machine-readable trace.
JSON is recommended, but another portable format is acceptable.
Use the downloadable [portable fleet-trace example](/downloads/project/fleet-trace-example.zip) to study the minimum schema, application mapping, redaction record, and repeat-import contract.
It is a transformation target rather than a required internal storage schema or a universal export format.

Map the fleet workflow to the application concepts:

- the project or fleet run becomes a workspace;
- delegated tasks become work items;
- agents and human participants become actors;
- task status maps to the documented lifecycle stages;
- delegation, start, completion, handoff, review, failure, retry, validation, and human intervention become activity events where the source trace supports them.

The trace format may contain additional relationships and metadata, such as parent tasks, dependencies, model information, duration, token use, cost, tool calls, validation results, or error details.

Provide a repeatable way to load the transformed trace into implementation C.
Use the application to inspect the run and answer at least two debugging questions, such as:

- Where did work stall, fail, or require a retry?
- Which handoff or dependency delayed progress?
- Where did agents duplicate work or make incompatible assumptions?
- Where did validation or review reject apparently completed work?
- Where and why did a human intervene?
- What became the bottleneck as concurrent work increased?
- Can every physical model or tool attempt, including denied, failed, retried, and cancelled attempts, be linked to its delegated run, actor, policy result, and usage or cost provenance, and can that run be assigned an explicit outcome?

Present the findings through the application's existing feed, filters, summaries, and any small additional view needed to make the evidence understandable.
Preserve model assignments in actor records and any per-attempt substitutions in event metadata or linked execution evidence; the portable example's model names and costs are synthetic teaching data.
A real-time integration, generic adapter for every agent tool, polished graph editor, and interactive step debugger are not required.

Treat imported traces as potentially sensitive.
Remove secrets and unnecessary prompt or source-code content before submission.

### 5.4 Compare one agent with the fleet

Treat implementations A, B, and C as comparative engineering cases, not estimates of the causal effects of model capability or orchestration.
Compare the recorded B and C workflows:

- Which observations suggest a benefit from delegation, and what else could explain them?
- Which tasks were too coupled, ambiguous, or small to delegate?
- Where did [accepted throughput](/concepts/#throughput) differ, under what conditions?
- Where did sequential work or review capacity become the bottleneck?
- Would one careful agent or a human have been preferable for any task?

Apply at least one relevant scalability law or formal model to the workflow.
Amdahl's Law, Little's Law, queueing, backpressure, or the Universal Scalability Law may be appropriate.

For one narrower contrast, replace part of the existing fleet rehearsal with a **bounded paired task**:

1. Freeze one accepted repository revision and a small change brief with independent acceptance checks before either attempt.
   Use two fresh copies of that revision and fresh agent sessions; this probe may reuse B and does not become the starting code for C.
2. Run one single-agent attempt and one bounded fleet attempt using the same small-model version, harness, available tools and permissions, environment, brief, and acceptance checks.
   Declare the fleet size and decomposition as the treatment being examined.
   This matched pair may use the Challenge model even when C's main implementation uses a mixed-model fleet; keep routing and fallback fixed so the pair examines orchestration.
3. Give both attempts the same predeclared wall-time limit, no more than 20 minutes each, and the same aggregate model-resource limit using the tool's supported token, cost, or request accounting.
   Count every fleet worker and retry against that limit; record which limit stops each attempt and any accounting gaps.
4. Hold the human-intervention policy constant, preserve failed and partial outcomes, and include integration and independent review in the recorded effort.
   Rotate condition order across groups where practical; do not transfer solutions or feedback from the first attempt to the second.
5. Compare accepted behavior, elapsed time, human effort, resource use, and correction work.
   Report one pair as one exploratory contrast; agents within the fleet are not independent trials.
   Human familiarity and stochastic variation can still affect the result.

This is a small task, not a fourth application or a requirement to repeat a whole build.
If matched access or accounting is unavailable, use instructor-supplied paired traces with the same metadata and checks; identify their provenance and missing evidence.
An unmatched pair may still be analyzed descriptively, but cannot establish an orchestration effect.
Link the pair and its limits in the fleet evidence bundle rather than adding a separate report.

An optional model-assignment comparison can use two fresh copies of the same frozen revision with the same brief, task graph, tools, checks, intervention policy, and predeclared limits.
Compare a small-only fleet with the same fleet assigning a large model to one named role or task; preserve actual routes and usage for all attempts.
Assess accepted behavior and defects, time through integration and human acceptance, and total cost under the declared cost basis.
Use this within the remaining rehearsal budget; it requires no fourth application or additional submission, and a useful result may show no benefit from the larger model.
To investigate unfinished work or routing decisions further, choose an optional [Compare exploration starting point](/explore/#phase-compare).

### 5.5 Analyze the three applications

Repeat the primary pressure against implementation C using the same workload and procedure where practical.
Compare A, B, and C under that shared pressure.
Then use the broader pressure catalog to select only the additional scenarios needed to explain consequential architectural differences.
You do not need to apply every catalog scenario exhaustively to every implementation.

Use the [final evidence matrix](/chapters/recap/#build-the-evidence-matrix) to compare accepted behavior, architecture, pressure, measurement and recovery, development friction, human–agent workflow, and resource use.
Judge scalability, reliability, maintainability, simplicity, and resource efficiency from that evidence.
Include optional-scope differences and the influence of practice, hardware, stack, tools, and other confounding factors.
Link existing phase evidence and mark missing measurements explicitly.

The final result should support a conditional engineering decision, not declare a universal winner.

Apply at least one scalability law or formal model to an application-architecture decision raised by the primary or selected pressures.
Name the variables and assumptions, show the calculation or reasoning, connect the result to runtime evidence or a stated pressure, and explain what the model does not capture.
This application analysis is separate from the workflow model required in section 5.4.

### 5.6 Implement and evaluate one scaling response

Select implementation A, B, or C and one pressure supported by runtime evidence or a credibly projected limit that the available environment can exercise.
Preserve the accepted revision and its baseline evidence, then implement the smallest justified response to that limit.
The response may be an index, bounded cache, idempotency boundary, admission control, queue with an explicit pending state, tenant isolation mechanism, or another technique justified by the evidence.
Distributed infrastructure is not required.

Keep the relevant fixture, workload, correctness checks, and measurement procedure unchanged.
Rerun the common acceptance scenarios and the selected pressure, report every repetition, and compare latency, throughput, errors, correctness, and the chosen resource-efficiency proxy before and after.
Exercise one failure or recovery obligation introduced by the response.
State whether the result supported, challenged, or left the original hypothesis unresolved, and preserve an unsuccessful result instead of silently replacing it with a more elaborate design.

### 5.7 Validate one realistic deployment

Select implementation A, B, or C based on the evidence collected so far.
Deploy the revision selected after the scaling-response experiment in an instructor-approved realistic environment outside the author's development process and rerun the [shared baseline workload](/project/#7-1-shared-baseline-workload).
Record the environment and configuration, operational steps, result, difference from the local run, first observed constraint, and what the run does not prove about larger scale.

---

## 6. Deliverables

Organize the final submission into four bundles.
These are sections in one evidence index, not four new documents or repositories.
Link each artifact once and refer to it from the relevant analysis; the common evidence and phase-specific requirements may share the same artifact.

### 6.1 Implementation

Provide the accepted implementation C revision and its [common submission bundle](/project/#9-common-submission-bundle-and-comparable-evidence), including setup, configuration, time and resource use, validation, architecture, pressure, and friction evidence.
Include the cross-team audit and response, and link the already-submitted A and B revisions and evidence for comparison.

### 6.2 Fleet evidence

Connect the fleet plan and task graph to a compact selected execution trace, its documented transformation, a repeatable loader into C, and application views answering at least two debugging questions.
Include coordination measurements, the B–C case analysis, the bounded paired task or supplied traces, and one workflow-level formal-model analysis.
The trace should expose consequential delegation, validation, integration, failure, or human intervention; select evidence that explains the findings rather than submitting an uncurated transcript dump.

### 6.3 Scaling and deployment experiment

Include one application-level formal-model analysis, the before-and-after evidence for an implemented scaling response, and its new failure or recovery obligation.
Add the realistic deployed-workload evidence and identify the selected implementation, revisions, environment, and measurement limits.
Sections 5.5–5.7 define the experiment; the application model is separate from the workflow model in the fleet bundle.

### 6.4 Final decision

Combine the A–B–C evidence matrix with one decision narrative following section 7.
Include the target architecture and scaling trade-off table, distinguishing implemented results from remaining proposals.
Reference the other bundles and earlier phase evidence instead of repeating their measurements or writing another report for each comparison question.

---

## 7. Final Comparison

Use the final decision bundle to make one conditional engineering argument:

1. **Establish the comparison.** State what the common specification kept stable and what differed across A, B, and C, including optional scope and measurement gaps.
2. **Explain the consequential results.** Compare application architecture under the shared and selected pressures and development effort through acceptance; use the fleet debugging findings to show what final code or a raw transcript concealed.
3. **Bound the explanation.** Separate A–B–C observations from hypotheses about model capability, practice, architecture, and orchestration.
   Use the bounded paired task for the narrower workflow contrast, stating what was controlled and what remains unresolved; neither one pair nor the three builds establishes a general effect.
4. **Choose and set a revisit condition.** For stated project constraints, choose an architecture and a large-model single agent, small-model single agent, or declared fleet configuration; explain rejected alternatives, responsibilities that remained human across the phases, ownership of operations and correction, and the next saturation signal or measurement that would change the decision.

Label important claims as observed, inferred, or proposed.
The [recap chapter](/chapters/recap/#turn-comparison-into-a-decision) shows how to connect the matrix to this argument.

---

## 8. Evaluation Emphasis

This phase emphasizes:

- a bounded and inspectable fleet;
- successful integration and validation;
- a useful self-observation loop in which implementation C exposes the workflow that produced it;
- evidence about coordination cost as well as throughput;
- application of scalability concepts to both software and workflow;
- causal humility in the three-way comparison;
- a defensible conditional decision rather than a tool ranking.

Fleet size, transcript length, generated code volume, and architectural complexity do not earn credit by themselves.

## Solo route

A single student may orchestrate the declared agent fleet; the fleet requirement concerns agents rather than the number of human teammates.
Use the smallest fleet that exposes a real delegation, handoff or integration question, retaining the published fleet, trace, correction and acceptance evidence.
Build fresh C, retain the bounded single-agent/fleet probe or approved supplied-trace alternative, and distinguish agent coordination from human teamwork.
Keep the three-way comparison, workflow-model analysis, measured scaling response, realistic deployment, final evidence matrix and conditional engineering decision.
Reference the already-frozen A and B records.

For the engineering session, predict the selected scaling response's effect and a new failure it could introduce, test it and defend the acceptance decision in the instructor discussion.
Receive an independent audit of C, perform the assigned reference or cross-group audit, and respond to findings without rewriting frozen source.
Complete the solo portfolio equivalents and ordinary lecture activities.
Record the solo operator's review and integration effort; agents within one fleet are not independent experimental trials or human peers.

---

## Instructor Notes

- Provide the Challenge small model as the reference configuration and publish which large models or mixtures are permitted for C.
  Keep the required single-agent/fleet pair on the same small model; any optional small-only/mixed-fleet contrast changes assignment while holding the task graph fixed.
- Before Compare begins, publish matched resource limits and condition-order assignments for the paired probe; provide a trace alternative when equivalent access is unavailable.
- Clarify whether sequential delegation counts.
  It can be pedagogically valid when the handoffs are explicit, although at least one parallel branch gives stronger evidence about integration and review pressure.
- Set a practical upper bound on fleet size or total model budget if resource use could become excessive.
- Require compact evidence.
  Raw multi-agent traces can become too large to review and may contain sensitive information.
- Use the portable example trace as the minimum transformation reference when the approved fleet tools do not expose a usable export.
  Grade the mapping and debugging reasoning rather than adapter complexity or exact schema imitation.
- Keep live ingestion and advanced graph visualization optional.
  The required learning outcome is trace-based understanding of the fleet, not integration with a particular agent platform.
- Align the final comparison with the course learning outcomes and the published [30-point project rubric](grading.md).
