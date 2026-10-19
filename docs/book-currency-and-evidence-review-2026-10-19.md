# Book currency and scientific evidence review — 19 October 2026

## Baseline and scope

The reviewed Obsidian additions were committed as [`125ccb9`](https://github.com/bebraw/scalability_book/commit/125ccb9) and pushed to `main`.
The [Cloudflare build](https://dash.cloudflare.com/3118f9560af77a0819ba24e1a14bcc9e/workers/services/view/scalability-book/production/builds/22abf84b-ec76-4b12-8840-1087f911b4f2) and all four [companion CI jobs](https://github.com/bebraw/scalability_book/actions/runs/39233904314) passed.
Live browser verification confirmed the changed chapter passages, new activity, separate agent/discussion resources, and concept-graph discovery.

This audit screened the published reading for aging product assumptions, stale terminology, internal references, citation keys, and the relationship between claims and evidence.
It checked generated navigation and public external URLs, then inspected selected scientific sources and their current versions.
It is not a replication of the studies or a line-by-line revalidation of all 93 bibliography entries.
The recommendations below have not been applied to the manuscript.

## Findings, in priority order

### 1. Publish a reader-accessible environment sheet and replace private source links

**High priority: public readers cannot follow required setup guidance.**

The repository is private, confirmed through the authenticated GitHub repository API.
Unauthenticated HEAD and GET requests return `404` for four destinations used in the published material:

- `https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md`
- `https://github.com/bebraw/scalability_book/tree/main/labs/concern-directed-mutation`
- `https://github.com/bebraw/scalability_book/tree/main/labs/playwright-journey`
- `https://github.com/bebraw/scalability_book/tree/main/labs/skill-adoption`

The environment-sheet link appears in the [introduction](../book/00_introduction.md#one-application-three-development-systems), [Chapter 7](../book/03_compare/07_agent_fleets.md#choose-a-coordination-structure), [Appendix D](../book/04_appendices/D_agent_system_security.md#choose-a-delegation-environment), and the [project introduction](../specifications/00_introduction.md).
There is no generated public environment-sheet page.
The source file is also a publication template with assignments still marked “To be announced”; its own contract requires a completed sheet before each phase begins.

**Recommended change:** publish the existing sheet through the book's established document pipeline and point readers to that public route.
Keep the distinction between the template and an instructor-completed course-run assignment explicit.
For labs, use the working public ZIPs or publish browsable source alongside them.
All three `/downloads/labs/<name>.zip` URLs returned `200` on the live site.
Changing repository visibility is unnecessary for either correction.

### 2. Qualify the recommendation to generate a broad instruction file

**Medium priority: an operational recommendation needs a scientific counterweight.**

[Chapter 7's preparation instructions](../book/03_compare/07_agent_fleets.md#prepare-the-project-before-adding-agents) ask an agent to propose an `AGENTS.md` containing a broad repository overview and checklist.
The text correctly requires human review, but does not ask whether this extra context improves the workflow.

[Gloaguen et al., version 3, September 29, 2026](https://arxiv.org/html/2602.11988v3) report no significant improvement in task resolution against no context file, while generated files increase average inference cost by 20–23% in their tested settings.
Developer-provided files outperform generated ones, but their improvement over no file is not statistically significant.
The evaluation focuses on Python issue resolution; it does not establish the value of safety policy, maintainability, or every project's unusual tooling.

**Recommended change:** retain necessary project policy and commands, link to owning documentation, and distinguish those obligations from a performance intervention.
Ask readers to evaluate optional generated guidance on representative tasks with and without it, preserving mandatory access and safety constraints in both conditions.
Use version 3's qualified result rather than repeating version 1's stronger negative interpretation.

### 3. Point the imported-capability warning at its actual treatment

**Low priority: a valid URL sends the reader to an indirect destination.**

[Chapter 2, “Reuse practices without cloning the whole project harness”](../book/01_establish/02_scalable_development.md#reuse-practices-without-cloning-the-whole-project-harness), says the Agent Fleets chapter develops the security implications of imported capabilities.
The focused dependency-review and trust-boundary treatment actually lives in [Appendix D, “Imported capabilities are development dependencies”](../book/04_appendices/D_agent_system_security.md#imported-capabilities-are-development-dependencies).
Chapter 7 mainly develops coordination and links onward.

**Recommended change:** link that sentence directly to Appendix D and retain Chapter 7 links where coordination is the subject.
This is a semantic reference error; an HTTP or fragment checker cannot detect it.

### 4. Give the concept introduction and Coding agent card distinct IDs

**Medium priority: the published concept page contains an ambiguous accessible-name reference.**

In [the concept renderer](../scripts/lib/concept-html.ts), the “Explore with your own agent” heading uses `id="concept-agent-title"`.
The Coding agent concept card independently generates the same ID and uses it in `aria-labelledby`.
The duplicate exists in both generated HTML and the live `/concepts/` response.
The first matching element is the introduction heading, so the card's label reference does not uniquely identify “Coding agent.”

**Recommended change:** give the introduction heading a distinct ID and update its section's label reference, preserving the card's existing concept-specific ID.
Verify the Coding agent card's accessible name after opening it, as well as ID uniqueness in the generated page.

### 5. Resolve one unused bibliography entry

**Low priority: editorial residue, not a broken rendered citation.**

`lipsanen2026shiftup` remains in [bibliography.bib](../bibliography.bib), but no published book or case-study Markdown cites it.
All 92 distinct citation keys used in that reading have definitions; the bibliography contains 93 entries.

**Recommended change:** remove the unused entry unless there is an intended passage that needs it.
An unused bibliography record does not justify adding another citation or expanding the argument by itself.

## Scientific evidence worth adding

These sources would complement the personal and company cases with controlled experiments or systematic observations.
Their findings support bounded claims; they do not prove the author's case-specific counterfactuals or a universal best workflow.

### Retained competence: a programming experiment and a classroom trial

[Shen and Tamkin, How AI Impacts Skill Formation, version 2](https://arxiv.org/html/2601.20245v2), randomized AI access for 52 programmers learning the unfamiliar Trio library.
AI access reduced immediate library-understanding scores without a statistically significant average completion-time benefit.
The interaction-mode subgroups were observed, not randomly assigned; the study therefore does not establish that requesting explanations causally protects learning.
It measures a short session, not long-term professional skill loss.

[Bastani et al., PNAS 2025](https://doi.org/10.1073/pnas.2422633122), studied nearly a thousand high-school mathematics students.
Both AI conditions improved assisted practice performance, while unrestricted assistance reduced subsequent unaided performance; teacher-designed tutor safeguards largely removed that harm without establishing a positive unaided effect.
Mathematics and the tested tutoring design limit transfer to university programming.

**Placement:** a short evidence paragraph in [Chapter 2's assistance choices](../book/01_establish/02_scalable_development.md#choose-what-to-participate-in), with the methods and limits in [Appendix A's retained-competence section](../book/04_appendices/A_evaluating_agentic_workflows.md#evaluate-assistance-and-retained-competence).
These studies support measuring unaided understanding separately from assisted output; they do not justify forcing one assistance mode on every learner.

### Human oversight: test the decision, not just the presence of approval

[Buçinca, Malaya, and Gajos, CSCW 2021](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf), compared interface interventions with 199 participants making nutrition decisions with AI assistance.
Cognitive forcing reduced reliance on incorrect suggestions relative to simple explanatory interfaces, but the most effective designs received less favorable subjective ratings.
This is evidence about the tested decision task, not a demonstrated security guarantee for deployment approvals.

**Placement:** Appendix D's warning about mechanical approval and Chapter 2's explanation challenge.
Use it to motivate measuring correct acceptance, correct rejection, effort, and usability when designing a review interaction.
An explanation or extra click alone should not be described as effective oversight.

### Multi-agent failures: expand the evidence beyond small integration examples

[Cemri et al., NeurIPS 2025](https://proceedings.neurips.cc/paper_files/paper/2025/hash/b1041e52d3be19f0a9bc491657488e4a-Abstract-Datasets_and_Benchmarks_Track.html), provide over 1,600 annotated traces from seven frameworks and a 14-mode taxonomy covering system design, inter-agent misalignment, and verification.
The taxonomy was developed through expert analysis of 150 traces; large-scale annotation also uses an LLM judge.
It offers failure categories to investigate, not an industry-wide failure rate or proof that one role template fixes coordination.

**Placement:** Chapter 7's correction lab and Appendix A's coordination research.
Map one observed failure to the taxonomy, then require the existing behavioral check to establish whether the repair worked.
This complements the practitioner's reviewer-disagreement field note and the small CodeCRDT example.

### Production failures: add systematic evidence for error-path testing

[Yuan et al., OSDI 2014](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/yuan), examined 198 severe, developer-confirmed failures in five distributed data systems, including 48 classified as catastrophic.
Incorrect handling of explicitly signaled errors featured in 92% of that catastrophic subset.
That is not a finding that 92% of all outages are preventable by unit tests; the paper separately estimates preventability and discusses its sampling limits.

**Placement:** Chapter 6's incident interpretation or recovery discussion.
Connect one injected dependency error to the application's actual fallback, retry, and durable-state behavior.
The paper supports examining how a component failure propagates through error handling, rather than assuming redundancy or a happy-path test establishes recovery.

### Productivity: include contrasting experiments with their dates attached

[Becker et al.'s early-2025 randomized study](https://arxiv.org/abs/2507.09089) assigned AI access across 246 tasks completed by 16 experienced open-source developers and found 19% longer completion time.
Its familiar mature repositories and early-2025 tools differ from the settings in the book's Cui et al. field experiments.

Include [METR's February 2026 follow-up](https://metr.org/blog/2026-02-24-uplift-update/) if adding that result: the later experiment's selection effects and concurrent-agent timing problems prevented a reliable estimate of the current effect.
Neither result should become a present-day blanket ranking of assisted and unassisted development.

**Placement:** the evidence table under “When generation outruns comprehension,” or a short comparison beside it.
Use differences in task, experience, tool generation, outcome, and selection to explain why the studies cannot be averaged into one productivity percentage.

## Material checked and retained

- [No-Vary-Search](https://httpwg.org/http-extensions/draft-ietf-httpbis-no-vary-search.html) is still an Internet-Draft; the live draft is dated October 18, 2026.
  Appendix C's draft qualification and campaign-parameter example remain appropriate.
- The [latest MCP specification](https://modelcontextprotocol.io/specification/latest) resolves to revision `2026-07-28` and describes stateless, self-contained requests.
  Appendix C's distinction between protocol state and application state remains appropriate.
- [DORA's current guide](https://dora.dev/guides/dora-metrics/) still uses five delivery metrics; Chapter 3's count and per-service interpretation remain appropriate.
- [Loop Engineering version 2](https://arxiv.org/abs/2608.21884v2) still describes the controlled study as planned and the paper as under review.
  The book correctly separates its adoption evidence from outcome evidence.
- The inspected formal-model passages preserve the assumptions and denominators for Little's Law, Amdahl's bound, series reliability, and the conditional detection/repair model.
  No additional mathematical correction was identified in this pass.
- Older incidents, named-model field notes, and explicitly pinned case snapshots remain useful historical evidence; age alone is not a reason to replace them with current product recommendations.

## Verification and limits

- Inspected 74 canonical generated HTML pages, excluding local numbered duplicate copies.
- Checked 8,215 same-site link occurrences for destinations and fragments; none were missing.
- Checked 234 distinct external URLs without fragments: 207 returned `200`, one `206`, nine `202`, thirteen `403`, and four `404`.
  The four `404`s were confirmed with GET and traced to the private repository.
  The `202` and `403` responses remain inconclusive access checks, not evidence that the sources disappeared.
- HTTP checks do not validate external fragments, detect every soft error page, or establish that a source supports a claim.
  Semantic checks were performed for the findings and selected sources described above.
- Citation-key inspection found no missing definitions and one unused entry.
- Local link, external status, and duplicate-ID records are retained under `.local/audits/2026-10-19/`.
  Live browser checks independently confirmed the new deployment, duplicate concept ID, and working lab downloads.

The highest-value next pass is to repair public resource access and the ambiguous concept label, narrow the generated-context recommendation, and add the retained-competence and coordination evidence.
The remaining studies can strengthen existing explanations without new required course deliverables.
