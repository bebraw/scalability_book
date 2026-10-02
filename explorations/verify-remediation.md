## Scenario

Use this invented paper fixture to extend the recovery discussion, keeping findings in the existing pressure-map notes.
Revision `r18` fixes a workspace-isolation defect in `r17`; its acceptance checks pass, and the release job reports success.
Four interchangeable API instances can serve the tracker, and all return `200` from their general health endpoint.
At 14:00, the runtime inventory is complete for this fixture:

| Instance | Running revision | Receives requests | General health |
| -------- | ---------------- | ----------------- | -------------- |
| `api-1`  | `r18`            | Yes               | Pass           |
| `api-2`  | `r18`            | Yes               | Pass           |
| `api-3`  | `r17`            | Yes               | Pass           |
| `api-4`  | `r17`            | Yes               | Pass           |

::caption[Invented runtime inventory after a release job reports success.]
::label[table:remediation-runtime-inventory]

## Investigate

1. State which claims the acceptance checks, release result, health probes, and runtime inventory each support.
   Which known instances remain affected, and what does successful traffic leave unresolved?
2. Propose a workspace-isolation check that allows an authorized request and denies a cross-workspace request.
   Bind the result to the actual instance, running artifact, configuration, and observation time; explain why one successful probe through the load balancer cannot clear every instance.
3. Name the owner of the remaining rollout and declare a completion criterion.
   If you propose a temporary mitigation, state how to verify its effect and which repair obligations remain.
4. Change one assumption: after the current instances are updated, a replacement starts `r17` from an old launch template.
   What additional configuration and replacement check would keep the vulnerable revision from returning?

Measure time from the confirmed finding to verified remediation and track remaining affected instances alongside patch and release progress.
In a real system, an incomplete inventory leaves additional exposure unknown; report the scope and time of the evidence rather than treating a successful release as a system-wide security verdict.
