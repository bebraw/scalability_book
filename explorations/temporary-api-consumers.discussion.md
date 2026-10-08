A successful exit establishes that the process completed under its own success rule.
It does not establish that the CSV meets the declared API and export requirements.
For this fixture, a complete authorized export contains E1, E2, and E3 once each in order, and the summary count is three.
A W2 request must return `403` without revealing E4 or E5.

The two-row observation alone does not identify the faulty component.
Inspect the exported IDs and request trace, then compare them with a control that follows each returned cursor until `nextCursor` is `null`.
If the provider supplies the declared second page but the CSV client never requests it, the missing traversal belongs to the client.
If a correct control requests that page and the provider omits E3, the provider violates the fixture's declared contract.
If the CSV has all three events but a validator expects two, the check is wrong.
An unreachable local endpoint is an environment problem until evidence shows otherwise.

A contract that clearly names pagination can be implemented incorrectly; a contract that omits how to finish traversal may instead expose a documentation problem.
Keep usability findings separate from confirmed functional defects.
The control and expected IDs must be derived independently of the generated client's logic, or both can repeat its assumption.
Client-side workspace filtering is also insufficient: the API must reject the unauthorized W2 read at its access boundary.

Keeping the provider fixed makes a consumer failure inspectable.
Allowing the agent to silently patch the provider could make the final demonstration pass while hiding which contract or component changed.
A confirmed provider defect can justify a separate repair after its reproduction is retained.
Likewise, a repaired client should face the same independent checks rather than treating the agent's explanation as acceptance.

Discarding a probe application need not discard its useful evidence.
Retain the minimal failing case, synthetic inputs, revision, and observed requests; turn a confirmed defect into a maintained regression check at the responsible boundary.
One passing probe covers its exercised cases, while broader claims need additional consumers, inputs, and independently adjudicated failures.
