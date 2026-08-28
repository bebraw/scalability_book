# Agent-system security, control, and traceability

Use this appendix when an agent workflow crosses several orchestration, model, tool, credential, or network boundaries.
The [Agent Fleets chapter](/chapters/agent-fleets/) keeps the essential rules—allocate decision authority, enforce least privilege, preserve evidence, and keep a human owner—while this appendix develops control-plane separation, end-to-end trace reconciliation, capability adoption, and persistent cross-run state.

## Separate task control from resource access

Controls around a fleet operate at different scopes.
The project harness introduced earlier is the versioned material inside a repository: specifications, commands, rules, and evidence.
An agent harness controls a model-and-tool execution loop.
A session or orchestration layer may coordinate several harnesses, while a resource-access layer may mediate selected model and tool requests.
These responsibilities may be combined in one platform or split across several services.

:ref[table:fleet-control-boundaries]{text="The table below"} separates task-level orchestration from request-level resource access.

| Control boundary               | Primary unit                   | Typical responsibilities                                                                                                                |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Session and task orchestration | Run, delegated task, workspace | Harness selection, task graph, session history, collaboration, delegated tool authority, sandbox choice, and task-level policy          |
| Model and tool access          | Model or tool request          | Permitted services and credentials, request routing and fallback, rate and spend limits, request guardrails, and shared usage telemetry |

::caption[Control boundaries for agent orchestration and model or tool access.]
::label[table:fleet-control-boundaries]

Omnigent illustrates the first scope: its open-source meta-harness wraps several agent harnesses behind a common session interface and documents composition, shared sessions, contextual policies, and local or remote sandbox execution :citep[zaharia2026omnigent].
Unity AI Gateway illustrates the second: for model and MCP traffic routed through it, Databricks documents catalog-backed permissions, rate limits, budgets, provider routing and fallbacks, and usage records :citep[databricks2026unitygatewaydocs].
These are examples, not evidence that every fleet needs two products or exactly two control planes.
Both accounts are documented in Databricks-authored sources, their responsibilities overlap, and Omnigent was introduced as alpha; they are not independent evaluations of effectiveness.

The durable distinction is between a decision and its enforcement point.
NIST's zero-trust architecture distinguishes a policy engine that makes and logs an access decision, a policy administrator that executes it by configuring an enforcement point, and the enforcement point that enables, monitors, or terminates access; implementations may combine the engine and administrator :citep[rose2020zerotrust].
This is a design analogy, not a claim of NIST conformance.
For each consequential decision, name the policy authority, mandatory enforcement point, and conflict or outage rule; overlapping controls still need explicit precedence, and a mediator cannot protect a path that bypasses it.

The contract between the scopes matters more than the number of components.
The HAR decision map states which decisions and transfers should occur; these control scopes provide some of the places where that design can be enforced and observed.
A responsibility recorded in a table without a mandatory enforcement point remains an intention.
Trace one operation through the chain:

`originating actor → fleet session → delegated task → model or tool attempt → validation → delegated-run outcome`

Propagate only the necessary authenticated principal, audience-scoped delegated authority, and trusted task, trace, budget-reservation, and policy-decision identifiers.
Each enforcement point must validate the authority and identifiers it relies on.
Return the resource actually selected, routing or fallback decision, policy result, and observable latency, usage, and cost; for a model call, also record its provider, model, and version where available.
Associate every physical attempt with one delegated run and that run's explicit outcome, such as accepted, rejected, failed, cancelled, or unresolved.
Default telemetry to metadata: capture prompts, source, tool arguments or results, approval details, or principal data only when necessary, with redaction, access control, and deliberate retention, and never place credentials in trace context.
A trace identifier connects evidence; it is not proof of identity or permission.
Without this contract, the resource layer can see spend without knowing whether the work was accepted, while the orchestration layer can see intent without knowing which model or permission was actually used.

For one delegated task, choose two consequential decisions: one about the session or task and one about a model, tool, credential, or other resource.
For each, record the policy authority, mandatory enforcement point, trusted context or evidence, and conflict or outage rule.
Then trace the task end to end and look for a direct-call bypass, lost actor identity, multiplied retry, conflicting caps or double-counted usage, and cancellation that does not reach in-flight work.
Where practical, use a safe direct-call negative test and, where records are available, reconcile the mediator with the model provider or tool resource rather than inferring non-bypass from an incomplete trace.
The audit is complete only when every denied, failed, retried, cancelled, or successful attempt has an identifier, policy result, and usage or cost provenance where measurable, and rolls up once to an explicit delegated-run outcome.
When computing cost per accepted outcome, include spend from every attempt in the fixed cohort and use accepted delegated runs—not internal calls—as the denominator; label missing or estimated costs rather than treating them as zero.

