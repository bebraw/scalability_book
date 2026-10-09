# ADR-042: Expose public learning material through stateless MCP

**Status:** Implemented

**Date:** 2026-10-09

## Context

External agents can retrieve the Markdown guide and concept graph, but must implement their own searches, passage extraction and next-action discovery.
The local companion already owns a different boundary: private selected context and bounded browser interaction.
Combining these boundaries would make public book retrieval depend on accounts or a running companion.

## Decision

Publish a public, read-only Streamable HTTP MCP endpoint at `/mcp`, using the official SDK's per-request server factory and stateless legacy compatibility.
Share search and lookup behavior between the local server and production Worker.
Read the deployment's existing graph and activity resources; derive a prose index from already-rendered published readings.
Keep Markdown access available and document both routes at `/agents/`.

Return source context and concrete retrieval or experiment affordances together: stable IDs, citation URLs, assumptions, relationship qualifications, authored prompts and explicit capability limits.
Preserve separate worked reasoning and prediction-first guidance.
Do not infer live demo state or private learner context from public metadata.
MCP has no account access, conversation storage, model invocation or arbitrary fetch tool.

## Trigger

The user approved a small public MCP implementation after discussing the limitations of a guide-only integration, and asked whether OpenAI's October 7 announcement supports the external-agent vision.

## Consequences

**Positive:**

- External clients can discover tools and retrieve bounded, cited material without reimplementing the graph contract.
- Existing authored registries and rendered publication remain the content authority.
- Public retrieval is usable without login or a running companion.
- Structured results support client-created visual explanations while retaining text-only access.

**Negative:**

- MCP adds protocol dependencies, request handling and compatibility checks.
- Lexical search needs evaluation on real student questions; matching words does not establish semantic relevance.
- External clients decide whether to follow the pacing guidance, render visuals or expose observations.

**Neutral:**

- Private learning records and browser actions remain with the companion.
- The public server is not automatically a published ChatGPT plugin or an embedded interactive app.
- Publication and graph revisions identify current content, not archived copies.

## Alternatives considered

### Keep only Markdown and graph files

This remains a supported fallback, but leaves tool discovery, bounded search and passage extraction to every external client.

### Expose the companion and learner records through the hosted MCP endpoint

This could add current-task context, but would require a separate identity, consent and local-access design.
It is unnecessary for public retrieval and would cross the companion's selected-context boundary.

### Ship an embedded MCP Apps interface immediately

An authored widget could provide predictable controls and explicit observation events in supporting clients.
The current step instead supplies reusable data and guidance to existing client presentation tools.
Widget design and learner evaluation remain separate work; demo metadata cannot establish simulator equivalence.

## Implementation and verification

- [Protocol adapter](../../../worker/public-mcp.ts), [shared retrieval](../../../shared/book-retrieval.ts) and [rendered-prose export](../../../scripts/lib/book-passages.ts) implement the public boundary.
- [The resource contract](../../agent-learning-resources.md#public-mcp-server) describes tools, origins, request/result bounds and excluded material.
- [Official-client tests](../../../tests/public-mcp.test.ts) exercise current and legacy protocols, three learning tasks, prompt/resource discovery, separate discussions, invalid inputs and private-path rejection.
- Verification covers the full unit suite, types, HTML validation, Worker bundling and the [three-task acceptance check](../../../scripts/check-public-mcp.ts) through both the local development server and local Worker.
  The acceptance check can also target production after deployment.
  Passing protocol checks does not establish model teaching quality, ChatGPT UI rendering or learner outcomes.

## OpenAI announcement assessment

The [GPT-6 announcement](https://openai.com/index/gpt-6-for-everyone/) describes ChatGPT composing interactive explanations and adapting interfaces to a question.
That matches the intended predict → interact → explain workflow.
It explicitly concerns Chat; Work and Codex are unchanged by that release.
It does not document an API for its native component library.

The supported integration to use now is ordinary [remote MCP retrieval](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), with useful structured results and text fallback.
The current [ChatGPT MCP quickstart](https://developers.openai.com/plugins/quickstart) connects a personal plugin in Work; do not promise that this exposes a tool to Chat's Intelligent UI.
[MCP Apps UI](https://developers.openai.com/plugins/build/app-quickstart) is an optional follow-up when a controlled interactive view and observation bridge justify it.
No provider/model migration or OpenAI-only UI dependency is introduced here.

## References

- [ADR-017: Authored graph](ADR-017-export-an-authored-concept-graph-for-reader-agents.md)
- [ADR-027: Local companion](ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md)
- [MCP SDK web-standard serving](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html)
