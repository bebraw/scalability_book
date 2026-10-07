# ADR-037: Connect to the local companion without pairing codes

**Status:** Implemented

**Date:** 2026-10-07

## Context

[ADR-027](ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md) and [ADR-030](ADR-030-distribute-the-learning-companion-with-guided-student-setup.md) require explicit browser pairing and authenticated local sessions.
The implementation uses a printed single-use code before issuing an origin-bound token.
The code belongs to our HTTP boundary; neither the notebook nor the Codex adapter requires it.
Copying it adds a setup step and requires restarting the companion when the browser needs another session.

Kirjolab provides a useful comparison: its local-model route relies on loopback and an exact configured origin without a secret, while its current Codex route requires a separate bearer token.
That precedent does not establish that every local agent client is credential-free.
The decision here concerns the book's own single-user companion, its allowed website and its bounded provider interface.

## Decision

Replace printed-code pairing with an explicit **Connect companion** action in the book.
Starting the local CLI authorizes the configured website, including its scripts, to obtain sessions.
The CLI trusts only `https://scalableweb.dev` by default; local development requires exact `--origin` options.
Repeated origin options replace the default allowlist.
Do not connect simply because a casual reader opens a page or a panel without an existing session.

The HTTP boundary binds only to `127.0.0.1` and validates the literal loopback host and exact request Origin before handling any route or CORS preflight.
Reject absent/null/unconfigured origins.
`POST /connect` requires a bounded JSON object and issues a random origin-bound bearer token valid for twelve hours.
JSON content type prevents simple cross-site form requests; the configured Origin is the session bootstrap authority.
All private notebook and provider routes continue to require that token.
Retain at most 64 sessions, prune expired sessions on connection, and revoke a session and its outstanding agent work on Disconnect.
Reconnection after disconnect, expiry or restart uses the same Connect action without copying a code or restarting a running process.
Keep tokens in browser tab session storage, out of URLs, logs and notebook archives, with uncached session responses.

This is a browser-origin boundary for a single-user local service.
It does not isolate the companion from native local processes that can forge HTTP headers.
Trusting a website means its scripts can acquire sessions while the service runs; possession of a printed secret is no longer a separate prerequisite.
Provider credentials remain local, and model sends, notebook saves and demo changes retain their existing deliberate student actions.
No arbitrary machine execution or broader provider capabilities are introduced.

Remove the code generator, `/pair`, manual-pairing option and corresponding browser inputs entirely.
The instructor is currently the only user and explicitly does not require compatibility with earlier clients.
Prepare package 0.3.0 and browser protocol 2 together because the connection endpoint changes; retain archive and notebook/conversation schemas at version 1.
Existing stored work, setup preferences and dedicated provider profiles remain usable.
The published 0.2.0 package uses the previous connection contract; the updated browser requires the updated companion.
Until 0.3.0 is published and verified, setup and browser instructions use the checkout command instead of an unavailable npm version.

This refines the connection bootstrap requirements in ADR-027 and ADR-030 while retaining their ownership, privacy, distribution and bounded-action decisions.

## Trigger

The instructor requested investigation and removal of a required pairing code, then clarified that compatibility is unnecessary because there is only one current user.

## Consequences

**Positive:**

- Connection and recovery use one visible action without copying secrets or restarting for another code.
- The CLI and browser share one session bootstrap path rather than parallel manual and automatic flows.
- Exact origin, loopback binding, session revocation and provider/browser request ownership remain explicit and testable.

**Negative:**

- Starting the companion grants its configured website the ability to obtain a session, including before a person clicks Connect if that site's scripts request one.
- Older companions and website clients require updating together.
- The new package needs its own release verification and publication before standalone installation instructions can be promoted.

**Neutral:**

- Provider login remains separate from browser connection and does not need to be repeated for retained profiles.
- Local notebook/conversation schemas, portable archives and course access rules remain unchanged.
- Automated checks establish connection behavior, not improved learning or course completion.

## Alternatives considered

### Retain required or optional manual pairing

A code adds a possession check before granting the first session, but retains copying, expiry and restart friction.
An optional compatibility path adds another setup and recovery model that the instructor does not need.

### Launch the website with an invisible capability link

The CLI could open a URL containing a fresh capability, and the website could exchange it automatically.
This preserves a separate possession check, but adds URL-secret handling and launch/tab coordination when the student is already reading the book.
Use configured website trust for the present single-user companion instead.

### Remove session tokens from every route

Origin checks could gate all HTTP requests directly, but the agent/demo broker needs an identifiable initiating browser session, with revocation and isolation from other tabs/origins.
Keep sessions and simplify only their bootstrap.

## Implementation and verification

[The HTTP boundary](../../../scripts/lib/learning-companion-http.ts), [server](../../../scripts/lib/learning-companion-server.ts), [CLI](../../../scripts/lib/learning-cli.ts) and [browser client](../../../site/scripts/learning-client.ts) implement code-free session bootstrap.
[Connection metadata](../../../shared/learning-connection.ts) and [package manifest](../../../packages/learning-companion/package.json) prepare 0.3.0/protocol 2 together.
[Origin/session checks](../../../tests/learning-companion.test.ts), [client recovery checks](../../../tests/learning-client.test.ts), [packed installation checks](../../../scripts/check-learning-companion.ts) and [browser onboarding](../../../tests/e2e/learning-onboarding.spec.ts) use synthetic records.
Local verification on macOS / Node 26.10.0 passed all 153 unit tests, plus focused checks for invalid sessions and bounded connection requests.
The packed 0.3.0 artifact passed clean installation, setup/diagnostics, private-route access and retained work across working directories without a pairing code.
All 24 workspace/demo/peer browser checks and the two packed onboarding checks passed in Chromium and WebKit, including reconnecting after restart and Disconnect without resetting saved work.
Type checking, production build and validation of 77 published HTML files passed.
Npm publication, the macOS/Linux Node 24/26 matrix and a real provider check remain release work; no new real-provider verification is claimed by this connection-only change.

## References

- [Current learning workspace contract](../../learning-workspace.md).
- [Student setup and recovery](../../learning-companion-setup.md).
- [Development and release guidance](../../development.md).
- [Kirjolab companion source](https://github.com/bebraw/kirjolab/blob/main/src/model-companion.ts): inspected during this investigation; source blob `70c3e46707a4b0c4d20c96daecede5d96f4a5f83`.
