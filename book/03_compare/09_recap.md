# What do three agent-assisted implementations teach us about web scalability?

[Scalability](/concepts/#scalability) is the ability to keep a system useful while its conditions change.
The course project gives you three implementations of the same tracker to compare.
Suppose one handled the most traffic, but its next change took the longest to get through review.
Which would you choose if traffic doubled?
Would your answer change if the team expected to revise the tracker's lifecycle rules every month?
The decision asks you to connect what the application can handle with what it takes to change and operate it.

## One system, three connected loops

When the application reaches a limit, someone has to decide what to change.
People and agents implement the change, check it, and measure how the revised application behaves under pressure.

{{ import "site/includes/three-connected-loops-figure.html" }}

### The application loop: respond to pressure

Changing demand challenges an architectural assumption.
Measurements locate the first limit, and a response changes capacity, correctness, or recovery behavior.
Trace which signal identified the limit and what new failure mode or operating cost the response introduced.

### The development loop: preserve the ability to change

Each response must be implemented, checked, and maintained.
Contracts, tests, setup, and project knowledge determine how expensive that work becomes.
Identify what made the change difficult and which lesson became an executable check or maintained [decision record](/concepts/#decision-log).

### The agentic loop: turn execution into accepted change

The [constrain–generate–validate–revise loop](/concepts/#feedback-loop) allocates authority, produces a candidate, checks it, and corrects failures.
[Loop engineering](/concepts/#loop-engineering) designs how that work begins, retains progress, responds to observations, and stops or escalates within its authority and budget.
Its trace exposes attempts, handoffs, and human intervention that the final repository can hide.
Determine whether delegation reduced completion time through acceptance or moved effort into integration and [review](/concepts/#review-budget).

## How the loops affect one another

Consider adding a [queue](/concepts/#queue) for derived workspace-summary updates during a traffic spike.
Each accepted work-item creation or transition still commits its state change and matching activity event together; only the derived summary work is deferred.
The response affects all three loops:

| Perspective                   | Consequence of the queue                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Application loop              | Summary-work spikes can be buffered, but summary lag, backlog growth, duplicate effects, and worker saturation become possible                |
| Development loop              | The project gains worker code, retry and idempotency rules, new local setup, deployment, tests, and ownership                                 |
| Agentic loop                  | Tasks may decompose around producer, consumer, and verification boundaries, but their summary-update contract must settle first               |
| Evidence connecting all three | Queue age, time to an updated summary, duplicate effects, failure recovery, review effort, and trace history show whether the response worked |

::caption[One scaling response interpreted through all three loops.]
::label[table:queue-three-loop-example]

Measure two times from the user's action.
When did the client receive confirmation that the change had committed?
When did the updated count appear in the summary?
A queue can shorten the first wait while lengthening the second, and the team now has a worker to operate.

> **Sustainability angle**
>
> Which additional computation, storage, bandwidth, and human attention produced useful capacity or learning?
> Count waste displaced into backlog, retries, review, and maintenance as part of the response's cost.

## Apply the map to the three implementations

The team builds A with one agent using a large model, then B with one agent using a small model.
For C, it coordinates a fleet with approved model assignments.
The common brief and protocol give you a basis for comparing the three.
Along the way, the team learns more about the tracker.
The architecture, tools, hardware, optional scope, or reporting may also change.
Record which of those differences could explain the result you observed.

### Build the evidence matrix

The matrix belongs in the **final decision** bundle of the [four-part Compare submission](/project/compare/#what-to-do-and-submit).
For each dimension, link evidence from implementations A, B, and C—or explicitly state `not measured`—before answering the comparison question.
Use the earlier phase records and the implementation, fleet, and scaling/deployment bundles as sources; the matrix is an index and interpretation of that evidence.

| Evidence dimension             | Collect from each implementation                                                              | Compare across implementations                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Accepted browser behavior      | Acceptance results, escaped defects, and correction evidence                                  | Which differences affected users rather than only repository structure?         |
| Architecture and contracts     | Request trace and key boundary decisions                                                      | Which boundaries made independent change safer or harder?                       |
| Pressure and saturation        | Existing pressure record and first predicted or observed limit                                | How did each architecture respond to the shared primary pressure?               |
| Measurement and recovery       | Benchmark, operational signals, and recovery result                                           | What was directly observed, and what remained invisible?                        |
| Development friction           | Cross-team audit and [change effort](/concepts/#change-probe)                                 | Which setup, test, or coupling cost would dominate the next change?             |
| Human–agent workflow           | Execution trace, interventions, and review effort; include handoffs and backlog for the fleet | Which allocation produced accepted work at a sustainable correction cost?       |
| Resource use and externalities | Runtime and model-use evidence                                                                | Did added resources create useful capacity or quality, or merely more activity? |

::caption[Evidence matrix for synthesizing the three implementations through the three feedback loops.]
::label[table:final-evidence-matrix]

Missing evidence narrows the claims you can make.
For a build you never load-tested, mark the measurement as missing and explain what supports any prediction about saturation.
If all you recorded was elapsed time, you can compare duration but model efficiency remains unknown.
If implementation C produced more branches and took more review and correction, count both the activity and the cost of accepting it.

### Separate observation, inference, and proposal

A strong synthesis labels the status of each important claim:

- **Observed:** directly inspected or measured in a repository, running application, audit, test, trace, or recorded workflow.
- **Inferred:** a plausible explanation for an observation, with alternatives and confounding factors kept visible.
- **Proposed:** a future response or target design that was not implemented and validated in the compared build.

For example, “implementation B had the lowest measured p95 under the declared workload” is an observation.
“Its data model caused the difference” is an inference unless the comparison isolates that factor.
“A queue would protect its write path” is a proposal until the new behavior and [trade-offs](/concepts/#trade-off) are tested.
This vocabulary lets you reason beyond the available experiment without presenting plans as results.
The three builds are engineering case studies, with design, experience, and tool conditions changing together.
Keep their observations separate from the [supplied matched-trace analysis](/project/compare/#supplied-matched-single-agent-fleet-analysis) and any optional live pair, which hold a frozen revision and declared conditions stable for a narrower exploratory contrast.

> **Case — Faster libraries and uncertain attribution**
>
> :citet[lemire2026optimization] reports rebuilding revisions of six libraries and measuring workload-specific runtime gains on one Intel Xeon Gold 6548N machine.
> For the ada URL parser, he reports [throughput](/concepts/#throughput) rising from 0.54 to 1.28 GB/s on a corpus of 100,000 URLs.
> He also states that he cannot determine how much AI contributed to every change and discloses an advisory relationship with one contributing tool provider.
>
> The reported measurements support a claim about those revisions, workloads, and hardware.
> Attributing the gains to AI requires a comparison the account does not provide, and the parser's gain does not establish an application's end-to-end speedup.
> What additional evidence would you need to compare development effort or isolate AI's contribution?
> Keep the useful runtime result and the uncertainty about its cause visible together.

{{ import "exercise:judgment-evidence" }}

## Turn comparison into a decision

Use the [final comparison structure](/project/compare/#final-comparison) to turn the matrix into one argument: establish the comparison, explain consequential results, bound the explanation, and choose with a revisit condition.
A useful decision connects a constraint to evidence and an owner:

> For **[goal and constraints]**, choose **[architecture and workflow]** because **[observed result and its limits]**.
> Reject **[alternative]** because **[cost or unsupported assumption]**.
> **[Owner]** accepts the operational and correction obligations; revisit the choice when **[signal or pressure]** changes.

In the queue example, a team could accept a short delay in the summary to keep writes responsive during a burst.
To defend that choice, show how long a reader waited for the updated count, how the worker recovered from failure, and what it took to review and maintain the worker.

The same reasoning applies to adopting an agent workflow.
Better software outcomes can coexist with more review and maintenance work, fewer opportunities to learn, or less valued participation.
[Chapter 2's assistance outcomes](/chapters/scalable-development/#choose-what-to-participate-in) distinguish accepted output, retained competence, and valued participation.
A useful adoption decision considers how the team will develop the judgment needed to review and correct future changes.
Keep learning and participation effects unverified when the comparison did not examine them.

### Field note — Familiarity is part of effective capability

I can review and correct an agent's work more quickly when its explanations use terms I understand.
That personal fit affects the workflow alongside the model's task capability.
Changing models therefore changes both the tool and the reviewer's fluency with it, which belongs among the comparison's alternative explanations.

### Compare evidence index

Copy this outline into your existing evidence index and replace the prompts with links to actual records.
Use the [Compare deliverables](/project/compare/#what-to-do-and-submit) to check completeness and defend each claim against its evidence.
The template organizes the same four bundles; it adds no report or assessment criterion.

```md
# Compare evidence index

## 1. Implementation

- Accepted C revision and reproducible setup:
- Common checks, pressure evidence and cross-team audit/response:
- Earlier A and B records:

## 2. Fleet evidence

- Task graph, actual run and at least two debugging findings:
- Coordination measurements, failed attempts and human review:
- Supplied matched-trace analysis and workflow model:
- Missing records and comparison limits:

## 3. Scaling and deployment experiment

- Application model and selected revision:
- Implemented response and every same-procedure measurement:
- New failure or recovery check and deployed workload:
- Unverified properties and disappointing results:

## 4. Final decision

- A–B–C evidence matrix, target architecture and trade-offs:
- Conditional architecture and workflow choice:
- Observation, inference and proposal kept distinct:
- Rejected alternatives, owner and revisit condition:
```

Before finalizing, choose one key observation that could be contradicted.
Explain how that would change your decision and what you would check next.

## Project artifact

Complete the evidence matrix and final decision narrative within the [Compare submission](/project/compare/#what-to-do-and-submit).
Link the other three bundles and earlier phase records, mark missing evidence and remaining risks, and defend the next decision.

## Author perspective — Learn where to look

As in art, part of the skill is knowing where to look.
An agent can quickly produce a tracker that appears to work.
It still takes someone to ask whether a reader can use the form with a keyboard or who will recover a failed update.
To judge the tracker's sustainability, I might start by asking what it recomputes on every request and who uses the result.
I want the book to help you notice a question like that and recognize when you need someone else's expertise to answer it.

Writing this book has brought gaps in my own understanding to light.
As the tools change, I expect to keep asking what evidence would lead me to change my mind.

## Summary

An engineering decision connects the pressure a system can handle with the team's ability to change and operate it.
Defend that decision with the three implementations' evidence, explain its limits, and leave the next team a signal and correction path they can use.
