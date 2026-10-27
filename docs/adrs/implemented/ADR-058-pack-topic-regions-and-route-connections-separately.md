# ADR-058: Pack topic regions and route connections separately

**Status:** Implemented

**Date:** 2026-10-27

## Context

[ADR-057](ADR-057-present-concepts-through-topic-regions-and-semantic-zoom.md) made the map easier to navigate using topic regions, independent editorial roles and semantic zoom.
The Models topic mixed concept kind with subject matter, while the explanatory-model color already expressed that kind.
Its four members fit existing subject regions: Little's Law and Lusser's Law in Evidence, Amdahl's Law in Development, and Contention in Operations.
This yields four topics, with 64 internal and 45 cross-topic connections; concept identities and all 109 authored relationships remain intact.

A global layered layout of mutually connected regions still leaves a long or uneven drawing.
The earlier five-region map measured 236 proper crossings and fitted a 1086 by 558 reference canvas at roughly 14% scale.
Simply removing Models produced 207 crossings and roughly 17% scale, with topic rectangles occupying about 38% of the canvas.
Research and local comparisons showed that packing and connector routing address different objectives and benefit from separate stages.

## Decision

Use ELK Layered independently within each topic, including explicit spacing between disconnected components.
Pack the resulting rectangles with ELK Rectangle Packing, using its maximum-scale objective and a landscape aspect preference.
Compare bounded candidate orders: all 24 permutations for the current four topics, at most 24 if the taxonomy grows.
Rank candidates using predicted Manhattan lengths of cross-topic connections divided by squared fitted scale.
This is a project-specific selection heuristic; it does not claim a global optimum.

Route the authored edges after packing with pinned `libavoid-js` 0.4.5.
Its orthogonal visibility graph and A\* search account for route length and bends, with crossing and shared-path penalties.
Node rectangles and region headings are obstacles; equivalent connection pins on four sides allow endpoint selection without changing the authored source or target.
Include any outer routing detours in fitted bounds.
Keep the router, its WebAssembly binary and ELK out of browser bundles and public assets.
The build adapter frees temporary geometry and destroys each router, which owns its shapes, pins and connectors.

Keep the existing SVG, text fallback, role colors and semantic zoom.
Topic membership changes update the public graph's authored-content revision through the existing export process; no schema change is needed.

## Trigger

The author approved dissolving Models and requested research-backed graph fitting for a more aesthetic four-region layout.

## Consequences

**Positive:**

- Subject regions use substantially more of the fitted canvas.
- Laws stay close to the concepts they explain, with their independent model role preserved.
- Automatic attachment and obstacle routing shorten connections without maintaining node coordinates.
- The reviewed graph has fewer crossings and retains every authored endpoint.

**Negative:**

- Builds add a pinned WebAssembly routing dependency and several seconds of computation.
- Packing and routing optimize heuristics rather than proving a globally optimal drawing.
- Topic size and connection changes can require rechecking visual balance and the regression budgets.

**Neutral:**

- Browser controls, account state, course records and concept identities retain their existing owners.
- Public exports retain schema version 2 and include the revised subject memberships.

## Alternatives considered

### Rename Models to Laws

Contention is a phenomenon, and Goodhart's Law already belongs to Evidence.
An explanatory role does not need another subject region.

### Tune direction or wrap the global layered graph

Sixteen local comparisons varied direction, topic order and wrapping.
Wrapping improved aspect ratio but roughly doubled total connector length in the representative layouts.
It did not provide the compactness and shorter routes obtained by separate packing and routing.

### Add a browser organic or compound force engine

An organic engine may give a different visual character, but it would still need careful rectangle/heading avoidance and could destabilize positions while the reader navigates.
Build-only packing and routing preserve the accepted SVG and semantic-zoom boundaries.

## Implementation and verification

[The layout owner](../../../scripts/lib/concept-layout.ts), [routing owner](../../../scripts/lib/concept-routing.ts) and [authored registries](../../../shared/concepts.ts) implement this change.
[The current reader contract](../../chapter-exercises.md#concepts-across-the-book) describes topic membership, presentation roles and interaction behavior.

The reviewed packed graph is 2613 by 1934 layout units, with approximately 64% topic occupancy and 29% fitted scale on the reference desktop canvas.
It has 156 proper segment crossings and no routes through unrelated concept interiors.
Crossing counts exclude shared endpoints and collinear overlaps and remain engineering comparisons, not evidence from a learner study.

[Geometry checks](../../../tests/concepts.test.ts) independently verify memberships, all endpoints, obstacle avoidance, determinism, aspect ratio, occupancy and fitted-scale/crossing budgets.
[Browser checks](../../../tests/e2e/concept-semantic-zoom.spec.ts) retain the accepted overview, full detail, keyboard, compact and theme interactions; existing concept checks cover filtering, panes, static fallback and public exports.
This records local repository implementation; publication is separate.

## References

- [ELK Rectangle Packing](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-rectpacking.html)
- [ELK packing algorithm and maximum-scale objective](https://eclipse.dev/elk/blog/posts/2022/22-08-31-rectpacking.html)
- [Wybrow, Marriott and Stuckey: Orthogonal Connector Routing](https://people.eng.unimelb.edu.au/pstuckey/papers/gd09.pdf)
- [libavoid connection pins and automatic endpoint choice](https://www.adaptagrams.org/documentation/classAvoid_1_1ShapeConnectionPin.html)
