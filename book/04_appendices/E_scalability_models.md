# Formal scalability and reliability models

Use this appendix when a scaling or workflow decision needs more than the introductory [Little's Law](/chapters/benchmarking/#check-measurements-against-a-model) or [Amdahl's Law](/chapters/agent-fleets/#amdahl-s-law-and-the-sequential-bottleneck) treatment in the main chapters.
The models below expose two different ways that adding work can reduce success: serial [reliability](/concepts/#reliability) compounds across critical steps, while [contention](/concepts/#contention) and coordination can flatten or reverse throughput gains.

## Author perspective — Use models to see the limits

I do not use these laws directly in my everyday development work.
I include them because they have educational value: they make the limits behind scalability visible.

Parallelization cannot remove work that must remain sequential.
Additional workers still share resources and require coordination.
Longer workflows accumulate more opportunities for failure.
These constraints exist regardless of how quickly code can be generated or how much infrastructure can be provisioned.

The purpose of the models and labs is therefore not formula memorization or precise prediction.
It is to make relationships concrete enough to challenge claims such as “more agents will make the work proportionally faster” or “adding capacity will continue increasing throughput.”

Use the equations to recognize the shape of a limit and identify what should be measured.
Real decisions still require evidence from the actual system.

## Choose a model

Use the question to select a model, then check that its assumptions fit the observation.
:ref[table:scalability-laws]{text="The table below"} collects the relationships introduced across the main chapters and this appendix.

| Law                                                      | Exact relationship                                                                                                                | Main assumptions                                                                                 | Useful when                                                                                         | Cannot establish                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Little's Law](/concepts/#little-law) :citep[little1961proof]                     | `L = λW`, where `L` is average work in progress, `λ` is average throughput or arrival rate, and `W` is average time in the system | Stable long-run averages, one consistent system boundary, and conserved work                     | Relating queue or review backlog, throughput, and elapsed time                                      | The cause of delay, tail latency, or stability from one snapshot            |
| [Amdahl's Law](/concepts/#amdahl-law) :citep[amdahl1967validity]                  | `S(N) = 1 / ((1 - p) + p/N)`, where `p` is the parallelizable fraction and `N` is the parallel capacity                           | Fixed workload and fractions, with no added parallel overhead in the bound                       | Bounding speedup for request paths, batch work, deployments, or agent workflows                     | Contention, coordination cost, load growth, or the actual parallel fraction |
| Lusser's Law :citep[tait1995lusser]                      | `R_system = ∏ R_i` for independent components that must all succeed in a series system                                            | Every named step is critical and step failures are independent                                   | Checking whether a request, deployment, or agent workflow can meet an end-to-end reliability target | Correlated failures, recovery behavior, or omitted dependency paths         |
| Universal Scalability Law :citep[gunther2008scalability] | `C(N) = N / (1 + α(N - 1) + βN(N - 1))`, where `α` models contention and `β` coordination or coherency cost                       | One workload and configuration, with parameters fitted to representative throughput measurements | Describing capacity that rises, flattens, and then falls as concurrency grows                       | The causal mechanism or safe extrapolation beyond the measured range        |

::caption[Formal scalability models, their assumptions, and suitable application boundaries.]
::label[table:scalability-laws]

For each use, identify the variables, calculation, observation boundary, and what remains unexplained.
The [Benchmarking chapter](/chapters/benchmarking/#check-measurements-against-a-model) works through Little's Law, and the [Agent Fleets chapter](/chapters/agent-fleets/#amdahl-s-law-and-the-sequential-bottleneck) introduces Amdahl's bound.

## Lusser's Law and the reliability chain

A workflow whose accepted result depends on every critical step has the structure of a series system.
If every step is critical and the step outcomes are independent, with step `i` having reliability `r_i`, the workflow reliability is:

`R_workflow = ∏ r_i`

When `n` independent critical steps have the same reliability `r`, this reduces to `R_workflow = r^n`.
This product rule is commonly called [Lusser's Law](/concepts/#lusser-law) or the product law for series reliability :citep[tait1995lusser].
It explains why a small per-step failure probability can dominate a long workflow even when no individual step looks especially risky.

Redundancy within one step has a different topology.
[Jason Gorman's compact formulation](https://bsky.app/profile/jasongorman.bsky.social/post/3mtxx4cdiqc26) uses `C` for the probability that the first prediction is correct and `P` for the conditional probability that an incorrect prediction is caught.
For completion reliability, catching the prediction must also restore the step to a correct state; under that stronger interpretation:

`r = C + (1 - C)P = 1 - (1 - C)(1 - P)`

The complement expression describes the prediction-or-recovery paths within one step; Lusser's Law describes the product across serial steps.
The distinction matters because detection alone does not complete a workflow.
If `D` is the probability that an incorrect prediction is detected and `K` is the probability of successful repair after detection, then the completion reliability of one step is:

`r = C + (1 - C)DK`

An incorrect result that is detected but not repaired can stop safely, while an undetected result can propagate.
Safety, liveness, and correctness should therefore be reported separately rather than collapsed into one success percentage.

### Estimate from all eligible attempts

Fix the [task population and step boundary](/concepts/#measurement-boundary) before collecting outcomes.
Independently adjudicate initial and final correctness for every eligible attempt, including rejected, stopped, and failed attempts; the workflow's own acceptance label cannot reveal its missed errors.
For the one-step model:

- `C = initially correct attempts / all eligible attempts`;
- `D = detected initial errors / all initial errors`;
- `K = successfully repaired initial errors / detected initial errors`.

Consider 100 fully adjudicated attempts: 80 start correct, 20 start incorrect, 15 of those errors are detected, and 12 of the detected errors are repaired.
Then `C = 80/100 = 0.8`, `D = 15/20 = 0.75`, and `K = 12/15 = 0.8`.
Substitution gives `r = 0.8 + 0.2 × 0.75 × 0.8 = 0.92`: 92 correct completions, three detected but unrepaired errors, and five undetected errors.
The three unrepaired attempts count as safe stops only if the workflow actually prevents their effects from propagating.

This decomposition assumes initially correct results remain correct and that an initial error reaches correctness only through the modeled detection-and-repair path.
If review can damage a correct result or a later stage can repair an undetected error, record those transitions and revise the model.
With no initial errors, `D` is unestimated; with no detected errors, `K` is unestimated.
Do not replace a zero-denominator rate with 100% or multiply an undefined estimate: report the observed terminal counts directly.
Missing adjudication leaves unknown outcomes, which must remain visible and limit any reliability estimate.

### Test the independence assumption

Suppose two critical steps are each correct on 90 of 100 runs, but the same ten runs fail both steps because they share a faulty input.
Their marginal reliabilities are both 0.9, yet both succeed on 90 runs, not the 81 predicted by multiplying the marginals.
The general relationship is `P(S₁ and S₂) = P(S₁) × P(S₂ | S₁)`; here the second factor is 1, not 0.9.
If instead the two ten-run failure sets are disjoint, both steps succeed on 80 runs, below the independent prediction of 81.
Other dependence structures give different results, so the product of marginal rates is not a safe upper or lower bound without further assumptions.
Measure joint outcomes or conditional rates when steps share causes of failure.

## Reliability chain lab

The first preset below reproduces the compact idealization with 95% initial correctness, 90% catch-and-repair coverage, and 100 independent critical steps.
Before changing the controls, predict whether the workflow remains above 50% correct completion.
Then select **Caught, not repaired** and compare correct completion with safe stopping.

{{ import "site/includes/lusser-law-demo.html" }}

The model assumes identical independent steps, treats every step as necessary, and assigns the first terminal outcome to the whole run.
Real agent workflows can share model blind spots, context, tools, and upstream state; steps can have different reliabilities; and later validation can sometimes repair earlier failures.
Use the curve as a design probe, not a reliability forecast.
Estimate `C`, `D`, and `K` from all eligible attempts using the denominators above.
Use `∏ r_i` for differing step reliabilities only when the independence assumption is defensible; replacing them with one average does not resolve dependence.

## Contention curve lab

Amdahl's Law models a fixed sequential share but does not describe the way shared resources and coordination can become more expensive as concurrency grows.
The Universal Scalability Law models relative capacity as:

`C(N) = N / (1 + α(N - 1) + βN(N - 1))`

Here `α` represents contention or serialization cost and `β` represents coherency or coordination cost.
The curve can rise, flatten, and eventually fall: adding workers may reduce total capacity when coordination grows faster than useful work.

{{ import "site/includes/usl-demo.html" }}

First set both costs to zero and inspect the ideal linear curve.
Then add contention, add coherency cost, and find the first concurrency level after the modeled peak.
The parameters should ultimately be fitted from measured throughput at several concurrency levels; arbitrary sliders illustrate the model's shape but do not predict a real deployment.

> **Case study: limiting concurrency to protect throughput**
>
> [PlanetScale describes a Vitess and MySQL production incident](https://planetscale.com/blog/concurrency-vs-throughput-vitess-mysql) in which a long-running transaction, immediate application retries, and a transaction pool raised to about 10,000 allowed more than 10,000 requests to accumulate inside the storage engine.
> Snapshot reads grew more expensive as the long transaction preserved an increasingly long version history; more requests exceeded their latency limit and retried.
> Work in progress rose while completed query throughput fell.
> Increasing the pool had silenced pool-full errors but weakened the boundary protecting the database.
>
> The team later reduced the pool to roughly 1,000 and changed full-pool behavior so requests could wait for a slot within a bounded timeout.
> During a later burst on another shard, demand peaked around 25,000 slot requests per second while reported query throughput stayed near 60,000 per second and fewer than 200 statements executed inside MySQL at once.
> If those figures describe the same stable boundary and observation window, Little's Law gives an upper estimate of `W < 200 / 60,000` seconds, or about 3.3 milliseconds.
> The important separation is between clients seeking work, work admitted to the constrained resource, and useful work completed.
>
> A queue does not create capacity; it moves waiting to a boundary where it can be observed and limited.
> This report changed pool size and waiting behavior together, the later burst did not reproduce the original incident, and no tail-latency distribution was reported.
> It also uses the Universal Scalability Law as an explanatory lens rather than fitting its parameters from measurements.
> Treat the numbers as evidence for this workload, not as a universal pool target.
> The durable lesson is that admission control can raise throughput when in-flight requests slow one another down, provided waiting is bounded, overload remains visible, and the underlying long transaction and retry behavior are still addressed.

## Treat the model as a challenge to the design

A formula is useful only when its boundary, variables, assumptions, and evidence are explicit.
Use measured inputs where the model requires them, keep recovery and correlated failures visible, and do not extrapolate beyond the observed workload merely because the fitted curve is convenient.
