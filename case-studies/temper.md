# Temper – Making behavior an executable contract

[Chapter 2's deterministic-control example](/chapters/scalable-development/#bound-probabilistic-generation-with-deterministic-controls) lets an agent choose events within an existing state machine.
[Temper](https://github.com/nerdsane/temper) extends the boundary: an agent can author the state machine itself, subject to verification and authorization controls.
Anthropic's July 2026 account of Datadog's approach describes agents producing specifications of states, transitions, preconditions, and safety properties for a deterministic kernel to check and execute.
Data contracts expose the available operations, while a separate authorization engine enforces default-deny policies :citep[segner2026datadogtemper].

`agent-authored specification → verification → runtime enforcement`

## Verification and execution share a specification

This combines agent authoring with model-driven development and formal methods.
The project's architecture draft derives the verification model and runtime transition table from the same specification, reducing the maintenance gap between a separate model and implementation.
The kernel and the translations into those representations remain part of the trusted implementation :citep[nalla2026temper].

## Four complementary checks

Symbolic reasoning checks whether guards can be satisfied and transitions preserve declared invariants.
Model checking explores reachable states within configured bounds.
Deterministic simulation exercises transitions under seeded faults, and property-based testing samples action sequences and reduces failures to smaller counterexamples.
Simulation and randomized testing provide evidence from the runs exercised; they do not exhaust every possible execution :citep[nalla2026temper].

## What verification leaves outside

The draft documents restricted expressions and limitations in proving eventual progress and interactions between entities.
A specification can also omit a required rule while satisfying every property it declares.
The repository includes sandboxed application modules alongside the behavioral contract; checking the lifecycle does not establish the correctness of every module or external effect :citep[nalla2026temper, temper2026runtime].
Hot reload likewise needs a plan for existing state, compatible consumers, changed permissions, and recovery.
The [durable-workflow effect audit](/appendices/durable-workflows/#audit-the-effect-boundary) examines the related boundary between recorded progress and external effects.

## Evaluate the scalability hypothesis

The development-scalability hypothesis is that a constrained, inspectable contract can reduce the work needed to accept repeated changes.
Evaluate that hypothesis through accepted outcomes, human review time, escaped defects, and maintenance cost, including the initial modeling effort and ownership of the kernel.
The company account illustrates an architectural response to the verification bottleneck; it does not establish a general productivity gain.

## Optional exercise — Check what the model leaves out

Use a small transition table and runner, or inspect the model by hand; record which method you used.
This exercise does not require adopting Temper.

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
