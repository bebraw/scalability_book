## Scenario

**Invented local fixture.**
An event-query API serves synthetic records through `GET /events?workspace=<id>` and an optional `cursor` parameter.
Its declared contract returns `items` and `nextCursor`; `null` marks the last page.
Workspace W1 contains events E1, E2, and E3 in that order, and W2 contains E4 and E5.
The actor may read only W1; a W2 request must return `403` without event data.
Pages contain at most two events, so the declared W1 sequence is E1/E2 with a cursor, followed by E3 with `nextCursor: null`.

A generated CSV client reports success but exports two rows.
You have not inspected its requests or output IDs.
A second client is intended to count all authorized events for a workspace summary.
The provider revision and public contract remain fixed while clients are built and investigated.

## Investigate

1. Predict what the CSV client's successful exit and two-row output establish.
   Which evidence would locate a problem in the provider, client, documentation, or acceptance check?
2. Before generating another client, define independent checks for the exported IDs, ordering, duplicates, summary count, and forbidden workspace access.
   Derive expected results from the declared fixture, and specify a known-correct request sequence or reference client as a control.
3. Give the public contract to an agent and ask it to build one temporary CSV or summary client in a disposable local directory.
   Use synthetic records, a fixed time budget, and read-only access to the provider's source; record its configuration and any request or attempt to change the provider.
   You can instead use the paper scenario to design the probe, labelling its outcomes as predictions.
4. Compare the generated client's behavior with the control and independent checks.
   Reduce any failure to a request, input, and observation, then distinguish a provider defect, consumer bug, environment fault, confusing documentation, or incorrect expectation.
   If the evidence cannot distinguish them, retain that uncertainty and name the next check.
5. Identify what can be discarded and what must survive.
   Preserve the contract/provider revision, relevant synthetic inputs, request trace, minimal reproduction, and confirmed regression case before removing temporary scaffolding.

Record useful integration outcomes, failures, investigation time, and attempts within the chosen budget.
Do not count every failed generated client as a provider defect or every passing client as complete contract coverage.
Keep the findings in existing evaluation notes; this activity adds no required project feature or submission.

## Further reading

[Daniel Lemire's ephemeral-testing proposal](https://lemire.me/blog/2026/10/05/ephemeral-testing/) uses disposable downstream applications to probe a maintained component.
[Appendix A](/appendices/evaluating-agentic-workflows/#probe-an-api-with-temporary-clients) connects the method to independent checks and retained regression evidence.
