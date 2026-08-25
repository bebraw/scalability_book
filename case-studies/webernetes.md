# Webernetes – Comparing generated behavior with a real cluster

[Webernetes](https://github.com/ngrok/webernetes) is an experimental TypeScript implementation of a subset of Kubernetes that runs in a browser without backend cluster infrastructure.
Sam Rose built it at ngrok to support durable, interactive explanations of Kubernetes rather than to replace a production cluster.

The project is relevant to scalable development because language models produced most of a large port in a short period, while acceptance still depended on human review, explicit porting rules, and behavioral comparison with a real implementation.
Its strongest lesson is not that generated code can be trusted at scale.
It is that a development harness can turn some compatibility claims into observable contrasts.

The figures below come from Rose's [30 June 2026 retrospective](https://ngrok.com/blog/i-ported-kubernetes-to-the-browser) and describe that snapshot rather than the repository's later state.

## Case at a glance

| Evidence                              | Observation                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Intended use                          | Interactive Kubernetes teaching content in the browser                   |
| Implementation boundary               | A TypeScript reimplementation of a selected Kubernetes subset            |
| Development interval in retrospective | Two months                                                               |
| Repository snapshot in retrospective  | 552 commits across 629 files                                             |
| Generated code reported               | Almost 100,000 lines                                                     |
| Tests reported                        | 204 integration tests and 1,855 unit tests                               |
| Behavioral reference                  | The same integration-test operations executed against a real k3s cluster |
| Current project status                | Experimental; APIs and supported resources may change                    |

Commit, file, line, and test counts describe scale and process shape.
They do not establish correctness, productivity, or production readiness.

## The product boundary made a partial port useful

ngrok wanted visual, interactive Kubernetes content without operating short-lived clusters for every reader.
Webernetes therefore simulates the parts needed by that content in the browser: an API and storage model, nodes, pods, selected controllers, service discovery, and HTTP communication between simulated containers.
Images are TypeScript classes registered with the simulator rather than real images fetched from a container registry.

That is a narrower goal than implementing Kubernetes.
The [README's support inventory](https://github.com/ngrok/webernetes#whats-implemented-and-what-isnt) explicitly lists omitted or simplified behavior, including volumes, affinity, resource management, some service types, and much of the network stack.
The simulator initially focused on the behavior needed to explain probes.
This scope makes the browser artifact useful while preventing its familiar API from becoming an unsupported claim of production equivalence.

## Generation remained candidate work

Rose reports that language models generated almost all of the code and that he reviewed every line.
The retrospective also describes recurring failures: models replaced specific upstream structures with simpler ones, introduced locally convenient helpers that obscured comparison, and omitted cases while porting Go table tests.
Those are especially dangerous in a compatibility project because code can look reasonable while changing the behavior being copied.

The current [porting rules](https://github.com/ngrok/webernetes/blob/main/porting.md) make reviewability an architectural constraint.
Ported declarations carry breadcrumbs to a pinned upstream Kubernetes revision, preserve source order and helper boundaries where possible, use shared compatibility primitives for Go concepts such as channels and clocks, and require intentional deviations to be stated.
The objective is not idiomatic TypeScript in isolation.
It is a mapping a reviewer can compare with the upstream implementation without reconstructing an unrelated local design.

This is a useful distinction between generation speed and accepted-change throughput.
Models expanded the amount of candidate implementation, but the human still had to understand the mapping, notice unjustified deviations, and decide which subset was worth maintaining.

## Shared tests created a behavioral contrast

Webernetes exposes a fake client shaped closely enough to `@kubernetes/client-node` that shared integration tests can execute the same calling code against two systems.
One harness targets a real k3s cluster in Node.js; the other targets Webernetes in a browser.
If an operation passes against k3s and fails against the simulator, the mismatch becomes a concrete porting problem instead of a model's opinion about its own output.

The repository instructions now strengthen that loop.
For Kubernetes-facing behavior, a contributor should first observe the test fail against the simulator and pass against k3s, then implement the fix.
Simulator time also goes through a controllable cluster clock rather than ambient timers, making scheduling behavior easier to pause and test deterministically.

The comparison is stronger than generated tests alone, but it remains bounded.
It establishes agreement for the selected operations, assertions, versions, and environments.
It does not prove complete Kubernetes parity, validate unsupported resources, reveal behavior that both paths or the shared client misunderstand, or make the browser simulator suitable for production workloads.
Ported unit tests are useful regression evidence, but they are less independent because a model can mistranslate or omit both implementation and test behavior.

## The artifact eventually tested its product hypothesis

The initial value proposition was interactive Kubernetes education, not the port itself.
In August 2026, Rose used Webernetes for the interactive demonstrations in [an article about Kubernetes probes](https://ngrok.com/blog/probes).
He reports checking the demonstrations against k3s and finding a Kubernetes bug during that comparison.

That later use matters because it closes a loop the repository metrics cannot.
The simulator became part of published teaching material, exercised the behavior it was originally scoped to explain, and produced a concrete discrepancy worth investigating.
It is still one authored experience rather than evidence that the simulator will fit every educational setting.

## The harness did not make scale free

The retrospective reports a steep increase in model use near the end of the initial build, including more than two billion tokens and about US$1,800 in API-equivalent cost in the final week.
Those figures depend on the models, accounting method, and work attempted, so they should not be generalized into a cost estimate for other ports.

More importantly, generation did not remove the cost of comprehension.
Line-by-line review, upstream comparison, test-harness design, scope decisions, and mismatch investigation remained human work.
The reference implementation reduced uncertainty about selected behaviors; it did not decide which behaviors mattered or who would maintain the result.

## What Webernetes teaches

Webernetes shows a strong pattern for agent-assisted compatibility work:

1. Define the useful subset and name unsupported behavior.
2. Preserve a reviewable mapping to a pinned upstream source.
3. Exercise the same public operations against the candidate and an independent reference.
4. Turn mismatches into failing tests before changing the implementation.
5. Keep human review responsible for scope, fidelity, and the limits of the evidence.

The transferable asset is not the volume of generated code.
It is the development system that makes selected claims inspectable and disagreements reproducible.
