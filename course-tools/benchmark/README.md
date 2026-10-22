# Optional course workload runner

This runner implements the fixed [Work Activity Tracker baseline](https://scalableweb.dev/project/#7-1-shared-baseline-workload).
Students may use it or build another runner under the same protocol.
It schedules and measures logical operations; a small application-specific adapter exercises and validates the real application and persistence path.
The runner contains no reference application or preferred storage schema.

Node.js 24 or newer is required; there are no package dependencies.

```sh
npm test
node cli.mjs /path/to/your-adapter.mjs /path/to/new-report.json course-2026
```

Choose a new output file for each attempt.
The CLI reserves it before starting, checkpoints completed repetitions through atomic file replacement, retains failed and partial runs and exits with code 2 when results are incomplete or checks/resources are missing.
Inspect the report rather than treating an exit code or checklist as a grade.
Preserve reports from unsuccessful attempts and disclose why another attempt was made.

## Fixed procedure

The fixture is eight workspaces with fifty items each: twenty initial, fifteen active and fifteen finished, plus their implied events and four deterministically distributed actors.
`protocol.mjs` defines stable fixture keys and a seeded operation sequence; the adapter maps keys to actual identifiers.
Transition and rejection operations use distinct existing targets so the baseline does not create same-item contention.

| Profile                                   | Operations | Maximum concurrency | Repetitions |
| ----------------------------------------- | ---------: | ------------------: | ----------: |
| Warm-up, excluded from measured summaries |        100 |                   1 |           1 |
| Steady                                    |        500 |                   4 |           3 |
| Higher concurrency                        |        200 |                  16 |           3 |

Reset and reseed before each profile/repetition, including after warm-up.
The mix is 30% feed, 15% summary, 20% creation, 15% start, 10% finish and 10% expected unsupported transitions.
Feed reads divide evenly among unfiltered, workspace-filtered and event-type-filtered reads.
Each worker dispatches its next logical operation only after the previous operation completes or reaches its deadline.
The default limits are ten seconds per operation and five minutes per repetition; library overrides require the instructor's advance agreement for a comparison.
There are no adapter retries in the baseline.

The report retains operations, observations, failures, censored outcomes, queued work, write reconciliation, post-run checks and an application resource proxy.
Valid latencies include expected rejections only after unchanged state and history are checked.
The p95 is the nearest-rank observation at `ceil(0.95*n)` and is conditional on valid completion; a timeout is a lower bound, never a successful completion latency.
Each measured repetition is retained alongside the median result, with read/write/rejection counts separate.
Do not rank hardware, APIs and browser-visible boundaries as if their conditions were controlled.

## Adapter contract

Export `async function createAdapter()` returning these properties and methods.
The operation context contains an `AbortSignal`; pass it to external requests and bounded waits.
An abort does not establish that an application write was cancelled.

| Property or method                                                    | Required responsibility                                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`                                                            | Nonempty strings for `name`, `version`, `implementation`, `commit`, `environment`, `configuration`, `boundary`, `persistence`, `retryPolicy`, `cachePolicy`         |
| `reset(fixture, {signal})`                                            | Quiescently replace only the isolated synthetic fixture; map stable workspace/item keys to real identifiers and record all implied creation/transition events       |
| `execute(operation, {signal})`                                        | Exercise the actual application, validate its response and return `{outcome: "valid"}` or the specifically checked `{outcome: "expected_rejection"}`                |
| `quiesce({signal})`                                                   | Establish that outstanding work cannot contaminate the next reset and return literal `true`; an unproven result stops the suite                                     |
| `reconcile(operations, {signal})`                                     | Return each uncertain write's `id`, outcome `committed`, `not_committed` or `unresolved`, and optional explanatory `detail`                                         |
| `verify({fixture, operations, observations, reconciliation, signal})` | Return `{checks: [{name, ok, detail?}]}` covering actual state, events, filters and summaries, including missing and unexpected changes                             |
| `resource({signal})`                                                  | Observe the application resource proxy, returning `{name, unit, kind, value, boundary}` with kind `cumulative` or `gauge`; unavailable observations remain explicit |

This is a conceptual shape, not a required API design for the application itself:

```js
export async function createAdapter() {
  return {
    metadata: {
      name: "my-application-adapter",
      version: "1",
      implementation: "implementation-A",
      commit: "the-full-submitted-revision",
      environment: "the-actual-runtime-and-hardware",
      configuration: "published-config-version-and-actual-deviations",
      boundary: "request-to-validated-acknowledged-result",
      persistence: "what-the-acknowledgement-establishes",
      retryPolicy: "no-adapter-retries; application-policy-described",
      cachePolicy: "actual-reset-and-cache-policy",
    },
    // Implement the six methods above for your real application.
  };
}
```

`makeFixture()` and `makeOperations()` export the precise payloads for inspection.
Operations have `id` and `kind`, plus relevant `workspaceKey`, `itemKey`, `title`, `actor`, `state` or `eventType`.
Kinds are `feed`, `summary`, `create`, `start`, `finish`, `reject`.
The `reject` case targets an initial item with a direct finish attempt; validate its rejection and unchanged item/events inside the timed logical operation.
Never acknowledge a request as valid merely because it returned HTTP 200.

Quiescence, reconciliation, resource observations and correctness checks occur outside the reported operation-latency window, and have their own bounded observation deadline.
The resource boundary must say whether these observations are included; cumulative counters use after minus before, while gauges report the observed final value and are not labeled as a peak.
Do not substitute the runner's own memory or CPU for the application's resource use.
If verification or reconciliation is unavailable, retain the missing evidence rather than inventing a successful check or a zero.

## Scope

The runner implements the closed-loop baseline only.
A selected arrival-controlled overload or recovery claim still needs the separate open-loop procedure in the common specification.
Custom pressure tooling may reuse this protocol module, but diagnostic runs with different counts or conditions must be labeled and do not replace a required baseline.
The tests use explicitly synthetic adapters to test scheduling and reporting; their observations are not application performance evidence.
