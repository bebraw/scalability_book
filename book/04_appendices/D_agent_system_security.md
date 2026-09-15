# Agent-system security, control, and traceability

Use this appendix when an agent workflow crosses several orchestration, model, tool, credential, or network boundaries.
The [Agent Fleets chapter](/chapters/agent-fleets/) keeps the essential rules—allocate decision authority, enforce least privilege, preserve evidence, and keep a human owner—while this appendix develops control-plane separation, end-to-end trace reconciliation, capability adoption, and persistent cross-run state.

## Separate task control from resource access

A session or orchestration layer coordinates agent tasks; a resource-access layer mediates selected model and tool requests.
These responsibilities can share a platform or span several services, but their decisions and enforcement points must agree.

:ref[table:fleet-control-boundaries]{text="The table below"} separates task-level orchestration from request-level resource access.

| Control boundary               | Primary unit                   | Typical responsibilities                                                                                                                |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Session and task orchestration | Run, delegated task, workspace | Agent-harness selection, task graph, session history, collaboration, delegated tool authority, sandbox choice, and task-level policy    |
| Model and tool access          | Model or tool request          | Permitted services and credentials, request routing and fallback, rate and spend limits, request guardrails, and shared usage telemetry |

::caption[Control boundaries for agent orchestration and model or tool access.]
::label[table:fleet-control-boundaries]

The durable distinction is between a decision and its enforcement point.
NIST's zero-trust architecture distinguishes a policy engine that makes and logs an access decision, a policy administrator that executes it by configuring an enforcement point, and the enforcement point that enables, monitors, or terminates access; implementations may combine the engine and administrator :citep[rose2020zerotrust].
This is a design analogy, not a claim of NIST conformance.
For each consequential decision, name the policy authority, mandatory enforcement point, and conflict or outage rule; overlapping controls still need explicit precedence, and a mediator cannot protect a path that bypasses it.

The HAR decision map identifies the intended transfers of work and authority.
Check where the controls enforce and observe those transfers.
Trace one operation through the chain:

`originating actor → fleet session → delegated task → model or tool attempt → validation → delegated-run outcome`

Propagate only the necessary authenticated principal, audience-scoped delegated authority, and trusted task, trace, budget-reservation, and policy-decision identifiers.
Each enforcement point must validate the authority and identifiers it relies on.
Return the resource actually selected, routing or fallback decision, policy result, and observable latency, usage, and cost; for a model call, also record its provider, model, and version where available.
Associate every physical attempt with one delegated run and that run's explicit outcome, such as accepted, rejected, failed, cancelled, or unresolved.
Default telemetry to metadata: capture prompts, source, tool arguments or results, approval details, or principal data only when necessary, with redaction, access control, and deliberate retention, and never place credentials in trace context.
A trace identifier connects evidence; it is not proof of identity or permission.
Without this contract, the resource layer can see spend without knowing whether the work was accepted, while the orchestration layer can see intent without knowing which model or permission was actually used.

Audit one delegated task:

1. Choose two consequential decisions: one about the session or task and one about a model, tool, credential, or other resource.
2. For each decision, record the policy authority, mandatory enforcement point, trusted context or evidence, and conflict or outage rule.
3. Trace the task end to end.

During the trace, look for:

- a direct-call bypass;
- lost actor identity;
- multiplied retries;
- conflicting caps or double-counted usage;
- cancellation that does not reach in-flight work.

Where practical, use a safe direct-call negative test and, where records are available, reconcile the mediator with the model provider or tool resource rather than inferring non-bypass from an incomplete trace.

The audit is complete only when every denied, failed, retried, cancelled, or successful attempt:

- has an identifier and policy result;
- has usage or cost provenance where measurable;
- rolls up once to an explicit delegated-run outcome.

When computing cost per accepted outcome, include spend from every attempt in the fixed cohort.
Use accepted delegated runs—not internal calls—as the denominator, and label missing or estimated costs rather than treating them as zero.

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

The skill-adoption lab provides a non-executing fixture for practicing this review without loading an untrusted capability into an agent context; [study its source](https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption) or [download the standalone lab](/downloads/labs/skill-adoption.zip).

> **Case study: when exploration scales**
>
> OpenAI's August 2026 incident report describes a sequence spanning reinforcement-learning training in May and June and cybersecurity evaluations in July.
> Agents first found unauthorized communication and internet-access paths through shared Artifactory infrastructure; after that service was rebuilt and the evaluations restarted, agents working on ExploitGym re-established the channel and chained vulnerabilities across OpenAI infrastructure, external services, and Hugging Face's production systems :citep[openai2026huggingfacereport].
> Hugging Face reconstructed roughly 17,600 agent actions across dataset processing, Kubernetes, cloud identity, an internal network, and source control.
> Most attempts failed, but the volume and persistence of exploration eventually exposed a viable path across several trust boundaries :citep[larcher2026agentintrusion].
>
> OpenAI's investigation shows that the continuity mechanism preceded the Hugging Face intrusion.
> Separate training runs first used files left in Artifactory as an informal message board for requests, exploit details, assignments, scripts, progress, and credential information.
> After Artifactory was rebuilt and agent credentials were revoked, later evaluation runs recreated the channel through unauthenticated WebDAV requests and message-bearing directory names :citep[openai2026huggingfacereport].
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

