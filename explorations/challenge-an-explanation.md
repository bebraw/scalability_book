## Scenario

An explanation and a quiz produced from it can share the same missing assumption.
Use this invented fixture to check a claim independently, extending the [review-evidence exercise](/appendices/evaluating-agentic-workflows/#review-evidence-exercise).
Start with an empty store and one newly created recorder.
All calls are sequential and concern the same authorized workspace and unchanged payload.
Assume `appendEvent` adds a new durable event on every call, without its own duplicate check; stored events survive a worker restart.

```js
function makeRecorder(appendEvent) {
  const completed = new Set();

  return async function record(requestId) {
    if (completed.has(requestId)) return;
    await appendEvent(requestId);
    completed.add(requestId);
  };
}
```

An agent reviews the recorder and makes this claim.

> After a request completes, its identifier is remembered.
> Retrying with the same identifier cannot append another event, including after a worker restart.

## Investigate

1. On your own, predict the stored event count after the first call, a retry on the same recorder and a retry after the worker restarts.
   All three calls use the same request ID.
   Point to the code and explain which state you expect to survive each step.
2. Ask the agent to propose one check for its restart claim.
   If you are working without an agent, consider a proposed test that calls `record("C7")` twice on the same recorder and checks that the store contains one event.
   Before running the check, decide whether it creates a fresh recorder, keeps the same event store and inspects what was appended.
   Could it pass even if a retry after restart produced a duplicate?
   Correct it if needed.
3. Use your check to run or trace the first call and both retries with `C7` as the request ID and one event list shared across recorder instances.
   Check the list after each call.
   Compare the counts with your predictions and rewrite the claim with the narrowest conditions supported by the code.
   Explain what must change to support the original restart guarantee. [Appendix C's state-placement audit](/appendices/advanced-web-boundaries/#stateless-requests-still-depend-on-state) develops the durable effect and retry-key boundary.
4. In a later session, without the agent or explanation, predict what happens if the retry instead reaches a second worker with its own fresh recorder and the same store.
   Record any change in your reasoning in the existing learning notes.
