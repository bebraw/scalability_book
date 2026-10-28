# ADR-059: Organize concepts in aligned subcategory rows

**Status:** Implemented

**Date:** 2026-10-28

**Supersedes:** The placement and packing choice in [ADR-058](ADR-058-pack-topic-regions-and-route-connections-separately.md); its four topic memberships and build-only libavoid routing remain in effect.

## Context

The packed four-topic map improved fitted scale and connection routing, but unequal topic rectangles still made the overview feel unbalanced.
At its fitted scale, scattered role-colored markers did not explain what each region contained.
The 45 concepts support useful reading groups within the four main topics without changing their definitions or 109 authored relationships.

## Decision

Use equally sized topic regions in an aligned two-column grid, with Architecture and Development above Operations and Evidence.
Place each topic's named subcategories in rows, with regular concept positions inside each row.
Derive dimensions from membership rather than maintaining individual concept coordinates.
Keep the editorial order stable instead of choosing a new topic order from connection-length scores on each build.

Keep thirteen subcategories in `shared/concept-presentation.ts`, separately from the authored concept graph and independently of the five editorial roles.
Assign each concept exactly one navigation home within its existing main topic.
These homes do not assert an exclusive classification, prerequisite sequence or additional conceptual relationship.
Cross-category ideas retain their authored connections; laws remain alongside the subjects they explain.

Retain build-only libavoid routing, including its endpoint identity, direction, side pins and outer-detour bounds.
Treat topic and subcategory headings as routing obstacles alongside concept cards.
The browser receives ordinary SVG and requires no layout engine.

At the fitted overview, expose readable subcategory names and membership counts where space permits, with role markers and counted cross-topic connections.
Keep the navigation toolbar above the drawing.
Subcategory entry selects its members through the existing graph/list filtering owner and the shareable `subtopic` query parameter.
The parent topic's Subcategory control provides the same navigation on compact screens.
Main-topic zoom, readable concept entry, semantic detail levels and static text/SVG access retain their existing owners.

## Trigger

The author requested another layout iteration focused on balance and legibility, and asked whether the main categories contained useful further categories.

## Consequences

**Positive:**

- Equal topic regions and named rows provide a predictable reading structure.
- The overview communicates useful subject distinctions before individual cards become readable.
- Subcategory entry narrows both graph and list without changing the teaching graph.
- Presentation metadata, filtering, camera state and build-time routing retain separate owners.

**Negative:**

- Editorial subcategory membership requires maintenance as concepts are added or revised.
- A regular reading structure can require longer connections or more crossings than an arrangement optimized only for routing.
- A concept's single navigation home cannot describe every use; the wider authored connections remain necessary.

**Neutral:**

- The 45 concept identities, 109 relationships, four main-topic memberships and public graph schema remain unchanged.
- Subcategories describe navigation rather than a new domain hierarchy.

## Alternatives considered

### Continue optimizing packed topic rectangles

The previous heuristic improved density and connection length but retained unequal boxes and uninformative overview markers.
Local grid comparisons varied topic order and heading clearance; routing metrics informed the choice without replacing the legibility objective.

### Add subgroup labels to the previous scattered layout

Labels alone would not establish coherent spatial membership.
Regular rows make the subcategory's concept cards predictable when the reader zooms in.

### Make subcategories part of the public graph schema

These are editorial navigation homes, while the existing schema describes authored concepts and qualified relationships.
Separate presentation metadata avoids turning a useful browsing arrangement into a stronger semantic claim.

## Implementation and verification

[The presentation registry](../../../shared/concept-presentation.ts), [layout adapter](../../../scripts/lib/concept-layout.ts), [routing adapter](../../../scripts/lib/concept-routing.ts) and [SVG renderer](../../../scripts/lib/concept-html.ts) implement the structure.
[Semantic zoom](../../../site/scripts/concept-semantic-zoom.ts) owns overview entry and detail presentation; [the existing client owner](../../../site/scripts/concepts.ts) owns selection, filters and URL state.
[The reader contract](../../chapter-exercises.md#concepts-across-the-book) documents the resulting behavior.

[Registry checks](../../../tests/concept-presentation.test.ts) verify complete, unique subcategory coverage, matching parent topics and independent editorial roles.
[Geometry checks](../../../tests/concepts.test.ts) cover deterministic placement, bounds, separation, authored route endpoints, obstacles and crossing budgets.
[Subcategory browser checks](../../../tests/e2e/concept-subgroups.spec.ts) cover exact membership, graph/list parity, shared URLs and reset behavior alongside the existing semantic-zoom and navigation suites.
The reviewed graph occupies 2756 by 1700 layout units, fits the 1086 by 558 reference canvas at 32.8% scale, and uses 73.2% of its area for topic regions.
It has 175 proper segment crossings and no routes through unrelated concept interiors; the preceding packed layout had 156 crossings and fitted at about 29%.
The increased crossing count is a deliberate trade-off for aligned regions and coherent reading groups, within the existing 190-crossing budget.
Geometry metrics are engineering comparisons, not evidence from a learner study.
Local verification passed the relevant geometry, registry and standalone export checks, plus the concept navigation, semantic-zoom, subcategory, Graph/List and reference browser checks in their configured Chromium/WebKit projects.
Native multi-touch checks remain Chromium-only.
The production-style build, type/HTML/local-link validation and full published-link check passed; fourteen external URLs returned inconclusive HTTP 403 responses.
This records repository implementation; production publication is separate.
