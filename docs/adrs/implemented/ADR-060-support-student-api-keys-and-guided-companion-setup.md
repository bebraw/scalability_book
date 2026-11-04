# ADR-060: Support student API keys and guided Companion setup

**Status:** Implemented

**Date:** 2026-11-04

The initial credential-storage decision was **Superseded by [ADR-061](ADR-061-store-companion-credentials-in-the-os-keychain.md)** before release or student use.
The provider transports, conversation rules and guided onboarding decisions remain implemented.

## Context

The learning companion supported a dedicated Codex profile and credential-free loopback model servers.
Students also bring API keys from OpenAI, Anthropic, Gemini and OpenRouter.
The existing login wrapper exposed only Codex's browser flow, and the browser's assistant setup command assumed an authenticated Codex profile.
Setup did not retain custom website origins or ports, so a later start could lose the connection configuration.

## Decision

Add named API providers through their documented Chat Completions interfaces, including the official Anthropic and Gemini compatibility endpoints, plus an explicitly configured compatible HTTPS endpoint.
Keep this transport separate from the credential-free loopback adapter introduced by [ADR-038](../implemented/ADR-038-support-local-models-through-the-learning-companion.md).
This extends that record's deferred authenticated-endpoint contract without broadening its local URL rules.
Share conversation budgeting, replay, cancellation and validated demo-tool calls through one chat-provider engine.
Local transcripts retain their existing schema and identities; API transcripts have their own schema-1 database and namespace.
Endpoint, provider, model and tool configuration bind a conversation to its backend before any old context is sent.
Changing a key at the same backend does not invalidate its conversations.

The terminal owns provider setup and credentials.
It offers notebook-only use, Codex with ChatGPT or an OpenAI API key, direct API access and local models.
The website offers a copyable guided setup command, a start command and the existing explicit connection action.
Setup retains website origins and the companion port, and leaves existing notes and unsent browser drafts intact.
Choosing a different provider does not send a notebook or conversation automatically.

Keys enter through a hidden terminal prompt or stdin, never command-line argument values or browser fields.
An explicitly selected environment variable supplies a direct API key, or the credential owner retrieves its saved value for the exact normalized endpoint.
ADR-061 owns OS storage for saved API keys and Codex authentication, replacing the initial file-based design before release.
Settings, browser metadata, diagnostics and portable notebook archives contain no credentials.
Private directory backups include credential identifiers and raw conversation databases; saved keys remain in the OS credential store.
HTTPS API requests reject redirects and suppress provider diagnostics that could expose credentials or private context.

Setup and diagnosis read the model catalog; they never generate a paid reply.
A catalog can be public, so a listed model is not proof of authenticated inference or reliable tool use.
The student's first deliberate question checks actual access and can incur provider charges.
Direct APIs and local models default to discussion-only; native tools remain an explicit capability choice with runtime validation and student approval.

## Trigger

The instructor requested support for students using API keys and an easy onboarding path, then selected OpenAI, Anthropic, Gemini and OpenRouter as the required providers.

## Consequences

**Positive:**

- Students can use the four named API providers without installing Codex.
- Codex users can explicitly choose API-key or ChatGPT authentication.
- One setup path preserves connection settings and gives students the next runnable command.
- Shared conversation rules preserve context and approval behavior across providers.

**Negative:**

- Provider compatibility and model capabilities require continued verification.
- Private backups include raw conversation context and must remain private.
- Compatibility APIs do not expose every provider-specific feature.

**Neutral:**

- Public reading, notebook-only use, course records and the public MCP remain provider-independent.
- Preparing this feature does not publish the pending companion package or establish live-provider verification.

## Alternatives considered

### Route every API key through Codex

This would preserve a single harness but require Codex for students who only want model discussion and constrain supported services to its provider configuration.
The companion intentionally prohibits arbitrary configuration in its dedicated Codex profile.

### Add credentials and remote URLs to the local-model adapter

This would weaken a documented loopback-only contract and make a saved local conversation's destination ambiguous.
Separate transport owners make the boundary explicit while sharing the conversation engine.

### Implement each provider's full native API

Native APIs expose more provider-specific features.
The required text discussion and bounded function calls can use documented compatibility interfaces without a provider SDK dependency.
Provider differences still require explicit adaptation and tests; compatibility is not a blanket model-support claim.

## Implementation and verification

The repository implements the named adapters in [learning-api.ts](../../../scripts/lib/learning-api.ts) and [learning-api-model.ts](../../../scripts/lib/learning-api-model.ts), with a shared [chat engine](../../../scripts/lib/learning-chat.ts) and separate [history namespaces](../../../scripts/lib/learning-chat-history.ts).
[Credential storage](../../../scripts/lib/learning-api-credentials.ts), [Codex login](../../../scripts/lib/learning-codex-login.ts), [guided API setup](../../../scripts/lib/learning-api-setup.ts) and [CLI composition](../../../scripts/lib/learning-cli.ts) retain the boundaries described above.
The [connection panel](../../../site/scripts/learning-pane.ts) offers the same provider choices without collecting secrets.

The provider and onboarding implementation passed all 237 unit tests and ten Chromium/WebKit browser checks before the OS-keychain revision; ADR-061 records verification for the final credential design.
The clean-install package check passed on macOS with Node 26.13.0, including ten CLI journeys against the installed artifact.
The initial package-check failure expected the previous diagnostics shape; its assertion now also verifies the explicitly configured port.
CLI checks include a real hidden terminal prompt, restart with retained origin/port, explicit key-source switching, and HTTP conversation replay using synthetic providers.
Provider checks cover all four request dialects, sanitized failures, different-backend rejection, output budgets, migrations and Gemini's opaque thought-signature replay.
The shared engine also prevents previously omitted turns from reappearing during later tool rounds.
[The package checker](../../../scripts/check-learning-companion.ts) runs the CLI contracts against the installed tarball; [CI](../../../.github/workflows/learning-companion.yml) includes the new suites in its macOS/Linux and Node 24/26 matrix.

These are software/protocol checks using synthetic credentials and responses.
Actual paid-provider access, teaching quality, each model's native-tool reliability, the remote release matrix and npm publication remain separate verification boundaries.
Anthropic's preset currently expects a workspace-scoped API key; keys requiring an additional workspace-selection header are outside this configuration.
The prepared package remains 0.3.0 and has not been published by this change.
The owning guides are [the setup guide](../../learning-companion-setup.md), [the learning workspace](../../learning-workspace.md) and [development](../../development.md).

## References

- [OpenAI authentication](https://learn.chatgpt.com/docs/auth)
- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Anthropic OpenAI SDK compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk)
- [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [OpenRouter API overview](https://openrouter.ai/docs/api_reference/overview)
