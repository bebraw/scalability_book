# ADR-038: Support local models through the learning companion

**Status:** Implemented

**Date:** 2026-10-07

## Context

The teaching assistant currently uses a dedicated Codex app-server profile.
The notebook works without a model, but using model support requires the Codex CLI and account access.
The instructor uses local models in Kirjolab and wants that option for this learning space, with LM Studio as the first target.

Kirjolab's browser/local-companion path calls a credential-free OpenAI-compatible service with only deliberately selected writing context.
That is a useful setup and transport precedent, but this book also needs retained conversation context, a shared teaching policy and actual browser demo callbacks.
Forwarding one completion request alone would not provide those contracts.

[ADR-027](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md) establishes a provider-independent learning boundary, and [ADR-035](../implemented/ADR-035-ground-the-teaching-assistant-in-a-shared-teaching-policy.md) requires a shared applied policy with honest evaluation.
The current provider interface and three tool schemas still live in the Codex adapter; extract those contracts before adding another adapter.

## Decision

Use a direct OpenAI-compatible local-model adapter behind the existing companion.
Verify LM Studio first, then test Ollama and llama.cpp against the same bounded contract before claiming support for those runners.
The model service remains student-operated: the companion does not install, download, load or silently switch models.
Use the same notebook and Teaching assistant panels, shared teaching policy and deliberate source/note handoffs.
Local model access requires neither a Codex installation nor a Codex sign-in.
Connection remains the code-free browser session from [ADR-037](../implemented/ADR-037-connect-to-the-local-companion-without-pairing-codes.md).

### Entry point, owners and dependencies

Extend CLI setup/start/doctor with a Local model choice beside Notebook-only and Codex.
The explicit configuration is:

```sh
npm run companion -- setup --local --local-url http://127.0.0.1:1234/v1 --model google/gemma-4-12b-qat
npm run companion
```

Store the chosen mode, endpoint and explicit model identifier in the local companion settings; origins remain explicit startup options.
Model-list discovery can assist selection but must not select an embedding model, download weights or claim that listing proves inference availability.
Doctor should report endpoint reachability, the selected model and available runtime metadata, distinguishing a model's advertised maximum from its loaded context size.

The browser talks only to the existing companion API.
The server composition chooses a provider; conversations and the demo broker depend on a provider-neutral port, not a Codex module.
The local adapter owns API requests, cancellation, bounded tool rounds and private wire transcripts.
The conversation owner retains student-facing messages, selected-context authority and tool permissions.
Shared teaching instructions and book/demo contracts remain provider-independent.
The Worker gains no model gateway, notebook ownership or credential handling.

### Model and conversation contract

Begin with `/v1/models` and non-streaming `/v1/chat/completions` through Node's built-in fetch, retaining the package's lack of runtime SDK dependencies.
The existing background conversation flow already reports work and permits Stop; token streaming can be a later presentation improvement.
Validate every provider response, bound response sizes, abort stopped requests and surface missing/truncated replies and context errors without clearing student work.
Do not display reasoning fields or provider diagnostics as a student answer.
Apply the current shared teaching policy on new and resumed turns.
Record the actual selected/returned model identifier and available runner version in reply metadata; unknown versions remain unknown.
Prompt application does not certify that a reply follows the policy.

Persist the exact supplied context and standard assistant/tool messages privately behind the adapter so continuation survives a companion restart.
The current public conversation history records question text and selected note IDs, but cannot reconstruct earlier selected note bodies after those notes change.
Do not rebuild past model context from today's notebook entries or rely on a server's cache as durable history.
Use provider-scoped session identities and explicitly handle a changed provider/model; never send a Codex thread ID as a local-model session or silently replay private history to another backend.
Keep private wire transcripts out of notebook exports and browser/course responses.
Their storage version, copying, backup and recovery must be covered alongside existing migration/directory leases before support is complete.

Budget the shared context, history, tool results and output allowance against the loaded model configuration.
Keep the full student-visible history locally; sending bounded context must not rewrite it.
Preserve the current question, deliberately selected source/notes and complete tool request/result pairs.
Clearly report when older context or source excerpts are omitted; reject an oversized current selection rather than silently changing its meaning.
Avoid repeating the entire static catalog on each local-model turn where a shared context builder can supply relevant authored links.
A character estimate is not a guaranteed token count; provider context errors need a retained-work recovery path.

### Capabilities and observations

