# Obsidian content review — 2026-09-24

## Recommendation

Three focused additions would improve the book: distinguish participation from competence, make credential-control boundaries concrete, and extend the existing contract-change exercise to expose missing obligations.
Most of the intake reinforces material already present.
Keep the additions within existing sections and exercises; they do not justify new required deliverables or a larger course scope.

| Priority | Addition                                                                            | Best location                                              | Size                                              |
| -------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| 1        | Correct output, retained competence, and valued participation are separate outcomes | Chapter 2, before the navigator exercise                   | Two paragraphs and one optional reflection prompt |
| 2        | Credential custody, action authorization, and containment need separate evidence    | Appendix D, “Trust boundaries”                             | A small comparison table and one example          |
| 3        | Discoverable contracts can still omit or misstate an obligation                     | Chapter 7, existing contract-change exercise               | One additional variant                            |
| Optional | Measured runtime improvement does not identify the AI contribution                  | Chapter 9, “Separate observation, inference, and proposal” | A short external case                             |

These recommendations follow the existing [first-run scope guidance](first-run-course-improvements.md): strengthen explanation and evidence around the course already designed.

## Review scope

The repository baseline was `7abb5be`, with a clean working tree.
The [September 15 review](obsidian-content-review-2026-09-15.md) records four additions already implemented; those are part of this review's baseline.

Obsidian was accessed through MCP.
The September 24 intake and quality audit report **28 new sources and one material refresh**, bringing the processed collection to 411 notes.
I screened the metadata and dated analyses of all 29 entries, read selected underlying captures and source passages, and compared the candidates with Chapters 2 and 7, Appendices A and D, relevant measurement and recap passages, and the shared engineering-session requirements.
The review also used the cognitive-oversight synthesis, tension C29, and experiment proposals E7, E20, E24, E31, and E36.
Those experiments are proposals, not results.

Vault entry points:

- `Clippings/_Analysis/Clipping Analysis 2026-09-24.md`
- `Clippings/_Analysis/Dataset Quality Audit 2026-09-24.md`
- `Clippings/_Analysis/Synthesis/Cognitive Debt and Human Oversight.md`
- `Clippings/_Analysis/Contradiction and Tension Map.md`
- `Clippings/_Analysis/Experiment Backlog.md`

Primary-source checks covered Agentic Alienation, The Overhang, the Code Contracts and decision-engineering repositories, fnox's credential-proxy documentation, Claw Patrol's security model, Cloudflare's audit-workflow README, both new arXiv papers, and Lemire's optimization article.
Lemire's live article was retrieved through Obsidian's MCP fetch after the web reader failed.
The Code Contracts landing page was unavailable to the web reader; its repository supplied the primary documentation.
No benchmark, security audit, software installation, or experiment was performed.
“New” refers to this intake and its value relative to the current book, not necessarily the source's publication date.

## 1. Participation can matter even when quality and competence hold

**Sources:** Agentic Alienation; The human is the loop; The Overhang; C29/E36.

