# Scalable Web learning companion

A private local notebook and optional Codex connection for [scalableweb.dev](https://scalableweb.dev).
Use Node.js 24 or newer.

```sh
npx @scalableweb/companion@0.1.0 setup --notebook
npx @scalableweb/companion@0.1.0 start
```

Pair the printed address and single-use code in **Notebook → Connect**.
Your notebook is stored in your per-user application data directory, independently of the current folder and npm's cache.
Stop the companion with Ctrl+C before backing up or migrating its directory.

For optional Codex access, install the verified Codex CLI 0.154.0 and use a dedicated profile:

```sh
npm install -g @openai/codex@0.154.0
npx @scalableweb/companion@0.1.0 setup --codex
npx @scalableweb/companion@0.1.0 login
npx @scalableweb/companion@0.1.0 start
```

Run `doctor` for local checks, or `doctor --json` for a report you choose whether to share.
Provider diagnostics, credentials, notes, conversations and connection tokens are excluded from that report.
`--directory`, `--port`, repeated `--origin`, `--codex-home` and `--model` allow explicit overrides.
`start --notebook` uses your notes without starting a model.

To migrate an existing repository notebook, stop its companion and provider process, then run:

```sh
npx @scalableweb/companion@0.1.0 migrate --from /absolute/path/to/.local/learning-companion --confirm-stopped
```

Migration retains the source and rejects a nonempty destination.
Updates retain the same notebook location; export a portable backup in the book before updating.
An unsupported newer database schema is rejected without rewriting it.

See [student setup and recovery](https://scalableweb.dev/notebook/setup/) for the full workflow.
Release metadata in `dist/release.json` identifies the source revision, package, protocol and storage schemas.
Model providers process the source and notebook entries you explicitly select; teachers and peers do not gain notebook access through course membership.
