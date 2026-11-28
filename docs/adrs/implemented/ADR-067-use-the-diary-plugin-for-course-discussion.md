# ADR-067: Use the diary plugin for course discussion

**Status:** Implemented

**Date:** 2026-11-26

## Context

Students can record a prediction in Obsidian before discussing a reading.
The book previously asked them to install the standalone companion and save an attempt there to participate in peer inquiry.
Students using the TA also had to start a separate process.
Copying a new starter vault during the course would put student-edited lecture notes in the update path.

## Decision

Let students use a saved diary selection as their initial thinking for a reading.
The plugin checks the selection against the saved file and lets the student review the destination.
The handoff identifies the public book source and carries two opaque identifiers.
The book asks for an enrolled course account and an explicit reveal before declaring the attempt to the existing course API.
The vault owns the selected words.
Students compose any contribution for classmates separately.

Keep the assistant interface, demo controls and reviewed message in the book.
For a desktop TA session, let the plugin run the local companion using Obsidian’s runtime and one supported API provider.
Reuse the companion’s origin checks, teaching policy and conversation store.
Keep the provider credential in Obsidian’s secret storage.
Students using another editor or another provider can start the standalone companion.

Distribute the same versioned plugin in the starter and in a plugin-only download.
Students update the program files in their existing vault.
The plugin does not install dependencies or replace their lecture notes during an update.

## Consequences

A student can join a class discussion without configuring an AI provider.
A student using the bundled TA still needs a supported desktop runtime and their own provider access.
A second native chat interface would duplicate the book’s passage context, discussion history controls and interactive demo integration.
Keeping the standalone companion available preserves other providers and access to existing local histories.

This extends [ADR-066](ADR-066-keep-course-diaries-in-obsidian.md) for students using desktop Obsidian. [Student workflow](../../course-diary.md) · [Peer inquiry contract](../../learning-workspace.md#peer-inquiry-contract)
