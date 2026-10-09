# ADR-044: Generalize the learning loop through a contextual cockpit

**Status:** Implemented

**Date:** 2026-10-09

## Context

The queue slice in ADR-043 connects initial thinking, an actual browser result, adapted explanation and reflection in the reading flow.
Other readings, demos, exercises, practice and private/peer context still have different entry points and continuity.
The user asked to generalize that experience into a learning cockpit with a tight reflection loop throughout the system.

## Decision

Use one contextual Learning cockpit with source-scoped predict, check/experiment and reflect phases, plus a student-written next independent check.
Expose it across learner pages, with a shortcut beside every authored demo and deliberate handoffs from checked exercises, independent practice, selected notebook notes and selected peer contributions.
Retain the Notebook and Assistant as independent record/discussion owners; cockpit actions reopen them through the existing coordinator and reviewed handoff contracts.
Do not automatically transfer notes, peer records or course records when activating the cockpit.
The student course page has the same private manual loop; staff administration remains outside this interface.

Generalize the shared authored activity contract into a general learning loop and one activity per existing demo, reusing the catalog's prompts and assumptions.
Preserve the queue's version-1 numeric snapshot; other demos use bounded named-control/text snapshots from the same actual DOM observation bridge.
Student-reported evidence stays distinct from browser snapshots.
Public graph/MCP retrieval publishes the same authored contracts, with no learner state or tool permissions.
The companion validates additive turns and retains them in existing conversation JSON; no notebook or protocol migration is needed.

Keep up to 30 source/context-scoped unfinished loops in bounded tab storage with a recent-learning trail.
Switching focus preserves writing and conversation identity rather than clearing a single page-wide draft.
Restore queue inputs only; other demos can have action histories, so retain dated snapshots without replaying actions or claiming restored results.
Saving a reflection uses the Notebook's existing replacement confirmation and explicit Save note action, with related selected notes and assistance provenance.
No cockpit action changes concept judgments, course submissions or grades.

## Trigger

The user asked to generalize the living-book experience to all parts of the system and named a learning cockpit with a tight loop and reflection as the desired direction.

## Consequences

- Readers can move from a passage, a prediction, a checked answer or a selected note into one familiar loop and return to unfinished thinking.
- Demo and reading checks keep their different evidence authorities visible while sharing the same reflection and next-step structure.
- Authored domain contracts remain independent of browser UI, storage adapters and model providers.
- Additional context entries remain explicit and reviewable before model sends or durable saves.
- The tab trail is convenience state, not a durable learning record, inferred profile or mastery model.
- Public external clients receive equivalent affordances but still own observations, presentation and learner-state consent.
- Interaction checks establish software behavior; independent learning and instructional quality require separate learner evaluation.

## Alternatives considered

### Add a separate inline assistant for each demo

This would repeat connection, conversation and reflection state in many places and make cross-reading continuity harder to inspect.
The cockpit uses one mounted surface and independent drafts behind it.

### Merge Notebook and Assistant into one large panel

This would obscure the existing separation between private writing, selected assistant context and reviewed persistence.
The cockpit coordinates their entry points while retaining those owners.

### Automatically collect all course, peer and notebook context

This would widen access and conflate private reflection with academic records.
The cockpit uses explicit handoffs and manual course-page writing without a new private-data API.

## Implementation and verification

- Shared activity/source/version and bounded observation validation live in [reading-investigation.ts](../../../shared/reading-investigation.ts).
- [Cockpit composition](../../../site/scripts/learning-cockpit.ts), [loop presentation](../../../site/scripts/learning-investigation.ts) and [tab/observation adapter](../../../site/scripts/learning-investigation-session.ts) separate responsibilities.
- [Unit checks](../../../tests/reading-investigation.test.ts) cover all authored demo contracts, source restrictions, reported evidence/next checks and provider/public retrieval agreement.
- [Browser checks](../../../tests/e2e/learning-cockpit.spec.ts) exercise every demo's actual snapshot and reading/reflection/revisit, checked exercise, selected-note and lazy-entry journeys using isolated synthetic records and a real companion with a synthetic model.
- Existing [queue checks](../../../tests/e2e/reading-investigation.spec.ts) retain discussion/native-tool, control restoration, reviewed saving and connection-recovery coverage.
- A manual two-turn Codex check used an isolated synthetic notebook and a hypothetical deployment inventory.
  The reply distinguished reported image versions, an unknown deployment and untested behavior, then proposed a concrete independent check.
  Reflection and next-check writing remained editable beside the reply.
  This checks a real provider path, not general teaching effectiveness.
- Verification passed: 182 unit tests, 44 affected Chromium/WebKit journeys, types and 73-page build/HTML validation, clean packed-companion installation/runtime checks, and local public MCP acceptance through both protocol eras.
- Current operating limits and verification commands live in [the workspace guide](../../learning-workspace.md#explore-an-idea-in-the-reading) and [development guide](../../development.md#learning-cockpit-and-reading-investigations).

## References

- [ADR-043: First queue slice](ADR-043-activate-reading-through-shared-investigation-sessions.md)
- [ADR-034: Notebook/Assistant ownership](ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md)
- [ADR-042: Stateless public learning MCP](ADR-042-expose-public-learning-material-through-stateless-mcp.md)