Offer discussion/reflection support with selected context independently of demo tool support.
Advertise book/demo tools only in an explicitly supported tool mode; a tool-trained flag or successful chat request alone does not establish a working callback loop.
Native function calls must pass through the same approved `read_book`, `observe_demo` and `change_demo` broker as Codex.
Do not interpret ordinary prose, code blocks or a claim of execution as a tool request or an observation.
Actual demo changes still need saved initial thinking and student approval, and refused/unavailable operations remain visible.
For discussion-only mode, make the absence of live observation explicit and let the student supply a saved demo result or use the existing Chapter guide.
Do not silently retry a failed tool workflow as discussion-only while presenting it as an executed experiment.

### Local transport and inference location

Configure the upstream in the CLI, not from browser/provider-generated URLs.
Initially accept only literal loopback HTTP endpoints, with no URL credentials/query/fragment and no redirects.
Keep API keys unnecessary for the verified credential-free LM Studio setup; authenticated or remote endpoints require a separately specified configuration contract.
The browser needs no direct model-server CORS permission because the companion makes the request.
Keep [ADR-037](../implemented/ADR-037-connect-to-the-local-companion-without-pairing-codes.md)'s configured website trust and origin-bound sessions.
Do not equate a loopback URL with guaranteed local inference: a runner can proxy remote/cloud models.
Student instructions must identify a locally loaded model for a local-inference claim, and keep public book retrieval distinct from model inference.

## Trigger

The instructor requested exploration of local models, selected LM Studio, and exposed Gemma for synthetic verification.

## Consequences

**Positive:**

- Students can use locally available models without a Codex account while retaining the same learning space and private notebook.
- One HTTP adapter can support several runners when their actual behavior has been verified.
- Shared teaching policy, selected-context rules and demo approvals remain outside provider-specific implementation.

**Negative:**

- Hardware, loaded context, generation settings and model/tool reliability introduce another support and evaluation surface.
- Stateless chat requires private history persistence and bounded replay that Codex currently supplies through provider threads.
- A successful completion or advertised model capability can mask formatting, truncation and invented-observation failures.

**Neutral:**

- Notebook-only use and ordinary course submissions stay independent of model availability.
- Local inference avoids sending model context to a remote inference provider only when the runner actually uses local weights.
- Software/provider checks do not establish learning gains or course completion.

## Alternatives considered

### Use Codex's local-model mode

Official OpenAI documentation describes `--oss` with LM Studio or Ollama.
This could reuse some harness behavior, but retains the Codex installation/configuration/version dependency and needs separate verification of app-server configuration, callbacks and context overhead on the selected local model.
The current adapter also requires dedicated-profile authentication, so OSS support is not an existing feature.
Prefer direct local access for students who choose a local runner; keep the Codex adapter as its own option.

### Connect the browser directly to the model server

Kirjolab supports this for selected writing requests.
Here it would duplicate provider orchestration, private conversation persistence and permission handling in the browser, while introducing a second connection path beside the notebook companion.
Keep the companion as the shared local boundary.

### Use structured action envelopes instead of native tool calls

A validated JSON schema could describe an answer or a bounded book/demo request for models whose native tool format is unavailable.
This would require its own action-loop contract and verification; it cannot be inferred from an arbitrary JSON or prose response.
Investigate only if native callbacks remain incompatible with the chosen runner/model after configuration is resolved.

### Support one runner-specific SDK

LM Studio's SDK can expose richer model/context details, but ties the initial adapter to that runner and adds a runtime dependency.
Use the compatibility API for inference and optional runner-specific read-only diagnostics where needed.

## Implementation and verification

Implemented in the prepared 0.3.0 companion with provider-neutral contracts and shared context construction, a bounded direct adapter, read-only model diagnostics and private SQLite wire snapshots.
Setup/start/doctor support `--local`, `--local-url`, `--model`, `--local-context` and `--local-tools none|native`; setup retains the choice and the default is discussion-only.
Unknown loaded context requires an explicit budget; LM Studio metadata caps an explicit budget at the loaded size.
The adapter uses reasoning disabled, a 1,024-token output allowance, estimated UTF-8-byte token usage and a 512-token guard; runner context failures remain recoverable rather than treated as proof of the estimate.
Replay preserves full current context and complete tool pairs, omits entire older completed turns visibly and excludes interrupted turns with a separate notice.
Private `local-provider.sqlite` has schema 1 and participates in read-only schema checks, process leases, legacy backup and full-directory copy/recovery; portable archives omit it.
Endpoint/model/tool-mode identities and returned-model checks prevent silent backend changes.
Discussion-only uses an explicit reply JSON schema, exposes its limitation before sending and never parses generated prose as actions.
Native mode validates a whole batch before execution and permits at most eight rounds of three calls, using the existing broker for actual observations and student approval.
No model, package or website release was published, and no personal notebook record was used.
Ignored exploration scripts/results live under `.local/local-model-exploration/`.

