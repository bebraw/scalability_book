# ADR-061: Store Companion credentials in the OS keychain

**Status:** Implemented

**Date:** 2026-11-04

Supersedes the initial credential-storage decision in [ADR-060](ADR-060-support-student-api-keys-and-guided-companion-setup.md).
Its provider transports, conversation rules and guided onboarding decisions remain implemented.

## Context

During preparation of ADR-060, the initial credential design used owner-only files.
This design was not released or used by students.
File permissions limit access, but full notebook directory copies would still carry provider secrets.
Students need saved access across restarts without treating every learning backup as a credential export.
Headless environments may not provide an unlocked desktop credential store.
The companion has no users yet, so this change can establish the storage contract without a legacy credential migration path.

## Decision

Use the operating system's credential store for saved API keys through pinned `@napi-rs/keyring` 2.1.2.
The native dependency is loaded lazily, outside the bundled CLI, so notebook-only, local-model and explicit environment-backed API use do not require a keychain session.
Require Secret Service on Linux; do not silently fall back to a transient kernel keyring or a plaintext file.
Unavailable, locked or denied access produces a recovery instruction.
An explicitly selected `--api-key-env` remains the alternative for headless API use; this is a user choice, not an automatic fallback.

The API credential owner stores only a versioned UUID in `credential-identity.json` beside the notebook.
The OS account identifier combines that identity and the hash of the exact normalized endpoint, under the `dev.scalableweb.companion` service.
This keeps endpoint selection explicit and lets a same-machine directory move retain access without exporting a key.
Copies retaining that identity address the same endpoint entry in the same OS account; login and logout affect that shared entry.
Another computer requires fresh credentials.

Force Codex's own `keyring` storage mode for login, status, app-server use and logout.
Do not implement a second Codex credential format or read its tokens.
Its keyring identity depends on the canonical dedicated profile path, so relocating a profile requires reauthentication even on the same computer.
Notebook and provider-thread records remain independent of authentication.

Directory `migrate` explicitly walks learning records, preserving notebook identities, transcripts, profile threads and nonsecret API credential identity.
It skips externally created Codex `auth.json` files at any depth.
It retains the source, requires stopped writers and rejects occupied destinations as before.
Credentials remain outside portable notebook archives and outside the directory migration output.
Private learning backups retain credential identifiers and records, while saved keys stay in the OS credential store.

`logout` removes the selected API keychain entry or delegates to Codex keyring logout without deleting learning records.
Environment-backed API logout explains how to unset the variable or revoke the external key and does not mutate the parent environment or silently delete a different stored entry.
Local credential removal does not revoke an API key at its provider.

## Trigger

After reviewing API key support, the instructor requested OS keychain storage as the default and authorized the native keyring dependency.

## Consequences

**Positive:**

- Notebook directory copies no longer carry newly saved provider secrets.
- Saved API keys survive supported directory moves on the same machine through a nonsecret identity.
- Headless API use remains available through an explicit environment reference.

**Negative:**

- The package gains a native runtime dependency and platform-specific credential-store prerequisites.
- Locked or unavailable OS stores require user action; Linux sessions need Secret Service for persisted API keys.
- Another computer and relocated Codex profiles require new sign-in.

**Neutral:**

- Provider transport, conversation namespaces, teaching policy and browser connection protocol remain unchanged.
- Keychain storage does not verify API inference access or model reliability.
- Stored learning context and transcripts remain private data even when they contain no provider credentials.

## Alternatives considered

### Retain owner-only credential files

This avoids a native dependency but continues to copy provider secrets with learning records and backups.
The instructor explicitly chose OS storage instead.

### Encrypt a local credential file

An encryption key would need its own protected storage or repeated user entry.
Using the OS store directly avoids a second credential-storage format and key lifecycle.

### Automatically fall back when the OS store fails

Plaintext fallback would silently weaken the chosen storage contract; transient Linux keyutils would lose saved access across reboot.
The explicit environment option makes the alternative visible and leaves its lifecycle with the caller.

### Store API keys only in environment variables

This fits headless execution but requires students to arrange an external secret source for each new terminal.
It remains available without becoming the default interactive onboarding path.

## Implementation and verification

The [API credential owner](../../../scripts/lib/learning-api-credentials.ts) and [lazy keychain adapter](../../../scripts/lib/learning-keychain.ts) own saved-key identity and endpoint binding.
[Codex login](../../../scripts/lib/learning-codex-login.ts) and [provider isolation](../../../scripts/lib/learning-codex.ts) own Codex's keyring-only contract.
[CLI composition](../../../scripts/lib/learning-cli.ts) owns the user-facing commands, while [package assembly](../../../scripts/build-learning-companion.ts) keeps the native module external to the bundle.
[Directory migration](../../../scripts/lib/learning-storage.ts) retains records while filtering Codex credential files recursively.

The full unit suite and type checking passed locally; the opt-in native smoke test ran separately.
The storage checks use synthetic notebook/API records, a stable credential identity, preserved profile threads, nested Codex credential files excluded from the destination and an unchanged source.
The clean package installation passed the CLI lifecycle checks and loaded its installed native binding independently of the checkout's dependencies.
Credential checks cover unavailable stores, exact endpoint binding, saved-key readback, explicit environment use, logout and keyring-only Codex commands without personal credential access.
The separately enabled macOS native check wrote a synthetic value under a fresh service/account, read it in a new process, deleted it and verified absence without accessing existing credentials.

Automatic tests inject synthetic stores or use freshly isolated OS service/account names, never personal credential entries.
Linux and Windows native behavior remain unverified; configured CI checks do not count as completed platform evidence until they run.
Real-provider sign-in/inference and npm publication remain separate verification boundaries.

## References

- [ADR-060: API providers and guided setup](ADR-060-support-student-api-keys-and-guided-companion-setup.md)
- [Student API-key setup and logout](../../learning-companion-setup.md#use-an-api-key)
- [Learning workspace credential contract](../../learning-workspace.md#direct-api-providers-and-onboarding)
- [Development and package verification](../../development.md#learning-companion)
- [Native keyring binding and Linux store selection](https://github.com/Brooooooklyn/keyring-node)