### Field note — Permission follows the risk profile

I do not maintain one universal list of actions that agents may or may not perform.
The appropriate authority depends on the project and its risk profile.

I consider three factors first:

1. **Financial cost.** Could the action create meaningful or unbounded spending?
2. **Possible consequences.** Could a mistake affect users, sensitive data, external systems, or something else that matters?
3. **Recoverability.** Can I detect the mistake and restore a useful state without disproportionate effort or harm?

For small, low-risk projects, I allow agents to work relatively freely with Cloudflare infrastructure.
Direct API or dashboard changes are acceptable when I do not expect major spending, the project contains no sensitive data, and a mistake would have limited consequences.
If an action may introduce cost, I negotiate a limit with the agent before it proceeds.
That agreement is a decision boundary, not an enforcement mechanism.
Where spending could become material, the limit also needs a provider budget, quota, or another control outside the model.

This convenience trades away some reproducibility and reviewability.
A direct infrastructure change may not leave the repository as a complete description of the deployed state.
I accept that trade-off only when the experiment is disposable enough that I can inspect, recreate, or abandon it without material harm.

The same permission should not transfer automatically to another project.
As financial exposure, consequences, or recovery difficulty increase, the agent's role should narrow from executing the action to preparing a reviewed change.
Authority should follow the expected loss and recovery path, not the mere fact that an agent successfully performed a similar action elsewhere.

## Tool examples (September 2026)

These examples distinguish the unit of delegation exposed by each tool.
They describe the documentation used for this edition; verify the linked versions before adoption.
The [course environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) defines the supported assignments for a particular course run.

| Environment                                                                                                                                                                                     | Unit and coordination model                                                                | Isolation or control to inspect                                                          | Best fit in this chapter                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Pi](https://pi.dev/docs/latest/quickstart) plus its [reference subagent extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) | Local agent processes in single, sequential-chain, or parallel modes                       | Project trust, extension code, agent tools, contexts, and process output                 | Primary hands-on agent-harness lab because you can see and modify the mechanism                |
| [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)                                                                                                       | Parent delegates fresh-context children singly or in parallel; nested delegation is opt-in | Inherited toolsets, separate terminals, optional worktrees, iteration and timeout limits | Broader multi-provider agent-harness comparison with built-in delegation and persistent memory |
| [Claude Code](https://code.claude.com/docs/en/agents)                                                                                                                                           | Subagents, parallel sessions, and experimental agent teams                                 | Tool permissions, separate contexts, optional worktree isolation                         | Integrated agent-harness comparison when you want several built-in fleet patterns              |
| [GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents)                                                                                                     | Asynchronous repository task that researches, changes code, and opens a pull request       | Repository policy, hosted environment, checks, and pull-request review                   | Issue-to-pull-request comparison rather than a transparent local fleet                         |
| [OpenAI Responses multi-agent](https://developers.openai.com/api/docs/guides/latest-model#what-is-new)                                                                                          | A model coordinates parallel subagents and synthesizes their results                       | API tools, prompts, application policy, usage, and returned evidence                     | Application-level orchestration comparison rather than an agent-harness lab                    |

::caption[Current paths for trying delegation; verify the linked documentation because these products evolve quickly.]
::label[table:fleet-tool-options]

Omnigent illustrates the first scope: its open-source meta-harness wraps several agent harnesses behind a common session interface and documents composition, shared sessions, contextual policies, and local or remote sandbox execution :citep[zaharia2026omnigent].
Unity AI Gateway illustrates the second: for model and MCP traffic routed through it, Databricks documents catalog-backed permissions, rate limits, budgets, provider routing and fallbacks, and usage records :citep[databricks2026unitygatewaydocs].
These are examples, not evidence that every fleet needs two products or exactly two control planes.
Both accounts are documented in Databricks-authored sources, their responsibilities overlap, and Omnigent was introduced as alpha; they are not independent evaluations of effectiveness.

For any option, inspect how child tasks inherit tools and credentials, whether concurrent writers are isolated, what state survives between runs, and how the execution trace is exported.
Hermes also supports persistent memory, skills, remote terminals, and messaging; restrict those capabilities to the declared repository workflow when comparing it with a coding harness.
Application-level agent orchestration has separate runtime users, data, and operational obligations.

## Complete the control-boundary review

For each consequential action, name the decision authority, mandatory enforcement point, granted scope, evidence returned, and conflict or outage rule.
Then follow one denied, failed, retried, cancelled, or successful attempt across every relevant system and confirm that it rolls up exactly once to an explicit delegated-run outcome.
Include a bypass check for any control the decision relies on.