For the B–C comparison, keep any gateway pinned to the declared base model where possible; otherwise record the model actually used and treat substitution as a confounding factor.

### Fleet trace debugger

The forensic packet below separates orchestration outcomes, gateway decisions, and physical provider or resource records.
Map every physical row to a delegated run or leave it unmatched, then reconcile the packet without counting the same attempt once per log source.

{{ import "site/includes/fleet-trace-debugger.html" }}

The packet is synthetic and deterministic.
It rehearses evidence joins, accounting, bypass detection, and late-effect reasoning; it does not estimate the reliability or cost of a particular fleet platform.

## Trust boundaries

An agent's role should define not only its task but also which information it can read and which actions it can take.
Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) names a particularly dangerous combination: access to private data, exposure to untrusted content, and a way to communicate externally.
Prompt injection in the untrusted content can then turn the agent's legitimate permissions into a path for data exfiltration.

### Imported capabilities are development dependencies

A skill may arrive as prose, yet it can direct tool calls made with the agent's authority and may bundle code or configuration.
A USENIX Security 2026 study crawled 98,380 skill entries from two community registries in January 2026.
Static triage selected 4,287 candidates; sandboxed behavioral verification and independent judgments by two of the authors confirmed 157 malicious skills :citep[liu2026maliciousskills].

Those 157 are a behaviorally confirmed lower bound in one snapshot, not an ecosystem prevalence estimate.
The snapshot excluded private, unindexed, and official collections; one publisher identifier contributed 85 templated cases; and 60-second sandbox runs could miss dormant or environment-gated behavior.
Official provenance, popularity, scanning, or a previous safe version can filter risk; none proves that an imported capability or update is safe in the current host.

Treat adoption and updates as dependency changes.
Record the source and resolved revision; inspect instructions, bundled files, installation hooks, downloads, and mutable remote inputs; identify missing or unreviewable content; and map requested access against the authority the host would actually grant over files, commands, networks, and credentials.
Perform any dynamic verification only in a disposable sandbox approved for security testing, with the least authority needed and no production credentials.
Connect output produced with the capability to independent project checks, and define who reviews updates and how the capability can be removed.

The [skill-adoption lab](https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption) provides a non-executing fixture for practicing this review without loading an untrusted capability into an agent context.

> **Case study: when exploration scales**
>
> During a July 2026 cyber-capability evaluation using the ExploitGym benchmark, an AI agent escaped its evaluation environment and chained weaknesses across external infrastructure and Hugging Face's production systems :citep[openai2026huggingfaceincident].
> Hugging Face reconstructed roughly 17,600 agent actions across dataset processing, Kubernetes, cloud identity, an internal network, and source control.
> Most attempts failed, but the volume and persistence of exploration eventually exposed a viable path across several trust boundaries :citep[larcher2026agentintrusion].
>
> OpenAI's later reconstruction added a crucial continuity mechanism.
> Separate agent runs discovered files left in a shared Artifactory service and used them as an informal message board for requests, exploit details, assignments, scripts, progress, and credential information.
> After the files were cleared and the posting credentials revoked, later runs recreated the channel through an unauthenticated WebDAV endpoint, using message-bearing directory names in Artifactory's remote cache :citep[dalton2026breaking].
>
> The sandboxes were short-lived, but the runs were not independent.
> Unlike the curated project memory described earlier, this was ambient infrastructure state.
> A location becomes cross-run memory and an unintended coordination channel when one run can leave state that survives, is discoverable, and influences a later run.
> Artifact and package stores, caches, queues, logs, temporary storage that outlives a run, and remote workspaces therefore belong in the trust-boundary review.
> For each channel, record who can write and later read it, how writes are attributed, what may be stored, how long it persists, and how it is cleared.
>
> The incident did not make established defensive principles obsolete.
> It showed why they become more important with agents: strict sandbox isolation, least privilege, short-lived and narrowly scoped credentials, blocked metadata access, and telemetry that can correlate behavior across systems.
> Agent safety therefore depends on the authority exposed by the surrounding system, not only on instructions or model behavior.

The safest design is to break the combination where possible.
A scout reading untrusted issues may not need secrets or network-writing tools.
An implementer may work in a sandbox with scoped files and no deployment credentials.
A publisher may receive a reviewed artifact instead of the full private context that produced it.
Human approval can help at a sensitive boundary, but an approval prompt is not useful when the effect is unclear or reviewers have learned to accept it mechanically.

## Complete the control-boundary review

For each consequential action, name the decision authority, mandatory enforcement point, granted scope, evidence returned, and conflict or outage rule.
Then follow one denied, failed, retried, cancelled, or successful attempt across every relevant system and confirm that it rolls up exactly once to an explicit delegated-run outcome.
A diagram or approval step is not a control unless the action cannot bypass it.
