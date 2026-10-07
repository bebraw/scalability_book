# Scalable Web learning companion

A private local notebook and optional Codex connection for [scalableweb.dev](https://scalableweb.dev).
Use Node.js 24 or newer.

```sh
npx @scalableweb/companion@0.2.0 setup --notebook
npx @scalableweb/companion@0.2.0 start
```

Pair the printed address and single-use code in **Notebook → Connect**.
Your notebook is stored in your per-user application data directory, independently of the current folder and npm's cache.
Stop the companion with Ctrl+C before backing up or migrating its directory.

For optional Codex access, install the verified Codex CLI 0.154.0 and use a dedicated profile:

```sh
npm install -g @openai/codex@0.154.0
npx @scalableweb/companion@0.2.0 setup --codex
npx @scalableweb/companion@0.2.0 login
npx @scalableweb/companion@0.2.0 start
```

Run `doctor` for local checks, or `doctor --json` for a report you choose whether to share.
Provider diagnostics, credentials, notes, conversations and connection tokens are excluded from that report.
`--directory`, `--port`, repeated `--origin`, `--codex-home` and `--model` allow explicit overrides.
`start --notebook` uses your notes without starting a model.

To migrate an existing repository notebook, stop its companion and provider process, then run:

```sh
npx @scalableweb/companion@0.2.0 migrate --from /absolute/path/to/.local/learning-companion --confirm-stopped
```

Migration retains the source and rejects a nonempty destination.
Updates retain the same notebook location; export a portable backup in the book before updating.
An unsupported newer database schema is rejected without rewriting it.

See [student setup and recovery](https://scalableweb.dev/notebook/setup/) for the full workflow.
Release metadata in `dist/release.json` identifies the source revision, package, protocol and storage schemas.
Model providers process the source and notebook entries you explicitly select; teachers and peers do not gain notebook access through course membership.

## Version 0.2.0

The optional teaching assistant uses the shared study policy version 1: patient, curious, precise and constructive, with direct explanations available on request and source-grounded support for the current difficulty.
New exchanges retain the requested help, explicitly supplied note identities, teaching policy and Codex CLI version.
The book shows the source and selected notes before sending, and offers reviewed takeaways without saving a transcript as a reflection automatically.
Older replies retain their original history rather than being assigned the current policy.

Notebook storage, browser protocol, notebook/archive and conversation schemas remain version 1.
Codex CLI 0.154.0 remains the verified provider version; no new sign-in is needed when retaining the same dedicated profile.
Before updating from 0.1.0, export a notebook backup, stop the companion and privately copy its data directory and any external provider profile.
Start 0.2.0 with the same directory options and pair again; existing setup preferences and work remain available.
A website update alone does not update an installed companion.