On 2026-10-07 the exposed LM Studio API reported a loaded `google/gemma-4-12b-qat` GGUF/Q4_0 model, context size 8,192, advertised maximum 262,144 and a tool-trained capability flag.
The installed runner version was not established.
A synthetic request built by the current conversation owner contained 10,695 characters of turn context plus 3,845 characters of teaching instructions and the three existing tool schemas.
The API accepted it, reporting 3,350 input tokens; model reasoning consumed 739 of 882 completion tokens and the request took about 31 seconds.
A follow-up accepted replayed history and challenged the claim that a finite buffer permanently solves overload.
These samples establish transport/prompt feasibility, not instructional reliability.

Initial requests returned an `ok`/`message` JSON envelope rather than ordinary prose.
The automatic-tool probe invented demo inputs/results while returning an empty native tool-call list.
Explicit plain-text format and required-tool probes also returned no native calls.
Requests with `reasoning_effort: "none"` reported zero reasoning tokens and took roughly 2–6 seconds, but used different prompts and outputs; these timings are not a controlled comparison with the initial request.
A separate explicit JSON-schema request returned the requested `reply` field instead of the earlier envelope, demonstrating that per-request structured output can work.
That does not establish a working action loop or explain the earlier formatting behavior.
The Responses endpoint also accepted a required-function request but returned only an answer, with no function call.
Output-format configuration and native callbacks need further verification before claiming demo-tool support for this setup.

Implementation verification on 2026-10-07:

- Full unit suite: 163 passed, including ten local boundary tests for exact snapshots/restart, backend isolation, copied transcripts, schema rejection, context omission, cancellation, malformed/oversized replies, invalid calls and unchanged private work.
- Existing Codex adapter/profile, notebook-only and conversation-policy tests remained passing after provider extraction.
- Clean packed installation on macOS / Node 26.10.0: local setup/doctor without Codex on PATH, real HTTP discussion, restart/resume across working folders and built-only Node runtime.
- Packed native-provider browser checks: actual queue DOM observation, student-declined and student-approved changes, discussion-only notices and model provenance; four passed across Chromium and WebKit with a synthetic API server.
- Actual packed Gemma discussion and restart/resume with a selected synthetic note passed through the installed package.
- Actual LM Studio/Gemma discussion evaluation: eight returned replies through the new adapter, reviewed against the existing criteria in [the evaluation guide](../../learning-workspace-evaluation.md).
  Source-link omissions, insufficient qualification and observation-window confusion mean this is not a passed instructional-quality evaluation.
- The existing package matrix includes the new provider tests and packed local setup/resume checks; each standalone release still requires its exact-artifact matrix before publication.

## Remaining limits

- Native tools remain unverified on the exposed Gemma configuration; its verified mode is discussion-only.
- Ollama, llama.cpp and Windows are not verified runner/platform support claims.
- The context budget is an estimate, not a tokenizer guarantee; model/hardware/settings affect latency and answer quality.
- Prepared 0.3.0 is not published to npm; the student guide uses repository commands until registry availability and release checks are established.
- Software verification and synthetic teaching review do not establish learning gains or course completion.

## References

- [Current workspace contract](../../learning-workspace.md).
- [Development and verification](../../development.md).
- [Learner and teaching evaluation](../../learning-workspace-evaluation.md).
- [Kirjolab model setup](https://github.com/bebraw/kirjolab#configure-a-writing-model).
- [Kirjolab companion source](https://github.com/bebraw/kirjolab/blob/main/src/model-companion.ts).
- [LM Studio chat completions](https://lmstudio.ai/docs/developer/openai-compat/chat-completions).
- [LM Studio tool use](https://lmstudio.ai/docs/developer/openai-compat/tools).
- [LM Studio Responses endpoint](https://lmstudio.ai/docs/developer/openai-compat/responses).
- [LM Studio structured output](https://lmstudio.ai/docs/developer/openai-compat/structured-output).
- [Ollama compatibility endpoints and context configuration](https://docs.ollama.com/api/openai-compatibility).
- [llama.cpp function-calling configuration](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md).
- [Official OpenAI documentation: local OSS providers](https://learn.chatgpt.com/docs/config-file/config-advanced#oss-mode-local-providers).
