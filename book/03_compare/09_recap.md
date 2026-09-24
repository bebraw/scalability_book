# What do three agent-assisted implementations teach us about web scalability?

Scalability is the ability to keep a system useful while its conditions change.
The three implementations show how application behavior, the cost of change, and the development workflow constrain one another.
Use their evidence to choose an architecture and workflow for a stated future scenario.

## One system, three connected loops

A scaling response changes the application and becomes a development task.
The development workflow determines whether people and agents can implement it safely; the resulting system creates the next set of observations.

{{ import "site/includes/three-connected-loops-figure.html" }}

### The application loop: respond to pressure

Changing demand challenges an architectural assumption.
Measurements locate the first limit, and a response changes capacity, correctness, or recovery behavior.
Trace which signal identified the limit and what new failure mode or operating cost the response introduced.

### The development loop: preserve the ability to change

Each response must be implemented, checked, and maintained.
Contracts, tests, setup, and project knowledge determine how expensive that work becomes.
Identify what made the change difficult and which lesson became an executable check or maintained decision record.

### The agentic loop: turn execution into accepted change

The constrain–generate–validate–revise loop allocates authority, produces a candidate, checks it, and corrects failures.
Its trace exposes attempts, handoffs, and human intervention that the final repository can hide.
Determine whether delegation reduced completion time through acceptance or moved effort into integration and review.

## How the loops affect one another

Consider adding a queue to protect event ingestion during a traffic spike.
The response affects all three loops:

| Perspective                   | Consequence of the queue                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Application loop              | Burst absorption improves, but freshness lag, backlog growth, duplicates, and worker saturation become possible                             |
| Development loop              | The project gains worker code, retry and idempotency rules, new local setup, deployment, tests, and ownership                               |
| Agentic loop                  | Tasks may decompose around producer, consumer, and verification boundaries, but their shared event contract must settle first               |
| Evidence connecting all three | Queue age, end-to-end event visibility, duplicate rate, failure recovery, review effort, and trace history show whether the response worked |

::caption[One scaling response interpreted through all three loops.]
::label[table:queue-three-loop-example]

A faster request path may leave events waiting longer for processing and make the system harder to operate.
Evaluate both the pressure relieved and the new obligations.

> **Sustainability angle**
>
> Which additional computation, storage, bandwidth, and human attention produced useful capacity or learning?
> Count waste displaced into backlog, retries, review, and maintenance as part of the response's cost.

## Apply the map to the three implementations

A establishes the local single-agent baseline, B rebuilds the same required behavior with a comparison-model single agent, and C introduces fleet orchestration.
The common brief and protocol make their differences inspectable.
They do not isolate every cause: the team learns between builds, and architectures, tools, hardware, optional scope, or reporting may differ.
Record those differences when interpreting a result.

### Build the evidence matrix

