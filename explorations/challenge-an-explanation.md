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

Suppose an agent explains this code as follows; the explanation deliberately overstates its guarantee:

> After a request completes, its identifier is remembered.
> Retrying with the same identifier cannot append another event, including after a worker restart.

## Investigate

1. Before running anything or requesting help, predict the stored event count after each step: call `record("C7")`, repeat it on the same recorder, then restart the worker and retry `C7` with a newly created recorder sharing the existing store.
   Identify which part of the explanation each prediction tests.
2. Trace the state on paper or run a small check against the fixture.
   A test list that survives recreating the recorder can stand in for the store; this simulates losing process-local state, rather than reproducing a complete production restart.
   Check the stored events independently of the explanation or any generated quiz answer key.
3. Identify the lifetime and owner of each relevant state value, then rewrite the claim with the narrowest conditions supported by the code.
   Explain what must change to support the original restart guarantee; [Appendix C's state-placement audit](/appendices/advanced-web-boundaries/#stateless-requests-still-depend-on-state) develops the durable effect and retry-key boundary.
4. In a later session, without the agent or explanation, predict what happens if the retry instead reaches a second worker with its own fresh recorder and the same store.
   Record any change in your reasoning in the existing learning notes.
