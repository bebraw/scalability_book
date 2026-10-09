# ADR-043: Activate reading through shared investigation sessions

**Status:** Implemented

**Date:** 2026-10-09

## Context

Public retrieval gives an agent authored material and affordances, but does not connect its explanation to the learner's current reading, prediction or actual demo result.
The companion already owns private conversations and a bounded browser broker.
The next product step needs a complete interaction in the reading flow, rather than another discovery interface.

## Decision

Introduce an authored, versioned investigation contract shared by the website, companion context builder and public graph/MCP export.
Implement one queue-lab activity directly beside the existing simulator: predict, experiment and reflect, with direct explanations available immediately.
Use the coordinator's existing companion client and the existing provider-independent conversation API.
Validate an additive activity turn at the companion boundary and retain it in conversation JSON alongside the student's message.

The browser owns unsent writing, phase, current controls and the captured observation in tab state.
The companion owns submitted conversation history; the authored simulator owns computation and displayed output.
Read actual displayed results rather than reproducing the model in the activity interface.
The student controls the queue; the inline browser adapter services only queue observations during an explicitly started reply.
Notebook preparation uses the existing reviewed handoff, and only Save note creates a notebook record.
Public MCP publishes the same authored contract without state, execution or private access.

Runtime/rendering/persistence adapters depend on the shared activity contract; the contract does not depend on a provider SDK, browser or Worker.
Advertise activity version support additively in companion status; retain protocol 2 and existing record schemas.
Older running companions require a restart from the updated checkout before the inline interface enables sends.

## Trigger

The user clarified that connecting an agent should make the book "alive" and approved a complete queue-lab reading experience.

## Consequences

- A learner can relate a passage to a system, test a prediction and receive an explanation grounded in the browser result without moving into a separate chat panel.
- The same authored phases and observation semantics are available to external agent clients.
- Only explicit sends invoke the provider; activation and control changes select no private notes.
- The inline adapter adds state and presentation logic that need recovery and accessibility checks.
- The existing simulator uses illustrative events and seconds; adapted examples must preserve or explicitly translate units and assumptions.
- Passing interaction checks establishes software behavior, not instructional quality or independent learning.
- External MCP clients still own their rendering and observations; this change is not an MCP Apps widget or a private remote-agent bridge.

## Alternatives considered

### Put all interaction in the existing assistant panel

This reuses presentation but separates the explanation from the active reading and simulator.
The panel remains available for broader questions and reviewed agent control changes.

### Give the public MCP mutable learner sessions

This would combine public content with private browser/identity state and require a separate consent and local-access architecture.
The current companion already owns the required private boundary.

### Generate arbitrary interfaces or replace authored prose

This would expand the rendering and simulator-fidelity contract before validating one useful experience.
The first slice uses the authored queue model and restricted reply renderer, retaining the passage as the reference.

## Implementation and verification

- [Shared contract](../../../shared/reading-investigation.ts), [inline adapter](../../../site/scripts/learning-investigation.ts) and [companion context](../../../scripts/lib/learning-provider-context.ts) implement the interaction boundary.
- [Unit checks](../../../tests/reading-investigation.test.ts) cover source/version/observation validation, unchanged action permissions, selected-context isolation, persistence and public metadata.
- [Browser checks](../../../tests/e2e/reading-investigation.spec.ts) cover the complete loop through an actual companion with a synthetic provider, retained controls/writing, explicit notebook saving, accessibility, compact dark presentation and connection/version failures in Chromium and WebKit.
- On 2026-10-09, an isolated companion with the existing dedicated Codex authentication produced an adapted database-request explanation, then interpreted an actual changed browser snapshot (20 events/s, 1 s, expected 20, observed 10, gap −10) without claiming that the illustration proved overload.
  This is a manual response check on synthetic learning material, not an evaluation of teaching reliability or learner outcomes.
- The 179-test unit suite, site build/types/HTML validation and packed companion installation/runtime check passed; the public retrieval acceptance check retained both protocol eras.
- Current behavior, recovery and manual evaluation limits live in [the workspace guide](../../learning-workspace.md#explore-an-idea-in-the-reading).

## References

- [ADR-027: Companion boundary](ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md)
- [ADR-034: Separate notebook and assistant](ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md)
- [ADR-042: Public MCP](ADR-042-expose-public-learning-material-through-stateless-mcp.md)