The matrix belongs in the **final decision** bundle of the [four-part Compare submission](/project/compare/#6-deliverables).
For each dimension, link evidence from implementations A, B, and C—or explicitly state `not measured`—before answering the comparison question.
Use the earlier phase records and the implementation, fleet, and scaling/deployment bundles as sources; the matrix is an index and interpretation of that evidence.

| Evidence dimension             | Collect from each implementation                                                              | Compare across implementations                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Accepted browser behavior      | Acceptance results, escaped defects, and correction evidence                                  | Which differences affected users rather than only repository structure?         |
| Architecture and contracts     | Request trace and key boundary decisions                                                      | Which boundaries made independent change safer or harder?                       |
| Pressure and saturation        | Pressure map and first predicted or observed limit                                            | How did each architecture respond to the same growth scenario?                  |
| Measurement and recovery       | Benchmark, operational signals, and recovery result                                           | What was directly observed, and what remained invisible?                        |
| Development friction           | Cross-team audit and change effort                                                            | Which setup, test, or coupling cost would dominate the next change?             |
| Human–agent workflow           | Execution trace, interventions, and review effort; include handoffs and backlog for the fleet | Which allocation produced accepted work at a sustainable correction cost?       |
| Resource use and externalities | Runtime and model-use evidence                                                                | Did added resources create useful capacity or quality, or merely more activity? |

::caption[Evidence matrix for synthesizing the three implementations through the three feedback loops.]
::label[table:final-evidence-matrix]

Do not turn absent evidence into a favorable score.
If a build was not load-tested, state that its saturation behavior is proposed rather than observed.
If model usage was not captured, do not infer efficiency from elapsed time.
If implementation C produced more branches but required more review and correction, count both the activity and the acceptance cost.

### Separate observation, inference, and proposal

A strong synthesis labels the status of each important claim:

- **Observed:** directly inspected or measured in a repository, running application, audit, test, trace, or recorded workflow.
- **Inferred:** a plausible explanation for an observation, with alternatives and confounding factors kept visible.
- **Proposed:** a future response or target design that was not implemented and validated in the compared build.

For example, “implementation B had the lowest measured p95 under the declared workload” is an observation.
“Its data model caused the difference” is an inference unless the comparison isolates that factor.
“A queue would protect its write path” is a proposal until the new behavior and trade-offs are tested.
This vocabulary lets you reason beyond the available experiment without presenting plans as results.
The three builds are engineering case studies, with design, experience, and tool conditions changing together.
Keep their observations separate from the [bounded paired workflow task](/project/compare/#5-4-compare-one-agent-with-the-fleet), which holds a frozen revision and declared conditions stable for a narrower exploratory contrast.

> **Case — Faster libraries and uncertain attribution**
>
> :citet[lemire2026optimization] reports rebuilding revisions of six libraries and measuring workload-specific runtime gains on one Intel Xeon Gold 6548N machine.
> For the ada URL parser, he reports throughput rising from 0.54 to 1.28 GB/s on a corpus of 100,000 URLs.
> He also states that he cannot determine how much AI contributed to every change and discloses an advisory relationship with one contributing tool provider.
>
> The reported measurements support a claim about those revisions, workloads, and hardware.
> Attributing the gains to AI requires a comparison the account does not provide, and the parser's gain does not establish an application's end-to-end speedup.
> What additional evidence would you need to compare development effort or isolate AI's contribution?
> Keep the useful runtime result and the uncertainty about its cause visible together.

{{ import "exercise:judgment-evidence" }}

## Turn comparison into a decision

Use the [final comparison structure](/project/compare/#7-final-comparison) to turn the matrix into one argument: establish the comparison, explain consequential results, bound the explanation, and choose with a revisit condition.
A useful decision connects a constraint to evidence and an owner:

> For **[goal and constraints]**, choose **[architecture and workflow]** because **[observed result and its limits]**.
> Reject **[alternative]** because **[cost or unsupported assumption]**.
> **[Owner]** accepts the operational and correction obligations; revisit the choice when **[signal or pressure]** changes.

In the queue example, faster HTTP acknowledgment alone would not justify the decision.
The argument must also account for event-visibility delay, recovery behavior, and the effort to maintain and review the new worker path.
Use the same evidence to explain both the benefit and its price.

### Field note — Familiarity is part of effective capability

GPT-family models' communication style is easier for me to follow than Claude's default prose.
That personal fit affects how quickly I can review and correct their work; it is not a general model ranking.
A model's nominal capability can be less useful if I must first translate its explanations into terms I understand.
Changing models therefore changes both the tool and the reviewer's fluency with it, which belongs among the comparison's alternative explanations.

### Final reflection package builder

The builder uses the same four bundles as the specification.
Mark the bundles you have assembled and replace the outline prompts with links to your evidence.
The selections help organize the submission; they do not verify its completeness or the strength of its claims.

{{ import "site/includes/final-reflection-demo.html" }}

## Project artifact

Complete the evidence matrix and final decision narrative within the [Compare submission](/project/compare/#6-deliverables).
Link the other three bundles and earlier phase records, mark missing evidence and remaining risks, and defend the next decision.

## Author perspective — Learn where to look

I do not expect you to become an expert in every topic covered here.
I want the book to help you recognize which questions deserve attention and where to learn more.
An agent can produce a plausible implementation quickly, but you still need to notice the product, architecture, accessibility, security, operational, and maintenance concerns it leaves unresolved.

Like in art, part of the skill is knowing where to look.
Sustainability is easy to ignore if it is absent from your mental map.
Recognizing it as a concern tells you when to ask a better question, gather evidence, or seek expertise.

Developing this book has also exposed gaps in my understanding.
Learning how to question claims, compare evidence, and revise a judgment is a skill I expect to keep practicing as tools and assumptions change.

## Summary

An engineering decision connects the pressure a system can handle with the team's ability to change and operate it.
Defend that decision with the three implementations' evidence, explain its limits, and leave the next team a signal and correction path they can use.
