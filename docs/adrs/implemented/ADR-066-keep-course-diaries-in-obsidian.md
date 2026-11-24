# ADR-066: Keep course diaries in student-owned Markdown

**Status:** Implemented

**Date:** 2026-11-24

## Context

The book's Notebook required students to start a local service before writing and to export their work to use another editor.
The course needs nine lecture reflections and a deliberate transfer of selected evidence into the phase portfolio.
Neither task requires a separate web editor or model provider.

## Decision

Recommend a private Obsidian vault.
Publish a guide and a downloadable folder containing five numbered Markdown notes.
Each phase note connects its three lectures to public readings and an optional opening question.
Students can also use the files with an editor of their choice or link selected audio and video evidence.

Keep passage selection in the book.
Copy or download the chosen words with a public link back to the source.
Offer a bundled desktop plugin for choosing a lecture, appending a reviewed highlight, opening the existing TA beside a note and preparing a local portfolio excerpt.
The course site receives only what the student transfers there.

Keep provider setup, model requests and conversation history in the existing companion.
The plugin opens a public reading and puts the student's reviewed draft on the clipboard.
A student chooses whether to paste and send.
The desktop Web viewer can display the reading beside the diary.
Chrome on the companion's computer remains the supported browser for a connection.

Retain a recovery entry point for earlier Notebook data, including complete JSON backup and selected Markdown export.
Retain assistant and peer activities that depend on a prior personal attempt.
This decision supersedes the normal diary editor and its handoffs in ADRs 028, 034, 036, 043 and 044.

## Alternatives and consequences

Keeping both editors in the reading header would leave students to decide where to start writing and which copy to resume.
A native chat client would require a second integration with the companion and the book's live demo tools.
The web handoff keeps one place to configure a provider, inspect the chosen context and send a message.

The student owns backup and synchronization of the vault.
The starter works in restricted mode.
The optional plugin uses the numbered phase paths and lecture headings to place excerpts, so students who reorganize the files can still use ordinary copy and paste.
The class's existing portfolio criteria and staff access boundaries still apply.

The [student guide](../../course-diary.md) covers setup, transfer and recovery.
The [evaluation](../../learning-workspace-evaluation.md#try-obsidian-as-the-diary-editor) covers first use, a return visit and a selective portfolio rehearsal.
