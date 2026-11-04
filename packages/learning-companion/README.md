# Scalable Web learning companion

A private local notebook and optional teaching assistant for [scalableweb.dev](https://scalableweb.dev).
Choose Codex, a direct API key or a local model; notebook-only use needs no model account.
Use Node.js 24 or 26.

## Start from the checkout

Version 0.3.0 is prepared in the repository and has not yet been published.
The published 0.2.0 package uses the previous pairing contract and cannot connect to the updated website.
For now, install and run the checkout:

```sh
git clone https://github.com/bebraw/scalability_book.git
cd scalability_book
npm ci
npm run companion -- setup
npm run companion -- start
```

Guided setup offers notebook-only use, Codex with ChatGPT sign-in, Codex with an OpenAI API key, direct API keys, and a local model in LM Studio.
It guides authentication and model selection, saves your origin/port preferences and prints the exact start command.
API keys are entered at a hidden terminal prompt, never in the website.
Saved keys use the OS credential store; locked or unavailable storage causes an actionable error, with no plaintext fallback.
Setup and `doctor` do not generate a paid reply; the first message you deliberately send checks generation access and may incur your provider's charges.

Keep the companion running and choose **Notebook → Connect → Connect companion** in the book.
Enter the printed address if you chose a different port.
No pairing code is needed.
The website also offers copyable setup and start commands that preserve its exact origin and any connected notebook's directory/port.

Before setup, the only trusted website is `https://scalableweb.dev`.
Use `setup --origin http://127.0.0.1:3000` for local development; repeat `--origin` to trust multiple exact websites.
Starting the companion authorizes those websites to create browser sessions and access the local notebook.
The checkout uses `.local/learning-companion/`; the standalone package uses a stable per-user application directory independently of your working folder and npm's cache.
Use `--directory` to keep an existing notebook at another location.
Ctrl+C stops the companion without removing your work.

## Choose a provider

**Direct API keys** need no Codex installation or ChatGPT subscription.
Choose OpenAI, Anthropic (Claude), Gemini, OpenRouter or a compatible HTTPS service in guided setup, enter the provider's key, and select a text model by number or exact identifier.
Setup lists the first twenty catalog entries; an exact identifier can select another listed model.
Custom services must support an OpenAI-compatible model list and Chat Completions API.
For Anthropic, use a workspace-scoped key; Companion has no custom workspace-header setting.
Public catalogs can be read without a valid key, so successful listing alone does not establish authenticated generation access.

For scripts, use a key already supplied through your environment:

```sh
npm run companion -- setup --api --api-provider openai --model '<exact-model-id>' --api-key-env OPENAI_API_KEY
npm run companion -- start
```

The named `--api-provider` choices are `openai`, `anthropic`, `gemini` and `openrouter`.
Use `--api-provider compatible --api-url https://your-provider.example/v1` for another service.
Replace example model/URL values with your provider's values.
The environment variable must remain available when starting or diagnosing the companion; only its name enters settings.
Alternatively, pipe the key into `setup --api --with-api-key` with the provider/model options, or into `login --with-api-key` after setup, to save it in the OS credential store.
When using a saved key, interactive API `login` offers a hidden replacement-key prompt.
An environment-backed setup keeps reading its configured variable; piping a key into `login --with-api-key` explicitly switches to a saved key for later starts.
Saved API keys are bound to the configured endpoint and a stable notebook credential identity; only the nonsecret `credential-identity.json` is kept beside your records.
Keys never appear in browser status, diagnostic reports, settings or portable notebook archives.
The pinned `@napi-rs/keyring` dependency provides native credential storage; Linux saved API keys require a Secret Service session.
For a headless terminal or unavailable keychain, explicitly choose `--api-key-env`; there is no plaintext or transient-keyring fallback.

API mode defaults to discussion-only, a 16,384-token context budget and a 4,096-token output allowance.
Adjust these with `--api-context` and `--api-output` within your model's limits; reasoning models may need more output room to produce visible text.
`--api-tools native` is an explicit choice for a model/provider whose function calling you have verified.
Transport and conversation checks use synthetic responses; real replies and native-tool reliability across these providers are not yet verified for this release.

**Codex** requires the separately installed [Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli), verified at version 0.154.0:

```sh
npm install -g @openai/codex@0.154.0
codex --version
```

The version command should print `codex-cli 0.154.0`.
Run guided setup and select ChatGPT sign-in or an OpenAI API key; it authenticates Companion's dedicated profile using Codex's OS keyring store.
For explicit ChatGPT setup, use `setup --codex`, then `login`.
For explicit API key setup, use `setup --codex`, then pipe the key:

```sh
printenv OPENAI_API_KEY | npm run companion -- login --with-api-key
```

Setting that variable alone does not authenticate the dedicated profile.
See [OpenAI's authentication guide](https://learn.chatgpt.com/docs/auth) for the sign-in methods and API billing.

**Local models** need no Codex installation or sign-in.
Start LM Studio's server, load a model, then choose local setup or run:

```sh
npm run companion -- setup --local --local-url http://127.0.0.1:1234/v1 --model google/gemma-4-12b-qat
npm run companion -- start
```

Replace the verified Gemma example with your loaded model's exact identifier.
Local mode defaults to discussion-only; use a saved demo result or Chapter guide for actual observations.
`--local-context <tokens>` supplies the loaded context when the runner cannot report it.
`--local-tools native` requires a separately verified function-calling setup; the exposed Gemma configuration is verified for discussion only.
LM Studio is the first verified runner; Ollama, llama.cpp and Windows remain unverified.

## Check and retain your work

Stop the companion and run `npm run companion -- doctor` for checks, or add `--json` for a diagnostic report you choose whether to share.
The report identifies the saved provider choice, storage, origin/port and prerequisite results without credentials, notes, conversations, remote provider diagnostics or connection tokens.
Codex is optional in notebook-only, direct API and local-model modes.
Use `doctor --codex` to require its installation and dedicated-profile sign-in; diagnostics do not change the saved provider choice.
`start --notebook` lets you keep writing without a model.

API and local conversations retain selected context across restarts in separate schema-1 `api-provider.sqlite` and `local-provider.sqlite` files.
Changing provider/endpoint/model/tool mode requires a new conversation; omission notices and rejected selections retain visible work.
Portable notebook archives exclude credentials and raw conversations.
To retain conversation continuity, stop the companion and privately back up its full directory and any separate Codex profile.
The backup includes credential identifiers and learning records; OS keychain entries remain on the computer.
Restore your records and sign in again on another computer; a relocated Codex profile also needs fresh login because its keyring identity depends on its path.

To migrate a notebook, stop its companion/provider and select a new empty destination:

```sh
npm run companion -- migrate --from /absolute/path/to/old-notebook --directory /absolute/path/to/new-notebook --confirm-stopped
```

Migration retains the source and rejects a nonempty destination.
It copies private records, API credential identity and profile threads, but excludes externally created Codex `auth.json` files at every depth.
Setup preferences are left for explicit setup in the destination.
Choose the original provider/endpoint/model/tool mode to resume conversations, restore any key environment variable, and run `doctor` with the destination directory.
An unsupported newer database schema is rejected without rewriting it.

`npm run companion -- logout` removes the selected API endpoint's OS entry or uses Codex's keyring logout; it retains notebook and conversation records.
Same-machine API notebook copies with the same credential identity share that keychain entry.
Environment-backed API logout explains how to unset or revoke the external key without changing the parent environment.

See [student setup and recovery](https://scalableweb.dev/notebook/setup/) for the full workflow.
Model providers process messages and context you explicitly send; course membership gives teachers and peers no access to your private notebook.

## Version 0.3.0

Connection uses an automatically issued, origin-bound session token with browser protocol 2.
Reconnect after disconnect, expiry or restart by choosing **Connect companion** again.
Exact website-origin and literal loopback-host checks precede every route, and private routes require a session.
Sessions expire after twelve hours; Disconnect revokes them.
This browser trust boundary does not isolate the service from other native processes on your computer.

The teaching assistant retains shared study policy version 1 and recorded source/help/note/provider context.
Notebook, archive and conversation schemas remain version 1; local and API histories each have schema 1.
Codex CLI 0.154.0 remains the verified adapter version.
Release metadata in `dist/release.json` identifies the source revision, package, protocol and storage schemas.
Existing setup preferences, notes and profiles remain available when you keep their directories.
A website update alone does not update an installed companion.
