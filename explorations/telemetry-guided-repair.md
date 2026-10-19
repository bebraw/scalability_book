## Scenario

**Invented paper fixture; no application or model has been run.**
An event tracker initially displays E1 and E2 in workspace W1.
The actor may use W1; workspace W2 contains E9 and is forbidden.
The contract requires a permitted saved event to survive restart and appear in the active workspace's unfiltered list before the interface reports completion, without a manual reload.
A valid save returns `201`; saving an event with an empty label returns `422` and must neither create nor display that event.
A W2 request must return `403` without event data.

The browser reports that saving E7 succeeded, but the list still shows E1 and E2.
An invented diagnostic packet contains these observations from one save and reload:

```text
action A7: click Save for E7 in workspace W1
request R7: POST /workspaces/W1/events, event E7
response R7: 201, event E7
render after R7: workspace W1, event IDs E1 E2
manual reload: GET /workspaces/W1/events
reload response: 200, event IDs E1 E2 E7
render after reload: workspace W1, event IDs E1 E2 E7
```

No source line, storage-restart observation, or cause is supplied.

## Investigate

1. What does the `201` response establish, and which observations help distinguish failure to store E7 from failure to display it?
   Name one explanation still consistent with the packet and the next check that would challenge it.
2. Specify acceptance cases independently of a proposed fix: permitted saving and visibility before completion, persistence across restart, an empty-label save, and forbidden workspace access.
   State expected event IDs and responses from the contract, rather than deriving them from the implementation's own filter or success message.
3. Plan three repair conditions, all receiving the same source, contract, initial failure report, tools, common checks, and repair budget.
   Give one no additional telemetry, one the raw diagnostic packet, and one a brief derived from that packet.
   Preserve the raw packet and record which observation supports each sentence in the brief.
   Keep additional diagnostic evidence within the assigned condition and record any deviation.
4. For a real comparison, choose a small reproducible failure in a local application you control, using synthetic data and pinned revisions.
   The paper packet above cannot substitute for observations from that application.
   Verify that instrumentation preserves the failure, collect one shared packet, then start each repair in a fresh copy of the uninstrumented failing revision and a fresh agent context.
   Apply the same acceptance checks to every final patch without diagnostic instrumentation; preserve failures and unfinished attempts.
5. Compare accepted behavior, repair time, model use, retries, and active human correction.
   Account separately for instrumentation, telemetry collection, brief preparation, and evidence review, including model calls used to summarize logs.
   With one trial per condition, report a case comparison; use repeated fresh trials and additional failures before claiming a reliable advantage.

You can complete the investigation on paper by describing checks and predicted outcomes.
Label those as predictions, and mark unavailable execution or energy measurements as unmeasured.
Use existing evaluation notes; the activity adds no required project feature or submission.

## Further reading

[TeleGen, version 1](https://arxiv.org/html/2610.04981v1) studies runtime evidence and repair briefs for generated web applications.
[Appendix A](/appendices/evaluating-agentic-workflows/#compare-repair-evidence) explains the comparison controls and limits.
