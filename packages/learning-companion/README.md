# Scalable Web learning companion

A private local notebook and optional Codex or local-model connection for [scalableweb.dev](https://scalableweb.dev).
Use Node.js 24 or newer.
Version 0.3.0 is prepared in the repository and has not yet been published.

```sh
npx @scalableweb/companion@0.3.0 setup --notebook
npx @scalableweb/companion@0.3.0 start
```

In **Notebook → Connect**, enter the printed address if needed and choose **Connect companion**.
No pairing code is needed.
The only default trusted website is `https://scalableweb.dev`; use `--origin http://127.0.0.1:3000` for local development.
Starting the companion authorizes its configured website to create browser sessions.
Your notebook is stored in your per-user application data directory, independently of the current folder and npm's cache.
Stop the companion with Ctrl+C before backing up or migrating its directory.

For optional Codex access, install the verified Codex CLI 0.154.0 and use a dedicated profile:

```sh
npm install -g @openai/codex@0.154.0
npx @scalableweb/companion@0.3.0 setup --codex
npx @scalableweb/companion@0.3.0 login
npx @scalableweb/companion@0.3.0 start
```

For local discussion, start LM Studio's server, load your chosen language model, and use its exact identifier:

```sh
npx @scalableweb/companion@0.3.0 setup --local --local-url http://127.0.0.1:1234/v1 --model google/gemma-4-12b-qat
npx @scalableweb/companion@0.3.0 start
```

No Codex installation or sign-in is required.
The default local mode has no live tools; use a saved demo result or Chapter guide for actual observations.
`--local-context <tokens>` supplies the loaded context when the runner cannot report it.
`--local-tools native` is an explicit choice for a separately verified function-calling setup; Gemma's current setup is verified for discussion only.
Private transcripts retain exact selected context across restarts in schema-1 `local-provider.sqlite`, outside portable notebook archives.
A changed endpoint/model/tool mode requires a new conversation; context omission notices and failed selections preserve visible work.
LM Studio is the first verified runner; Ollama, llama.cpp and Windows remain unverified.

Run `doctor` for local checks, or `doctor --json` for a report you choose whether to share.
Provider diagnostics, credentials, notes, conversations and connection tokens are excluded from that report.
`--directory`, `--port`, repeated `--origin`, `--codex-home`, `--model` and the local options above allow explicit overrides.
`start --notebook` uses your notes without starting a model.

To migrate an existing repository notebook, stop its companion and provider process, then run:

```sh
npx @scalableweb/companion@0.3.0 migrate --from /absolute/path/to/.local/learning-companion --confirm-stopped
```

Migration retains the source and rejects a nonempty destination.
Updates retain the same notebook location; export a portable backup in the book before updating.
An unsupported newer database schema is rejected without rewriting it.

See [student setup and recovery](https://scalableweb.dev/notebook/setup/) for the full workflow.
Release metadata in `dist/release.json` identifies the source revision, package, protocol and storage schemas.
Model providers process the source and notebook entries you explicitly select; teachers and peers do not gain notebook access through course membership.

## Version 0.3.0

Connection uses an automatically issued, origin-bound session token with browser protocol 2.
The CLI and browser no longer generate or request pairing codes; reconnect after disconnect, expiry or restart by choosing **Connect companion** again.
Exact website-origin and literal loopback-host checks precede every route, and private routes still require a session.
Sessions expire after twelve hours and Disconnect revokes them.
This browser trust boundary does not isolate the service from other native processes on your computer.

The optional teaching assistant retains the shared study policy version 1 and its recorded source/help/note/provider context.
Notebook storage, portable archive and conversation schemas remain version 1; local-model wire history has its own schema 1.
Codex CLI 0.154.0 remains the verified provider version; no new sign-in is needed when retaining the same dedicated profile.
Before updating, export a notebook backup, stop the companion and privately copy its data directory and any external provider profile.
Start 0.3.0 with the same directory/profile options and connect again; existing setup preferences and work remain available.
A website update alone does not update an installed companion.