[Agentic Alienation](https://www.lorenstew.art/blog/agentic-alienation) distinguishes understanding an accepted result from experiencing the work of making it.
Read it alongside [The Overhang](https://www.oneusefulthing.org/p/the-overhang), which argues that human knowledge, taste, and initiative can enable previously impractical projects through AI.
These are compatible practitioner perspectives: expanded capability does not settle which parts of a task someone wants to delegate.

**Current coverage:** [Chapter 2](../book/01_establish/02_scalable_development.md#when-generation-outruns-comprehension) already covers comprehension, review, ownership, and delayed unaided performance.
Its Kirjolab case already illustrates expanded project scope.
The [shared engineering sessions](../specifications/00_common_project.md#shared-engineering-sessions) already preserve prediction, discussion, and rotating responsibilities.
The missing distinction is the value of participation even when both artifact quality and retained competence are satisfactory.

**Suggested insertion:** Before “Write with an agent as navigator,” separate three questions:

| Outcome              | Useful question                                             | Evidence                                            |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Accepted output      | Does the result meet the intended need?                     | Independent behavioral checks and acceptance review |
| Retained competence  | Can the person explain and change it later?                 | Delayed unaided explanation or repair               |
| Valued participation | Which parts of the work does the person want to experience? | Their stated purpose, preferences, and reflection   |

Proposed wording:

> A workflow can produce acceptable software and leave its owner able to explain it, while still removing an activity they wanted to experience.
> Learning, investigating with colleagues, and enjoying implementation can be purposes of the work.
> Decide which parts to delegate in light of those purposes as well as the cost and quality of the result.
> Finishing the agreed work can be a reason to stop, even when the agent has capacity for another task.

Add one optional reflection to the existing navigator exercise: identify an activity the student wanted to retain, whether the assistance mode preserved it, and what mode they would choose next time.
Use the existing learning diary or discussion; do not grade enjoyment or require private well-being disclosures.
Do not import E36's full research protocol into the course.

**Evidence limit:** These essays motivate a distinction and a design choice.
They do not establish universal harm, measured deskilling, or a causal well-being effect.
The informal survey cited by Stewart cannot supply a population estimate.

## 2. Hiding a credential does not settle what the agent may do

**Sources:** Refreshed fnox capture; Claw Patrol.

[fnox's proxy documentation](https://fnox.jdx.dev/guide/proxy) describes substituting credentials into matching requests while supplying placeholders to the child process.
It explicitly distinguishes this mechanism from an operating-system sandbox.
[Claw Patrol's security model](https://clawpatrol.dev/docs/security-model/) likewise separates injected-credential protection from broader host access and network containment.
These are documented mechanisms and boundaries, not independent evidence that a deployment is secure.

**Current coverage:** [Appendix D](../book/04_appendices/D_agent_system_security.md#separate-task-control-from-resource-access) already distinguishes decisions from enforcement, tests bypasses, and discusses least privilege and trace reconciliation.
Another general explanation of gateways would duplicate it.
The useful addition is a concrete comparison under “Trust boundaries.”

| Property             | What must be established                                                            | What it leaves open                                        |
| -------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Credential custody   | The agent cannot obtain the protected credential through its effective access paths | Whether an authenticated operation is appropriate          |
| Action authorization | The permitted service, resource, method, and operation match the task's authority   | Whether other filesystem or network paths remain available |
| Containment          | Process, filesystem, and network controls constrain the agent's effective reach     | Whether an allowed operation achieves the intended goal    |

**Suggested example:** An agent receives permission to read a workspace's events through a credential-injecting proxy.
The credential may stay hidden while the agent still reads too many records, uses an overly broad write permission, or sends returned data through another network route.
Each failure requires its own control and evidence.

Extend the existing boundary audit with a paper fixture or dummy service: identify the checks that would reject an out-of-scope operation, protect the credential source, and prevent a forbidden direct connection.
State what happens if the mediator is unavailable.
This need not install either product or handle real credentials.

**Version caution:** The live Claw Patrol page differs from the captured analysis in some implementation detail.
Use its current explicit limits and pin a revision before publishing product-specific behavior; do not copy the clipping's detailed port or passthrough claims into an unversioned recommendation.
The durable lesson is the separation of controls.

## 3. Extend contract retrieval into obligation coverage

**Sources:** Code Contracts; decision-engineering; E7.

[Code Contracts](https://github.com/spolu/code-contracts) makes requirements discoverable beside code, with stable identifiers and ownership metadata.
Its formatter checks syntax and duplicate identifiers, not semantic compliance.
[Decision Engineering](https://github.com/hpark0011/decision-engineering) connects intended decisions, authoritative inputs and outputs, dependencies, enforcement, and verification.
Both offer useful representations; neither demonstrates that every relevant requirement has been captured.

**Current coverage:** [Chapter 7's contract-change exercise](../book/03_compare/07_agent_fleets.md#optional-exercise--retrieve-guidance-after-a-contract-changes) already tests stale retrieval using an endpoint that changes from an array to an object with `items` and `nextCursor`.
The chapter also assigns contract ownership and tests omitted review markers.
A separate specification framework or full new lab would add substantial overlap.

**Suggested variant:** Keep that fixture, but add a second consumer omitted from its contract map, such as a CSV export that must include every selected event.
After pagination is introduced, make the consumer accept the new response shape but silently export only the first page.
The response-schema check passes; an independently specified multi-page export check fails.
Ask students to locate and update the obligation, affected consumer, acceptance check, and accountable owner.

This adds a different failure from retrieving an old response shape: the current record itself is incomplete.
Record missed obligations, false alarms, and maintenance effort in the existing exercise notes.
The scenario is a proposed teaching fixture, not a finding from either repository.

## 4. Optional: a positive performance case with bounded attribution

**Source:** [A summer of AI optimization](https://lemire.me/blog/2026/09/22/a-summer-of-ai-optimization/).

Lemire reports rebuilding library revisions on one machine and measuring workload-specific runtime gains.
He also explicitly says he cannot establish how much AI contributed to every change and discloses an advisory relationship with one contributing tool provider.

**Current coverage:** [Chapter 9](../book/03_compare/09_recap.md#separate-observation-inference-and-proposal) already teaches the distinction between an observation and its explanation.
This is a useful external illustration with direct relevance to web dependencies, rather than another new concept.

**Suggested box:** Separate “these library revisions ran faster on the reported workload and machine” from “AI caused this improvement.”
The first is a maintainer-reported measurement; the second requires a counterfactual that this article does not supply.
Ask what extra evidence would be needed to compare development effort or attribute the gains.
Avoid transferring a library microbenchmark speedup to an application's end-to-end latency.

This is the strongest optional case if a concrete example is wanted alongside the three additions above.

## Material that mostly reinforces existing coverage

| Source or cluster                                                          | Assessment                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Closed-Loop Control Architecture; AI Eats the Verifiable First           | Further reading for Appendix A's existing distinction between satisfying a grader and meeting the real goal                                       |
| Cloudflare security-audit-skill                                            | An optional example of discovery, validation, and record checking for the existing review exercise                                                |
| Interview with Niels Lohmann                                               | Reinforces compatibility, stable acceptance standards, and defect detection already covered by Chapter 2 and the mutation lab                     |
| What Is an Agent Harness?; My 2026 guide; pstack; office-of-clones harness | Existing harness, authority, and fleet material supplies the durable concepts without expanding product inventories                               |
| dim-factory                                                                | Documented fail-open and bypass cases can supplement the human-gate exercise; Appendix D already covers missing evidence and deliberate retention |
| AI Policies: Help or Hindrance?                                            | Instructor preparation and the environment sheet are better places to check whether students can understand and use the assigned policy           |
| Ponytail; Bonsai 2 27B                                                     | Possible evaluation candidates under the book's existing baseline, configuration, acceptance, and cost controls                                   |
| Stop Using OpenCode                                                        | Preserve inspected revisions and later corrections rather than presenting a current-release security verdict                                      |
| The human is the loop; Fuck it, make it anyway; Ky Decker's account        | Supporting perspectives for recommendation 1, without treating more anecdotes as stronger empirical evidence                                      |
| No Meat Proxy                                                              | Repeats an argument already represented in the vault and book                                                                                     |
| When AI writes almost all code                                             | Reinforces review capacity and changing responsibilities; September paywall removal does not make the January article a new forecast              |
| How To Write With An LLM                                                   | An optional critique-assisted writing method with limited need in the scalability narrative                                                       |
| Posters; electronic design automation; academic sorting                    | Outside the core course scope, with general artifact-versus-value lessons already covered                                                         |

The [closed-loop paper's validity section](https://arxiv.org/html/2609.19710v1) is particularly useful reading: success is measured with the readability quantity being optimized, while entity and number retention does not establish unchanged meaning.
Its different generation and adaptation campaigns should not be presented as a controlled estimate of better human comprehension.
Appendix A already has both grader-health material and a research example in which the scoring process is not independent.

The [Cloudflare audit README](https://github.com/cloudflare/security-audit-skill) distinguishes confirmed, unresolved, and rejected findings.
Fresh reviewers do not establish independent ground truth, and the union of repeated findings is not the set of all real vulnerabilities.
The proposed E20 comparison would need matched budgets and independent adjudication before supporting an effectiveness claim.

The [AI policy paper](https://arxiv.org/html/2609.16496v1) draws on 19 developer interviews recruited through professional social media.
It supports examining policy usability and ambiguity, with the limits of a small self-selected sample and reported perceptions rather than causal productivity or security measurements.

## Implemented for review

All four recommended additions were incorporated on September 24:

- [Chapter 2](../book/01_establish/02_scalable_development.md#choose-what-to-participate-in) separates accepted output, retained competence, and valued participation, with an optional reflection in the existing navigator exercise.
- [Appendix D](../book/04_appendices/D_agent_system_security.md#separate-credential-custody-action-authorization-and-containment) adds a control comparison and a workspace-event example, with an optional paper or dummy-service audit.
- [Chapter 7](../book/03_compare/07_agent_fleets.md#optional-exercise--retrieve-guidance-after-a-contract-changes) extends the contract exercise with an omitted CSV consumer that ignores pagination.
- [Chapter 9](../book/03_compare/09_recap.md#separate-observation-inference-and-proposal) adds Lemire's library-performance case with its attribution limits.

The bibliography now includes the Stewart, Mollick, and Lemire essays; the tool documentation is linked at the relevant passages.
The additions create no new required project deliverables.
The Obsidian vault was not modified.
