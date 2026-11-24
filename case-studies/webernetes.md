# Webernetes – Comparing generated behavior with a real cluster

Sam Rose wanted readers to be able to restart a container in a browser and see when Kubernetes considered it ready to serve requests.
At ngrok he built [Webernetes](https://github.com/ngrok/webernetes), an experimental TypeScript port that runs a simulated cluster in the reader's browser.
To decide whether a model-generated implementation behaved like a real cluster, Rose needed a [development harness](/concepts/#harness) that could ask both clusters the same question.

## Case at a glance

:ref[table:webernetes-snapshot]{text="The table below"} draws on Rose's [30 June 2026 development retrospective](https://ngrok.com/blog/i-ported-kubernetes-to-the-browser) and the [13 August source snapshot](https://github.com/ngrok/webernetes/tree/ccf55325db72e644ad10df60a29e01c70aa8e2b0), still the head of the public main branch at the November 2026 review.

| Evidence                              | Observation                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Intended use                          | Interactive Kubernetes teaching content in the browser                   |
| Implementation boundary               | A TypeScript reimplementation of a selected Kubernetes subset            |
| Development interval in retrospective | Two months                                                               |
| Behavioral reference                  | The same integration-test operations executed against a real k3s cluster |
| Status in the reviewed snapshot       | Experimental; APIs and supported resources may change                    |

::caption[Scope and behavioral reference in the reviewed Webernetes case.]
::label[table:webernetes-snapshot]

## The product boundary made a partial port useful

Running a short-lived cluster for each reader would have left ngrok with infrastructure to operate for the lifetime of the article.
The browser port implements enough of the API, controllers and network to let a simulated container answer an HTTP probe.
The article supplies its container images as TypeScript classes registered with the simulator.
Readers can investigate a pod's readiness even though the simulator omits resource limits and most network protocols. [Supported resources and limits](https://github.com/ngrok/webernetes/blob/ccf55325db72e644ad10df60a29e01c70aa8e2b0/README.md#whats-implemented-and-what-isnt).

## Generation remained candidate work

Rose reports that language models generated almost all of the code and that he reviewed every line.
When an agent translated a Go table test, it sometimes left out rows.
The remaining cases could all pass while one of the behaviors the upstream authors had explicitly checked went untested.
Rose also had to spot new helpers and simplified data structures that made the code harder to compare.

The [porting rules](https://github.com/ngrok/webernetes/blob/ccf55325db72e644ad10df60a29e01c70aa8e2b0/porting.md) ask contributors to link each ported declaration to a pinned upstream revision and preserve source order and helper boundaries where possible.
With the Go and TypeScript files open side by side, a reviewer can follow the same branches and ask why one of them changed or disappeared.
Counting a port as finished before this review would overstate [accepted-change throughput](/concepts/#throughput).

## Shared tests created a behavioral contrast

Webernetes exposes a client compatible with the operations these tests use from `@kubernetes/client-node`.
The test body can run against a real k3s cluster from Node.js and against the simulated cluster in a browser.
One [shared readiness test](https://github.com/ngrok/webernetes/blob/ccf55325db72e644ad10df60a29e01c70aa8e2b0/src/client/tests/probe.test.ts) creates a pod with an HTTP readiness probe, then reads both the container's ready flag and the pod's Ready condition.
It expects both to be false initially and both to become true once the endpoint responds successfully.
A simulator that marks every running pod ready immediately would get the final state right and still fail this test.

The [repository instructions](https://github.com/ngrok/webernetes/blob/ccf55325db72e644ad10df60a29e01c70aa8e2b0/AGENTS.md) tell contributors to establish the difference before attempting a repair.
A test of Kubernetes-facing behavior should pass on k3s and expose the missing behavior in the port.
This [feedback loop](/concepts/#feedback-loop) checks an observable transition independently of the generated implementation.
Its reach depends on the operations, versions and assertions chosen.
A transition the shared test never observes can still differ.

## The artifact eventually tested its product hypothesis

Rose used Webernetes for the demonstrations in his [August 2026 article about probes](https://ngrok.com/blog/probes).
After a failed liveness probe restarted a container, Kubernetes could run a liveness probe on the replacement before its startup probe had succeeded.
Rose documented the behavior in [an upstream issue](https://github.com/kubernetes/kubernetes/issues/141155).
Kubernetes maintainers [merged a fix in September](https://github.com/kubernetes/kubernetes/pull/141342).
Agreement with a particular cluster version tells you what that version did.
Here, checking the observation against the documented startup rule exposed a defect in the reference itself.

## The harness did not make scale free

Adding Deployment support took Rose beyond the dependencies his first port had covered.
He had agents trace and port the missing dependencies, then used more agents to review their work before his own inspection.
For the week of 15 June he reports about 2.2 billion cached input tokens and US$1,812 in API-equivalent cost across the recorded model use.
He describes his own time as the largest expense.
The token figure includes repeated input, and the dollar estimate uses API rates.
Neither measures how much code a reviewer could accept per hour. [Development retrospective and cost breakdown](https://ngrok.com/blog/i-ported-kubernetes-to-the-browser).

## What Webernetes teaches

Try the same distinction in [Chapter 8's orchestration lab](/chapters/scaling/#orchestration-control-loop-lab), which runs Webernetes.
During the broken release, can the controller restore the requested replica count while users still receive failed responses?
Choose the observation that would answer each half of the question.
To claim the simulated result also holds on Kubernetes, you would need to run those checks against a named cluster version.
