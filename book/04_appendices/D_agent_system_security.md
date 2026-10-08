# Agent-system security, control, and traceability

Use this appendix when an agent workflow crosses several orchestration, model, tool, credential, or network boundaries.
The [Agent Fleets chapter](/chapters/agent-fleets/) keeps the essential rules—allocate decision [authority](/concepts/#authority), enforce least privilege, preserve evidence, and keep a human owner—while this appendix develops control-plane separation, end-to-end trace reconciliation, capability adoption, and persistent cross-run state.
The [optional fleet exercises](#optional-fleet-exercises) test project memory, contract completeness, and human review gates.

## Separate task control from resource access

A session or orchestration layer coordinates agent tasks; a resource-access layer mediates selected model and tool requests.
These responsibilities can share a platform or span several services, but their decisions and enforcement points must agree.

:ref[table:fleet-control-boundaries]{text="The table below"} separates task-level orchestration from request-level resource access.

| Control boundary               | Primary unit                   | Typical responsibilities                                                                                                                                      |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session and task orchestration | Run, delegated task, workspace | Agent-harness selection, [task graph](/concepts/#task-graph), session history, collaboration, delegated tool authority, sandbox choice, and task-level policy |
| Model and tool access          | Model or tool request          | Permitted services and credentials, request routing and fallback, rate and spend limits, request guardrails, and shared usage telemetry                       |

::caption[Control boundaries for agent orchestration and model or tool access.]
::label[table:fleet-control-boundaries]

The durable distinction is between a decision and its enforcement point.
NIST's zero-trust architecture distinguishes a policy engine that makes and logs an access decision, a policy administrator that executes it by configuring an enforcement point, and the enforcement point that enables, monitors, or terminates access; implementations may combine the engine and administrator :citep[rose2020zerotrust].
This is a design analogy, not a claim of NIST conformance.
For each consequential decision, name the policy authority, mandatory enforcement point, and conflict or outage rule; overlapping controls still need explicit precedence, and a mediator cannot protect a path that bypasses it.

The [fleet authority map](/chapters/agent-fleets/#map-authority-and-acceptance) identifies the intended transfers of work and authority.
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

For the required bounded single-agent/fleet comparison, keep any gateway pinned to the same small-model configuration and routing policy.
For a declared mixed-model C fleet, preserve the model actually used for each attempt and check substitutions against the approved assignment and fallback rules.
Changing model assignment as well as orchestration makes the full B–C builds a comparison of development systems.

### Fleet trace debugger

The forensic packet below separates orchestration outcomes, gateway decisions, and physical provider or resource records.
Map every physical row to a delegated run or leave it unmatched, then reconcile the packet without counting the same attempt once per log source.

{{ import "site/includes/fleet-trace-debugger.html" }}

The packet is synthetic and deterministic.
It rehearses evidence joins, accounting, bypass detection, and late-effect reasoning; it does not estimate the reliability or cost of a particular fleet platform.

### Composed tool calls cross execution boundaries

**Codemode** lets an agent write code that composes tool calls and processes intermediate results before returning a selected view to the model.
:citet[ronacher2026codemode] distinguishes composition on the harness host from shell programs running in the target environment.
His described interpreter restricts direct filesystem and network access while exposing tools; its effective reach therefore also depends on those tools' permissions.
The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) already supports structured and multimodal results.
Check that the composition layer preserves errors, pagination, and decisive evidence across result shapes, using [Appendix A's output preflight](/appendices/evaluating-agentic-workflows/#qualify-the-served-configuration).

Retaining a tool result in a session transcript lets later calls reuse it, but does not establish recovery of pending operations or deduplication of external effects.
Inventory the harness host, target environment, exposed tools, and state stores before treating an interpreter restriction as a boundary for the whole operation.
Name where each call is authorized, what happens to queued or in-flight work after cancellation, and which durable record determines recovery.
[Appendix F's effect audit](/appendices/durable-workflows/#audit-the-effect-boundary) follows the gap between an external effect and recorded completion.

For a paper extension of the control-boundary audit, trace a synthetic batch that reads workspace W1's paginated events, prepares a summary, and writes an export through a tool.
The originating actor may read W1 and write only to the designated export directory.
Try an unauthorized W2 read, a failed second page omitted from the summary, and a restart after the export is written but before completion is recorded.
For each case, identify the enforcement point or retained evidence needed to detect the problem and the state owner responsible for recovery.
Distinguish the batch's reported outcome from each tool attempt and any file already written.

## Trust boundaries

An agent's role should define not only its task but also which information it can read and which actions it can take.
Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) names a particularly dangerous combination: access to private data, exposure to untrusted content, and a way to communicate externally.
Prompt injection in the untrusted content can then turn the agent's legitimate permissions into a path for data exfiltration.

### Separate credential custody, action authorization, and containment

A credential-injecting proxy can let an agent call a service while another process holds the real credential.
[fnox's credential-proxy documentation](https://fnox.jdx.dev/guide/proxy) describes supplying placeholders and substituting credentials into matching HTTPS requests; it explicitly distinguishes this from an operating-system sandbox.
[Claw Patrol's security model](https://clawpatrol.dev/docs/security-model/) also separates protection of injected credentials from broader host access and network containment.
These are documented designs, accessed September 24, 2026; their effectiveness depends on the deployed configuration and its actual access paths.

:ref[table:credential-control-properties]{text="The table below"} separates the properties to check.

| Property             | Governing question                                                        | Evidence to seek                                                                                     |
| -------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Credential custody   | Can the agent obtain the protected credential through any available path? | Denied access to credential sources and no disclosure through environment, logs, or returned results |
| Action authorization | Which services, resources, and operations does the task permit?           | An allowed operation succeeds while an out-of-scope resource or operation is refused                 |
| Containment          | Which files, processes, and network destinations can the agent reach?     | Forbidden access is blocked even when the agent attempts to bypass the mediator                      |

::caption[Credential protection, operation permissions, and containment require separate evidence.]
::label[table:credential-control-properties]

Suppose an agent may read one workspace's events to calculate an activity count.
Keeping its credential hidden does not prevent an overly broad permission from allowing access to another workspace or a write operation.
The agent may also receive permitted data and send it through a separate network route.
Protecting the credential, restricting authenticated operations, and controlling that route address different failures.

For an optional version of the control-boundary audit, use a paper fixture or dummy service to follow these three failures.
Name the component that would refuse each action and what happens if the mediator is unavailable; a required check must not silently become permission to continue.
For executable checks, preserve the denied results and configuration as evidence for the tested paths; a paper analysis remains a proposed design.

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

## External contribution policies

Use this example when preparing an external issue or pull request.
The [shared course guidelines](/project/introduction/#guidelines-for-course-work) distinguish course evidence from a receiving project's submission rules.
The example below illustrates how private tooling, public authorship, and disclosure can be governed differently.

For example, the [Human Responsible policy template, version 1.0.0](https://ai-policy.dev/policies/human-responsible/1.0.0), permits private tooling while requiring public text written and posted by the contributor, understood and tested changes, and human follow-up.
It prohibits AI-disclosure notes and submissions from automated accounts.
These are requirements for projects that adopt the template.

Under that policy, a student can record private agent assistance in the course evidence while personally writing and posting the reviewed contribution text and owning the change.
Answer provenance questions truthfully, avoid false claims of human-only production, and respect a project's refusal of particular assistance or submissions.
Disclosure does not make a prohibited contribution acceptable; an external disclosure rule does not remove the course's evidence requirements.

## Choose a delegation environment

Choose the execution and control boundaries the exercise needs before choosing a product.
The [course environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) records the supported tool, version, model route, limits, and fallback for each course run.
A product can expose several of the patterns in :ref[table:fleet-tool-options]; its name alone does not identify the workflow being measured.

| Delegation pattern        | Where work is coordinated                                   | Controls to inspect                                                                         | Evidence to retain                                                            |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Separate local processes  | A local harness starts child processes                      | Inherited tools and credentials, process termination, shared files, and worktree boundaries | Child inputs and outputs, process status, tool calls, and integration changes |
| Managed child sessions    | A parent session delegates through a harness or service     | Child permissions, context and memory inheritance, nesting limits, and cancellation         | Parent–child identifiers, attempt outcomes, usage, and retained state         |
| Hosted repository task    | A service schedules work in a repository environment        | Repository access, network policy, credentials, checks, and merge authority                 | Task revision, environment configuration, changes, checks, and review outcome |
| Application orchestration | Application code or an API coordinates model and tool calls | Tool execution location, authorization, retries, budgets, and result acceptance             | Call graph, tool results, failures, usage, and accepted application outcome   |

::caption[Delegation boundaries to inspect when selecting a course environment.]
::label[table:fleet-tool-options]

For an optional code-reading exercise, Pi's [reference subagent extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts) makes process creation and result handling inspectable.
Record the source commit you read and trace one child from launch to completion or cancellation.
For a service-based contrast, the [Responses multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent) describes delegated model work and application tool execution; inspect which responsibilities remain with the caller.
These are entry points for examining mechanisms, not required installations or a ranking of current products.

Omnigent illustrates harness coordination: its open-source meta-harness wraps several agent harnesses behind a common session interface and documents composition, shared sessions, contextual policies, and local or remote sandbox execution :citep[zaharia2026omnigent].
Unity AI Gateway illustrates traffic governance: for model and MCP traffic routed through it, Databricks documents catalog-backed permissions, rate limits, budgets, provider routing and fallbacks, and usage records :citep[databricks2026unitygatewaydocs].
These are examples, not evidence that every fleet needs two products or exactly two control planes.
Both accounts are documented in Databricks-authored sources, their responsibilities overlap, and Omnigent was introduced as alpha; they are not independent evaluations of effectiveness.

For any option, inspect how child tasks inherit tools and credentials, whether concurrent writers are isolated, what state survives between runs, and how the execution trace is exported.
Persistent memory, remote execution, and external messaging must be included in the declared workflow when enabled; they can change both the comparison and the authority boundary.
Application-level agent orchestration has separate runtime users, data, and operational obligations.

## Complete the control-boundary review

For each consequential action, name the decision authority, mandatory enforcement point, granted scope, evidence returned, and conflict or outage rule.
Then follow one denied, failed, retried, cancelled, or successful attempt across every relevant system and confirm that it rolls up exactly once to an explicit delegated-run outcome.
Include a bypass check for any control the decision relies on.

## Optional fleet exercises

These extensions revisit the constraints and acceptance boundaries of the [fleet walkthrough](/chapters/agent-fleets/).
Choose one when project memory, a missing consumer obligation, or a human approval gate is relevant; completing all three is not required.
For any chosen exercise, add its findings to the existing fleet evidence rather than creating another submission.

### Retrieve guidance after a contract changes

An identifiable old statement may be useful history and wrong guidance for the current implementation.
Keep three questions separate: **provenance** identifies where a claim came from; **validity** concerns whether it still applies; **retrieval** selects material for the present task.

Use a small fixture with two revisions of an event-list endpoint:

1. In the earlier revision, the endpoint returns an array; in the current revision, it returns an object containing `items` and `nextCursor`.
   Preserve both contracts with their source revisions and status, but deliberately leave one searchable summary describing the old response as current.
2. Ask the agent separately what the earlier contract required and how a client should parse today's response.
   Require supporting source revisions and a client check against the current fixture.
3. Compare source inspection alone with source inspection plus retrieved project memory, keeping the task, model, tools, and starting code fixed in fresh sessions.
   Inspect whether the stale summary is retrieved, whether the contradiction is noticed, and which source controls the answer.
4. Record accepted behavior, stale claims, evidence recovered, retrieval cost, and the effort needed to correct or retire the summary.

Keep the historical contract available while preventing it from silently governing current work.
A timestamp or source link helps inspection but does not establish validity by itself.
Judge memory by the work it improves, including its initialization and maintenance cost.

### Check a contract against its consumers

Use the two-revision event-list fixture above, whose current response contains `items` and `nextCursor`.
A discoverable [contract](/concepts/#contract) can still leave out an obligation.
[Code Contracts](https://github.com/spolu/code-contracts) places identified requirements beside code, but its formatter checks syntax and duplicate identifiers rather than semantic compliance.
[Decision Engineering](https://github.com/hpark0011/decision-engineering) records intended decisions, their dependencies, enforcement, and verification; the record still needs checking against actual consumers and behavior.

Extend the fixture with a CSV export whose stated requirement is to include every event matching the selected filter.
Keep the data fixed and use enough matching events to require at least two pages.
Omit this consumer from the contract map and give it an implementation that reads `items` but ignores `nextCursor`.
The response-schema check passes, yet a check comparing exported event IDs with the independently defined expected set fails.
This is an invented teaching fault: it tests an incomplete current record as well as the earlier exercise's stale guidance.

Trace the missing obligation to the consumer, contract, [acceptance check](/concepts/#acceptance-criteria), and accountable owner.
Repair the export and update the map, then confirm that it includes every expected event exactly once.
Record missed obligations, false alarms, and the effort to maintain the records alongside the existing exercise notes.

### Test a human review gate

[Human Todos](https://arsctx.com/blog/human-todos/) proposes marking consequential changes for human review and blocking selected implementation steps until a human resolves them.
The marker makes a decision visible, but an unresolved-marker check cannot detect a marker the producing agent omitted.
Use the pattern to test the [authority boundary in the fleet plan](/chapters/agent-fleets/#map-authority-and-acceptance).

In a disposable branch or review fixture, declare that changing an existing endpoint's authorization or adding a new endpoint requires human review before acceptance.
Check both cases: a rule limited to modified existing handlers would miss the new endpoint.
The review obligation should come from an independently maintained change-scope rule, with a named owner for ambiguous cases, rather than only the producing agent's annotations.

Try three failures: leave a marker unresolved, omit a required marker, and remove a marker without human approval.
For each, identify the changed behavior, the rule that requires review, and the component that blocks acceptance.
Then supply an approval record tied to the reviewed revision and an authenticated human reviewer; change the relevant code again and confirm that the earlier approval no longer satisfies the gate.
The agent must not be able to satisfy the gate merely by editing its own marker or approval file.

Record missed review obligations, false alarms, review time, and interruptions alongside the accepted behavior.
Code outside a designated core can still expose data or alter permissions, so allocate review by effects as well as file or layer.
Independent scope checks can also be incomplete; passing these seeded cases establishes coverage of those cases, not every consequential change.
