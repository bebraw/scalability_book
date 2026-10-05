# ADR-017: Export an authored concept graph for reader agents

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Concept discovery introduced on 2026-10-01; agent export followed on 2026-10-02.

## Context

Readers encounter related ideas across chapters, appendices, case studies, and project briefs.
They need a way to follow those connections without replacing the book's narrative with a long reference list.
Students also want to investigate the book using their own agents and retrieval tools.

## Decision

Maintain authored definitions, assumptions, examples, mistakes, teaching locations, and explained concept connections in shared registries.
Connections are undirected teaching relationships, not automatically inferred prerequisites, causes, or co-occurrences.
Generate complete and scoped graph views, a text directory, and concept reading panes from those registries.
Keep a navigable static/text fallback alongside the visual graph.

Export the same material as public JSON and Markdown, with an agent guide and `/llms.txt` discovery index.
Use a versioned schema and deterministic authored-content revision.
Export reading locations and resource metadata without private answers, course records, or feedback.
These are read-only HTTP/file resources; the book does not host an MCP server or execute the student's agent.

Require retrieval-based explanations to cite the passages actually read and distinguish authored connections from an agent's inference.
Current resource URLs identify the publication, not immutable archived copies; the content revision alone cannot reproduce every previously served page or image.
Add concept navigation without changing paragraph feedback identity merely because a concept link was inserted.

## Trigger

October history added concept discovery, compacted the directory, and then made the graph directly retrievable by students' agents.

## Consequences

**Positive:**

- One authored model supports reading navigation, diagrams, and agent retrieval.
- Students can use existing tools without adopting a hosted conversation service.

**Negative:**

- Definitions, teaching anchors, and relationship explanations require editorial maintenance.
- Consumers must respect schema changes and cannot assume a content revision is an archived edition.

**Neutral:**

- The graph adds learning navigation rather than new required course deliverables.

## Alternatives considered

### Infer edges from terms appearing on the same page

Co-occurrence does not establish the teaching relationship or its limits, which the authored registries state explicitly.

### Host a dedicated agent or MCP service

Public retrieval resources meet the implemented integration need while leaving execution and client choice with students.

## Implementation and verification

[Concept registries](../../../shared/concepts.ts), [book concepts](../../../shared/book-concepts.ts), [relationships](../../../shared/book-concept-relationships.ts), [reading memberships](../../../shared/concept-pages.ts), [layout](../../../shared/concept-graph.ts), and [exports](../../../scripts/lib/concept-export.ts) implement the model.
[Registry tests](../../../tests/concepts.test.ts), [export tests](../../../tests/concept-export.test.ts), and [browser checks](../../../tests/e2e/concepts.spec.ts) cover integrity, retrieval, anchors, navigation, and fallback.
[chapter-exercises.md](../../chapter-exercises.md#concepts-across-the-book) owns the current interaction contract.

## Historical evidence

- [2026-10-01: add book-wide concept discovery](https://github.com/bebraw/scalability_book/commit/ba57ff796f78c3f4f39f4e7e032fc332f2e16555).
- [2026-10-02: export the knowledge graph for students' agents](https://github.com/bebraw/scalability_book/commit/aa2fe9df578e3db353d6ef77d359fabaad37762d).
- [2026-10-02: add visual learning resources](https://github.com/bebraw/scalability_book/commit/aefe0bcf4a2ff0435dbb5bc880f708ca9af9e476).
