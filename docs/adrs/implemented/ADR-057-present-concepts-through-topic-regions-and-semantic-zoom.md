# ADR-057: Present concepts through topic regions and semantic zoom

**Status:** Implemented

**Date:** 2026-10-27

**Layout and topic refinement:** [ADR-058](ADR-058-pack-topic-regions-and-route-connections-separately.md) replaces the initial global compound layout and dissolves the Models topic; editorial roles and semantic zoom remain in effect.

## Context

The whole-book concept map has 45 concepts and 109 authored connections.
Its custom spring layout avoided overlapping labels but left 487 proper crossings between nonincident straight edges and opened at a cropped readable scale.
The existing five topics have 60 internal connections and 49 between groups, supporting spatial clustering while retaining cross-topic navigation.
Concepts also differ in editorial role; grouping by topic alone does not explain the difference between a broad idea, property, mechanism, practice, and model.

## Decision

Generate a deterministic compound layout and orthogonal routes using the existing ELK dependency during the site build.
Keep the engine out of browser bundles and retain the SVG and complete text fallback.
Orient geometric cross-group layout inputs by topic order to reduce cycle-breaking detours, then restore original source/target route order and arrow direction.
Layout does not establish a prerequisite sequence or a new causal claim.

Maintain an explicit editorial role registry separately from authored concept definitions and public export semantics.
Use theme-aware color, a text legend and node role labels; topic membership and role remain independent dimensions.

Fit the complete graph initially and adapt its representation to camera scale.
An overview shows labeled regions, role-colored markers and counted cross-group connections.
Closer views reveal concept cards and the full relationship network; counts can always be resolved into the existing authored relationships.
Support explicit full detail, keyboard entry, group navigation, scoped reading/search views and existing Graph/List camera continuity.
Keep coordinates stable during geometric zoom; compact group entry may explicitly switch to the existing group-only layout when an entire region would remain unreadable.

## Trigger

The author requested research into fewer edge intersections, topic containers and abstraction differences, then authorized trying role colors, clustering and semantic zoom.

## Consequences

**Positive:**

- Topic structure and concept roles are visible without changing the teaching graph.
- Counted overviews stay useful when fitting every individual label would make it too small.
- Build-time routing avoids unrelated concept boxes and reduces crossings.
- Static resources and public retrieval retain the complete material.

**Negative:**

- Editorial roles require maintenance as concepts change.
- Compound layouts can be large; deliberate navigation and detail adaptation remain necessary.
- Crossings remain, and crossing counts alone do not establish teaching usability.

**Neutral:**

- No additional layout dependency or public graph schema version is introduced.
- Group counts summarize membership and actual relationships rather than new group-level propositions.

## Alternatives considered

### Continue tuning the custom force layout

It would retain a small dependency surface but require maintaining obstacle routing, compound constraints and crossing reduction in project-specific code.

### Use a browser compound force engine such as fCoSE

It supports general compound graphs and constraints, but would introduce another engine and integration surface.
The existing ELK dependency provides build-time regions, routing and reproducible SVG suitable for this reference.

### Convert broad concepts into edges or enforce one abstraction tree

Relational ideas still have independent definitions and learning value.
Properties, mechanisms, practices and explanatory models do not form one universal subtype hierarchy.
Independent presentation roles and level of detail preserve those distinctions.

## Implementation and verification

[The layout adapter](../../../scripts/lib/concept-layout.ts), [role registry](../../../shared/concept-presentation.ts), [SVG renderer](../../../scripts/lib/concept-html.ts), [camera](../../../site/scripts/concept-viewport.ts) and [semantic zoom owner](../../../site/scripts/concept-semantic-zoom.ts) implement the decision.
[The current interaction contract](../../chapter-exercises.md#concepts-across-the-book) owns reader behavior.

[Unit checks](../../../tests/concepts.test.ts) independently verify region separation, all route endpoints, zero crossings through unrelated node interiors and fewer than 250 proper segment crossings for the reviewed graph, compared with the original 487.
Counts exclude shared endpoints and collinear overlaps; they are an engineering baseline, not a user study.
The reviewed layout has 236 such crossings and no routes through unrelated concept interiors.
[Standalone export checks](../../../tests/concept-visuals.test.ts) exercise complete XML SVG resources.
[Browser checks](../../../tests/e2e/concept-semantic-zoom.spec.ts) cover fitted summaries, stable positions, role cues, detail override, keyboard access, compact group navigation and theme accessibility, alongside the existing concept navigation suites.

This records the repository implementation; publication is a separate operation.
Local verification passed 197 unit tests and 41 Chromium/WebKit browser checks; the two native multi-touch checks run only in Chromium.
The production-style build, type/HTML/local-link validation and published-link check passed, with fourteen external URLs returning inconclusive HTTP 403 responses.
WebKit's SVG intersection observer reported zero-sized bounds after a camera change despite correct rendered card geometry; keyboard entry is checked against the actual card, map clipping bounds and browser viewport, with a rendered Safari reproduction inspected.

## References

- [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)
- [Concept maps and organizing general/specific ideas](https://cmap.ihmc.us/publications/researchpapers/theoryunderlyingconceptmaps.pdf)
- [Pad++ semantic zoom](https://www.cs.umd.edu/projects/hcil/pad%2B%2B/papers/jvlc-96-pad/zoom-4.html)
