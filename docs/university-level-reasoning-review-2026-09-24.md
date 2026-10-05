# University-level reasoning review — 24 September 2026

Reviewed against d35936b, after the simplification pass.
This is a prioritized review of the core argument, project design, assessment, and selected demonstrations.
The findings below describe that reviewed revision; their original line references are historical.
Five primary revisions and the four smaller corrections have been applied in the working tree for review.
The additional pass requirements proposed in finding 2 were withdrawn after review to keep grading manageable with a large cohort and limited teaching resources.

Follow-up on 5 October: the [current rubric](../specifications/grading.md#mandatory-individual-work) adds mandatory individual engagement using already-scored lecture activities and phase assessments.
The earlier oral check and separate essential-outcome assessment remain withdrawn; the [course comparison and rationale](individual-assessment-requirements-2026-10-05.md) explain the later change.

## Implementation record

- Replaced the friction demo's invented coefficients and risk predictions with entered stage observations, missing-data handling, acceptance status, intervention cost, and an evidence export.
- Restored the original points-based pass requirements after review: at least 10 points per project and 50% overall, with 153 available points and the 135-hour workload plan unchanged.
- Published the assessment rubric at `/project/grading/` and preserved fragments when converting specification links to web routes.
- Made the three builds explicit case studies and specified one bounded paired task within existing Compare work.
- Defined the closed-loop baseline, consistent observation boundaries, deadlines, censored and unfinished outcomes, and a conditional arrival-controlled overload/recovery protocol.
- Derived reliability from complete attempt counts, explained undefined conditional rates, and showed why dependence invalidates a product of marginal rates.
- Added the real-time definition and read/write indistinguishability argument for CAP, distinguishing it from ACID atomicity and domain invariants.
- Corrected origin terminology, browser measurement labels, the interval decision rule, and the two anecdotal causal explanations.

The paired task requires matched limits or a trace alternative where access differs.
It uses existing Compare work; no new report or fourth application is required.

## Verification

- The site build and type/HTML validation pass, including the rendered assessment page.
- All 25 affected browser checks pass, including the audit's missing-versus-zero handling, adverse results, introduction costs, failed acceptance, evidence export, and mobile WebKit interaction.
- The 22 rendered chapter, appendix, and project pages have no missing local link targets or fragments and no uneven table rows.
- Desktop, dark-theme, and narrow-screen audit layouts were inspected; the audit had no detected axe accessibility violations, browser errors, or narrow-screen overflow.
- Two stale layout tests were updated to follow the current citation and the formal-model table's existing appendix location.

Generate the working-copy review with `npm run review`; the changes remain uncommitted for editorial review.

The main weakness is uneven rigor between the prose and the mechanisms that teach or assess it.
The chapters frequently distinguish observation, inference, and proposal correctly, but some demonstrations produce unsupported quantitative conclusions.
The rubric assesses the learning outcomes through points; a passing total is not a separate certification of every outcome.
University-level improvement should emphasize explicit assumptions, valid measurement, derivation, counterexamples, and defensible decisions.

## 1. Remove unsupported quantitative authority from the friction demo

**Priority: high — unsupported inference and misleading presentation.**

Locations: docs/friction-audit-estimate-basis.md:14, site/scripts/friction-audit-demo.ts:53, and site/includes/friction-audit-demo.html:72.

The rationale describes the assistance multipliers as calibrated against productivity studies.
The implementation assigns separate speed multipliers to setup, comprehension, editing, and testing, then assigns fixed Low/Medium/High rework risk by assistance mode.
Good instructions and tests produce the Low label regardless of the selected task or friction values.
The exported artifact also reports likely rework loops, and an arbitrary 18-minute savings threshold produces an improvement recommendation.

The cited studies establish effects in particular experimental settings.
Peng and colleagues measured a standardized HTTP-server task; Becker and colleagues randomized AI access for work in familiar mature repositories.
Those findings do not identify the demo's stage-specific coefficients or risk categories.
Placing invented coefficients between two aggregate results is not empirical calibration.
Sources: [Peng et al.](https://arxiv.org/html/2302.06590v1), [Becker et al.](https://arxiv.org/html/2507.09089v2).

The chapter says the goal is not exact minutes, but the interface and export nevertheless give minutes, likely loops, and categorical risk.
The example consequently makes the preferred workflow win by construction.

**Recommended revision:** retain the change-path audit, but replace predicted minutes and risk labels with observed stage times, evidence, and an explicit improvement hypothesis.
If a simulation remains, expose its assumptions as editable fictional inputs and include a case where maintaining instructions or tests costs more than it saves.
Remove the calibration claim and unsupported forecast language.
Keep the productivity papers as contrasting empirical cases, separate from the simulation's parameter source.

**Completion criterion:** a student can explain where every displayed quantity came from and can produce a result that challenges the proposed improvement.

## 2. Retain manageable, points-based assessment

**Decision after review: additional pass requirements withdrawn.**

The initial proposal added category minima, separate essential Compare outcomes, an individual oral check, and targeted reassessment.
Those requirements would add grading and resubmission work that is unsuitable for a large cohort with limited teaching resources.

The course retains its original rule: at least 10 points from each project and at least 50% of the available total points.
Reasoning, architecture, model use, scaling, deployment, and individual contribution remain part of the existing scoring criteria.
Weak or missing evidence reduces the relevant score rather than triggering a separate pass requirement or mandatory correction cycle.
The added oral check and reassessment arrangements have been removed from the rubric, common specification, and course plan.

## 3. Separate the three-build case comparison from causal identification

**Priority: medium-high — experimental-design limitation.**

Locations: specifications/02_challenge.md:72, specifications/03_compare.md:129, and specifications/03_compare.md:217.

The book already names practice effects, hardware, stack, and harness differences.
Appendix A also gives sound advice on paired task outcomes.
The remaining issue is what the required three-build design can distinguish: model, orchestration, accumulated knowledge, design decisions, and time move together.
One fresh build per phase does not identify the contribution of each factor.
A caveat is necessary, but it does not provide the missing comparison.

The three builds remain useful as engineering case studies.
Their observations support statements about what happened under the recorded configurations and can motivate explanations to test.
They should not be treated as effect estimates for model capability or orchestration.

**Recommended revision:** make the case-study status explicit in the assignment's central question.
For a small controlled contrast, reuse a frozen repository revision and one bounded task, hold the task, acceptance checks, model where appropriate, and budget constant, then compare single-agent and fleet execution in fresh copies.
Counterbalance condition order across groups where practical.
Use instructor-supplied paired traces when access or workload makes an extra run impractical.
This can replace part of the existing comparison exercise; it does not require a fourth application.
A tiny probe still supports only a local, exploratory conclusion.

**Completion criterion:** students distinguish observations about A/B/C from the narrower contrast that provides evidence about one changed factor.

## 4. Specify the load generator and observation boundary

**Priority: medium-high — measurement design.**

Locations: specifications/00_common_project.md:292 and book/01_establish/03_benchmarking.md:13.

The baseline fixes an operation mix, counts, concurrency, and repetitions, but does not specify whether new operations arrive independently or only when earlier ones finish.
A conventional fixed-client runner slows its own arrival rate when the application slows.
An externally scheduled arrival stream can continue to create demand during the same slowdown.
These are different experiments; the open/closed distinction can materially change results even with otherwise similar workloads.
See [Schroeder, Wierman, and Harchol-Balter, Open Versus Closed](https://www.usenix.org/conference/nsdi-06/open-versus-closed-cautionary-tale).

The adapter can also use a browser, application API, or another boundary.
Unless the comparison holds that boundary constant or separates its results, one implementation's timing can include browser rendering while another's ends at an API response.
The short profiles are useful baseline probes, but concurrency 16 alone does not define the arrival process or duration of a production burst.

**Recommended revision:** declare a closed or open arrival model, timing start/end, timeout policy, and treatment of unfinished and rejected work.
Keep comparable boundaries across phases.
Retain the inexpensive baseline, then use a bounded rate-controlled overload/recovery exercise when the claim concerns sustained incoming demand.
Record offered, admitted, and completed work separately, along with queue growth and latency.
Explain when a small sample cannot support a useful tail estimate; more reported decimal places do not improve that evidence.

**Completion criterion:** students can explain how the generator itself could hide overload and can distinguish faster successful responses from fewer admitted operations.

## 5. Correct the reliability model's estimation instructions

**Priority: medium-high — statistical denominator error in the wording.**

Location: book/04_appendices/E_scalability_models.md:77.

The instruction to estimate C, D, and K from repeated accepted outcomes risks conditioning on success while estimating the mechanisms that determine success.
Accepted final outcomes alone cannot reveal undetected errors, detected-but-unrepaired failures, or the initial correctness of a subsequently repaired step.

For the stated model, define the conditional denominators explicitly:

- C: initially correct steps divided by all eligible step attempts.
- D: detected initial errors divided by all initial errors.
- K: successful repairs divided by detected initial errors.

Initial correctness and missed errors require independent adjudication; a workflow's own acceptance label is insufficient.
A zero denominator leaves a rate unestimated rather than proving perfection.
Keep rejected, safely stopped, failed, and unresolved outcomes visible, and explain how missing adjudication limits the estimate.

**Recommended revision:** add a small counted example deriving the conditional rates and then the completion probability.
Keep the independent-series assumption explicit when multiplying across steps.
Show one shared-cause failure to demonstrate why correlated steps defeat a naive product estimate.

**Completion criterion:** students reconstruct the rates from a complete outcome table and explain why a success-only sample cannot supply them.

## 6. Give the central formal ideas a short worked argument

**Priority: medium — precision and depth of explanation.**

Location: book/03_compare/08_scaling.md:165.

The CAP section appropriately avoids the usual choose-any-two slogan.
However, its definition of atomic consistency as one current order omits the decisive real-time constraint.
A total ordering alone is insufficient: operations must appear to take effect between invocation and response, with completed operations preceding later non-overlapping ones.
See [Gilbert and Lynch, sections 2.1 and 3.1](https://www.cs.princeton.edu/courses/archive/spr22/cos418/papers/cap.pdf).

**Recommended revision:** introduce linearizability by name and add a tiny read/write history:
a write completes on one side of a partition, then a read begins on the other side.
Explain why the isolated reader cannot distinguish that execution from one where the write never happened.
A response that preserves one guarantee then violates the other.
Connect this argument to the transition lab while distinguishing linearizability from the application's particular lifecycle invariant and from ACID atomicity.

The broader editorial pattern should be one derivation, one boundary case, and one application for a central model.
Little's Law and Amdahl already provide a useful start.
Strengthening a few such examples would add more analytical depth than expanding the catalog of platforms or techniques.

**Completion criterion:** a student can construct the counterexample and identify exactly which assumption or guarantee changes the conclusion.

## Smaller corrections and targeted removals

### Distinguish a web origin from an origin server

book/02_challenge/04_architecture.md:24 defines an origin as an authoritative source.
For HTTP URI terminology, an origin is the normalized scheme/host/port tuple; an origin server serves the resource.
CDN usage sometimes shortens origin server or backend to origin, which should be stated rather than merged with the web-security concept.
[Source: RFC 9110, section 4.3.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.3.1).

### Describe the browser measurement actually implemented

book/01_establish/03_benchmarking.md:64 claims measurement through the next painted frame.
site/scripts/browser-performance-workbench.ts:242 waits for two animation-frame callbacks.
Those callbacks are part of the rendering schedule, not a timestamp proving that pixels were presented.
The instrumented longest slice also covers the demo's measured JavaScript segment, not every rendering task.
Use accurate proxy wording or an appropriate rendering measurement.
[Source: HTML rendering algorithm](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering).

### Qualify the interval-based decision rule

book/04_appendices/A_evaluating_agentic_workflows.md:177 presents an interval wholly beyond a threshold as the only support for a local decision.
That can be one predeclared conservative decision rule, but it is not the definition of a justified engineering decision.
Choices under uncertainty also depend on consequences, reversibility, cost, and the value of another measurement.
State the chosen rule and its rationale, and distinguish evidence for a claimed effect from the decision to run a reversible trial.

### Keep personal experience, but mark untested explanations

book/02_challenge/06_reality.md:52 predicts that the preferred alternative architecture would make the system easier to understand.
That is a reasonable hypothesis, but the reported caching incident does not test that counterfactual.
Likewise, the speed-blindness field note in Chapter 1 moves from personal experience to explaining differences between people's AI experiences.
Keep the experience and preference; identify the proposed mechanism and a check that could challenge it.
Remove general explanatory claims that the anecdote cannot support.

## Editorial priorities

Start with the friction demo and assessment minima, then strengthen the comparison and load protocols.
Correct the reliability denominators and add the short CAP argument in the same pass.
Use the smaller corrections as a precision sweep.

Preserve the incident analyses, real scaling response, failure/recovery experiment, common acceptance contract, and cross-team audit.
Company reports and practitioner sources are useful primary case material when their role and limits are explicit.
University-level treatment does not require discarding them; it requires distinguishing what they document from the broader claim a student might be tempted to make.
