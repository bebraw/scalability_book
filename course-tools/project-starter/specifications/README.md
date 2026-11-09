# Maintained specifications

[application.md](application.md) is the group's shared account of intended behavior and acceptance.
It references the [common course contract](https://scalableweb.dev/project/) rather than reproducing it.
Add a separate short specification only when it makes consequential work easier to brief and verify.
There is no required file count or documentation quota.

Record the requirement edition assigned to your course run and its stable link or retained snapshot.
The download's `starter-manifest.json` identifies the book revision and contract hashes used when preparing the starter.
For a clean revision, the original files can be read at `https://github.com/bebraw/scalability_book/tree/<contractRevision>/specifications`.
If `contractDirty` is true, that commit alone does not reproduce the preparation context; use the instructor's retained contract edition.
Do not silently replace your assigned edition when the public website changes.

Specifications describe intent; each phase's architecture note describes the running implementation, and the decision log preserves why choices were made.
Link known gaps from the active phase's evidence index so an unimplemented requirement is not mistaken for an optional feature.
Behavior-level clarifications and written lessons may transfer between builds; earlier source, implementation-specific tests and configuration may not.

Before freezing a phase, retain a readable snapshot or export of this folder and the relevant decision history with that phase's evidence.
Identify its revision and link it from the evidence index.
Shared documents can then evolve without changing the record of what A or B used.
