# Formal scalability and reliability models

Use this appendix when a scaling or workflow decision needs more than the introductory Little's Law or Amdahl's Law treatment in the main chapters.
The models below expose two different ways that adding work can reduce success: serial reliability compounds across critical steps, while contention and coordination can flatten or reverse throughput gains.

## Lusser's Law and the reliability chain

A workflow whose accepted result depends on every critical step has the structure of a series system.
If step `i` has reliability `r_i`, the workflow reliability is:

`R_workflow = ∏ r_i`

When `n` independent critical steps have the same reliability `r`, this reduces to `R_workflow = r^n`.
This product rule is commonly called Lusser's Law or the product law for series reliability :citep[tait1995lusser].
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

## Reliability chain lab

The first preset below reproduces the compact idealization with 95% initial correctness, 90% catch-and-repair coverage, and 100 independent critical steps.
Before changing the controls, predict whether the workflow remains above 50% correct completion.
Then select **Caught, not repaired** and compare correct completion with safe stopping.

{{ import "site/includes/lusser-law-demo.html" }}

The model assumes identical independent steps, treats every step as necessary, and assigns the first terminal outcome to the whole run.
Real agent workflows can share model blind spots, context, tools, and upstream state; steps can have different reliabilities; and later validation can sometimes repair earlier failures.
Use the curve as a design probe, not a reliability forecast.
Estimate `C`, `D`, and `K` from repeated accepted outcomes at a declared boundary, and use `∏ r_i` when observed steps differ instead of replacing them with an unsupported average.

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
