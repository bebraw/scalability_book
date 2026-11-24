# Temper – Contracts, verification, and bounded autonomy

A scheduler reports that its check is complete.
Does that mean every job that was due actually ran?

In [Chapter 2](/chapters/scalable-development/#bound-probabilistic-generation-with-deterministic-controls), an agent chooses among events that an existing state machine allows.
With [Temper](https://github.com/nerdsane/temper), the agent can also write the machine's states, transitions, and guards.
A data contract lists the actions a client can request.
A separate authorization policy denies a request unless a rule permits it.
Anthropic's July 2026 interview with Datadog describes how the team used Temper to coordinate agents, build tools, and manage the lifecycle of its Helix streaming service :citep[segner2026datadogtemper].

## Verification and execution share a specification

In Temper's Crucible reference application, the scheduler starts in `Idle`.
The `Start` action moves it to `Checking` and calls a WebAssembly module to inspect the schedules.
The runtime sends `CheckComplete` when the module returns success and `CheckFailed` when it returns an error.
Both actions lead back to `Idle` in the [scheduler specification](https://github.com/nerdsane/temper/blob/d7927e6f4586b4968502836442af58aef86454c9/reference-apps/crucible/specs/crucible_scheduler.ioa.toml).

Temper derives both the model it checks and the transition table its runtime uses from the same specification :citep[nalla2026temper].
Their agreement depends on the translators and the kernel interpreting that specification correctly.

## Four complementary checks

A symbolic checker asks whether a guard can ever be satisfied and whether each modeled step preserves the declared invariants.
A model checker explores the states reachable within the configured bounds and can return a sequence of actions that violates a property :citep[nalla2026temper].

Seeded simulation lets a developer replay the conditions that exposed a failure.
Property-based tests try sequences of actions and shrink a failing sequence to make the error easier to locate.
The [verification implementation](https://github.com/nerdsane/temper/blob/d7927e6f4586b4968502836442af58aef86454c9/crates/temper-verify/src/cascade.rs) distinguishes its model simulation from an optional actor simulation that exercises the runtime transition table.

## What verification leaves outside

The scheduler's WebAssembly module queries the active schedules and attempts to trigger each one with an ID.
The authors list checking the time specified by the cron expression as future work.
If one trigger request fails, the module logs the failure, continues with the other schedules, and returns a successful result with a count of how many requests succeeded.
A legal `CheckComplete` therefore tells you that the check cycle finished.
To find out whether a particular job ran on time, you need evidence from the schedule and the job itself.
You can inspect the [module's handling of trigger failures](https://github.com/nerdsane/temper/blob/d7927e6f4586b4968502836442af58aef86454c9/reference-apps/crucible/wasm/crucible_scheduler_check/src/lib.rs) alongside the behavioral contract :citep[temper2026runtime].

The same distinction matters when a worker records progress after calling another service.
The [durable-workflow effect audit](/appendices/durable-workflows/#audit-the-effect-boundary) follows the records each side can use if the worker stops between those two actions.

## Start with system invariants and replayable failures

Datadog's Helix streaming service promises that a consumer can still read an acknowledged message after a change of leader.
In a simulation, Helix truncated a log segment in memory before syncing the change to disk.
An injected disk fault then left the segment unwritten, with no retry.
The team switched to copy-on-write.
A test with the same seed could exercise the fix under the same sequence of faults :citep[keles2026harnessfirst].

A different gap appeared when Datadog ran its redis-rust implementation beside Redis 8.4 in staging.
Both clusters received the same workload and showed similar latency, but redis-rust initially used eight times as much memory.
After three changes, the team reported an 87% reduction from redis-rust's own starting footprint.
The shadow comparison exposed a cost the earlier microbenchmark had overlooked :citep[keles2026harnessfirst].

## Bound live optimization with an independent reference

Datadog's Unicron service offered BitsEvolve an existing reference for one narrower task.
Could it make a tenant's aggregation function faster while preserving its outputs?
The aggregation server kept some incoming messages out of the optimization process.
It rejected any candidate WebAssembly module whose output hash on those messages differed from the baseline.
Verus checked properties of the codec libraries the module called, including bounds on decoding.
When the server switched modules, in-flight batches finished on the old version :citep[chen2026autonomousoptimization].

For one trial the team scaled down Unicron and measured a workload that summed CPU usage for 100 services over 30-second intervals.
Throughput rose from 7,106 to 26,263 messages per second.
The team attributed a 44.5% gain to fixing the tenant and query configuration at compile time, then a further 155% to evolving the specialized code.
The two steps together account for the roughly 270% increase on that workload :citep[chen2026autonomousoptimization].

## Evaluate the scalability hypothesis

Does a shared executable specification make the _next_ change cheaper to accept?
Compare successive changes against the same user-visible requirement.
Record the time spent modeling it, maintaining the checks, reviewing the result, and correcting errors that get through.
For a change to how the scheduler selects due jobs, include a job due now and one due tomorrow, then check which one actually ran.
The cost of maintaining that assurance across changes remains open.

## Optional exercise — Check what the model leaves out

Use a small transition table and runner, or inspect the model by hand.
Record which method you used.

1. Model the event tracker's `open → in_progress → done` lifecycle from the [common specification](/project/#3-required-behavior).
   Record the required activity events and the rule that a rejected transition changes neither state nor successful-event history.
2. Add an `open → done` transition.
   Predict which explicit lifecycle property should reject it, then check the model and retain the violating trace.
3. Restore the legal transitions but leave event recording outside the model.
   Construct a trace that reaches `in_progress` without a `work_started` event.
   Explain why lifecycle checks alone can pass while the application violates its requirement.
4. Consider a crash after the state write but before the event write.
   Identify where atomic persistence must be enforced and what additional execution evidence would test it.

Report the property checked, the exploration bound where applicable, the counterexample, and the obligation left outside the model.
