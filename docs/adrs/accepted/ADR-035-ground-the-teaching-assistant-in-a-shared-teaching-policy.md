# ADR-035: Ground the teaching assistant in a shared teaching policy

**Status:** Accepted

**Date:** 2026-10-07

## Context

The local agent integration already supports selected reading context, authored concept references, student-chosen help modes, persistent conversations and bounded demo observations/actions.
[ADRs 031–033](../implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md) add responsive support, independent application, reflection and scaffolded peer inquiry.
These are substantial groundwork, but the current Agent interface does not present one recognizable teaching role distinct from notebook work.

[ADR-034](ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md) establishes that interface boundary.
The assistant also needs a shared definition of how it teaches, what evidence it uses and how its behavior will be evaluated.
A personality or a successful provider call alone does not establish instructional quality.

### Research rationale and limits

Research on intelligent and conversational tutoring is relevant, but results depend on the teaching design, material, learners and comparison.
Kestin et al.'s randomized undergraduate physics study found improved immediate learning with a deliberately structured AI tutor compared with the studied active-learning lessons.
Its limited lesson setting does not establish whole-course outcomes in this CS course.
Bastani et al.'s high-school mathematics trial found worse independent performance after unrestricted AI-assisted practice; teacher-informed tutoring safeguards largely mitigated that harm without establishing an independent-performance gain over the control.
Together these findings motivate authored support and checking independent learning, rather than treating assisted completion as the outcome.

Schroeder et al.'s umbrella review found small potential benefits from pedagogical characters and limited generalizable design guidance.
Its included reviews concern non-AI characters, so it is not direct evidence that an LLM personality will improve this course's learning outcomes.
Separating the interfaces and adopting the policy below are design judgments to evaluate, not effects established by those studies.

## Decision

Define one provider-independent teaching policy for the optional whole-book assistant, implemented through the student's existing local companion and chosen provider.
Develop its instructional behavior, recognizable manner and evaluation together.
Extend the existing support contract rather than replacing it with a generic persona prompt or a separate hosted tutor.

### Instructional role

The assistant helps a student understand a chosen question, investigate evidence and take increasing responsibility for the next step.
It can explain, ask focused questions, suggest checks, discuss reasoning, demonstrate a worked step and support reflection.
Use the student's requested mode, current explanation or uncertainty, and deliberately supplied evidence to choose useful support under ADR-031.
When needed, clarify one missing piece of information or offer a prerequisite explanation; do not infer general ability from writing length, chapter position or concept flags.

Use authored definitions, assumptions, examples and available self-check criteria.
Extend reviewed chapter support where useful, prioritizing real difficulties and meaningful related cases over generating an exercise for every paragraph.
Distinguish an authored claim, actual browser observation, the student's explanation and an assistant's hypothesis or proposed example.
Do not claim a demo was run, a project measured or an explanation verified without the corresponding evidence.
When a claim cannot be checked from supplied material, acknowledge the limit and offer a source, bounded check or question to take to a human instructor or peers.

Preserve the student's goal, pace and access to direct explanation.
Encourage an attempt, self-explanation or changed-situation application when useful, with support available again on request.
No mandatory Socratic sequence, repeated-failure requirement or fixed turn count governs access to help.
After an explanation, an optional independent case can help the student examine what they can now justify under ADR-032.
Reflection guidance can help them articulate evidence and uncertainty, while reviewed notebook handoffs retain authorship under ADR-034.

For group inquiry, use ADR-033's existing reasoning prompts and responsibilities.
Help students compare explanations and prepare attributed, reviewed summaries from selected authorized material.
Do not infer absent members' agreement or individual understanding from a shared result.
Concept judgments, grades, participation and submissions remain under student or course authority.
Task-specific adaptation creates no hidden learner ability score or automatic mastery certification.

### Personality as a consistent teaching manner

Give the assistant a recognizable manner across providers: patient, curious, precise and constructive.
Present it clearly as an automated study assistant, distinct from the instructor and course assessor.
A name or visual identity may express that role, but does not give it authority over assessment or make its claims correct.

Make the manner observable in its replies:

- Treat uncertainty and mistakes as usable starting points; request only the detail needed for a next step.
- Ask questions that address the current difficulty and explain directly when that is the useful or requested support.
- Challenge an unsupported explanation respectfully, connecting the correction to evidence rather than simply agreeing or praising.
- Acknowledge uncertainty and correct earlier errors without inventing confidence, observations or the student's experience.
- Recognize specific reasoning or progress without presenting encouragement as proof of mastery.

Personality must not override source accuracy, help choice, selected-context boundaries or student approval of actions.
Any later tone preference must preserve the common teaching policy.
Evaluate whether the manner makes asking for help easier and explanations clearer; treat enjoyment and perceived rapport as distinct from independent learning.

### Entry points, state owners and dependency direction

- Enter through Teaching assistant at a chapter, selection, chosen notebook entry or resumed investigation, with visible context under ADR-034.
- Authored book/resource owners retain subject claims, concepts, activity versions, assumptions, reviewed examples and self-check criteria.
- The shared agent contract owns teaching instructions, role identity, help choices and an identifiable policy version independently of UI and provider protocols.
- The companion's conversation owner retains supplied context, exchanges and applicable policy/provider metadata; previous conversations remain interpretable after policy changes.
- The browser owns actual demo state and reviewed handoffs; notebook and course owners retain their existing records and access rules.

Provider adapters apply the shared policy while retaining existing credential isolation and bounded tool/approval enforcement.
Model compliance remains a behavior to review; access and tool permissions must be enforced by the runtime rather than a personality prompt.
Policy changes need not rewrite earlier conversations or migrate portable notebook records.
Version and document any actual protocol or storage change through the existing compatibility contract.
Website and companion releases have separate availability: a website update must not imply that an older installed provider adapter has acquired new instructions.

### Evaluation and evidence

Extend [the existing voluntary evaluation protocol](../../learning-workspace-evaluation.md), using whole-book support with representative activities and individual/group learners.
Evaluate three distinct questions: can students find and use assistance, does its support address their difficulty accurately, and what can they subsequently explain or apply independently?
Include setup and study effort, reuse in existing submissions, and actual progress through the existing course checkpoints.

Review representative provider responses for a novice prerequisite, misconception, unclear question, demo limitation, requested direct explanation and demonstrated progress.
Include uncertain evidence, an incorrect student claim and an incorrect prior assistant claim.
Check accuracy, useful support, preservation of agency, honest tool claims and response to correction; synthetic responses establish observed behavior only.

With consenting learners, use selected explanations or interviews, meaningful independent variations and delayed recall where practical.
Record book/activity revision, companion/provider version and policy version so behavior changes can be interpreted.
Collect evidence of confusion, unsupported advice, excessive prompting and continued need for help alongside successes.
Separate personality feedback from instructional outcomes; changing tone and teaching strategy together cannot isolate the effect of personality.

Do not add routine transcript collection, staff access to private notes, engagement quotas or parallel assessment obligations.
Message counts, time spent chatting, confident self-report and assisted task completion are insufficient evidence of learning.
A small trial can identify usability and teaching problems; a causal claim about learning or course completion needs an appropriate study beyond that trial.

## Trigger

The user proposed a distinct automated teaching assistant with a possible personality, built on the local agent integration, and requested ADRs for the discussed direction.

## Consequences

**Positive:**

- Students encounter a recognizable support role grounded in the book and existing learning pedagogy.
- Providers share instructional expectations while private learning records retain their independent owner.
- Evaluation can distinguish interface usability, assistant behavior, personality and independent learning.

**Negative:**

- Reviewed examples, misconception support and meaningful independent cases require ongoing authoring.
- Model behavior varies by provider and version; passing examples cannot guarantee accurate tutoring.
- Personality can distract or encourage excess trust, so its value needs separate examination.

**Neutral:**

- Support remains optional across the whole book and adds no grading or participation requirement.
- Further provider adapters, hosted inference and expanded machine execution retain their own decision boundaries.

## Alternatives considered

### Add a friendly persona to the current Agent interface

This can improve recognition, but does not define how assistance responds to difficulty or distinguish perceived helpfulness from learning.
Use personality within a shared instructional policy and evaluate both.

### Enforce hints-only tutoring and a fixed instructional sequence

This could discourage copying, but obstructs learners who need an explanation or already understand a prerequisite.
Preserve responsive help and invite independent application without locking access to support.

### Let each provider own the teaching approach

Provider defaults offer flexibility but make the book's instructional expectations inconsistent and harder to evaluate.
Keep the shared policy and observable behavior criteria outside provider adapters.

### Build a persistent inferred mastery model first

This requires calibrated measurement and additional privacy/state decisions beyond the present evidence.
Use supplied task evidence and student-controlled judgments, evaluating independent application before expanding learner modeling.

## Implementation and verification

Responsive support, independent cases, peer scaffolding and real-provider samples already exist under ADRs 031–033.
The unified teaching role, policy identity/versioning, new interface and extended evaluation remain future work.
No new package publication, hosted model service or learner-outcome claim follows from accepting this record.

Before marking Implemented:

- Document the shared policy, its version metadata and the responsibilities of browser, conversation, notebook and provider owners.
- Verify the assistant journeys and deliberate handoffs in ADR-034, including notebook-only operation and old-record compatibility.
- Review actual provider replies against the representative criteria above and verify selected-context and demo-approval boundaries with synthetic records.
- Publish the updated voluntary evaluation guidance, with separate measures for teaching behavior, personality, independent learning, workload and course progress.
- State which website/companion release supplies the behavior and what learner evidence remains uncollected; implementation does not require claiming an established learning gain.

## Open questions

- Choose a name, visual presentation and any useful tone preferences through learner feedback.
- Prioritize reviewed chapter examples and misconception support from observed learner difficulties.
- Select feasible delayed-recall opportunities and comparisons within existing course work; causal evaluation design remains separate from the initial usability trial.

## References

- [ADR-027: local companion and bounded agent integration](../implemented/ADR-027-connect-book-learning-to-student-agents-through-a-local-companion.md).
- [ADR-028: private reflection notebook](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- [ADR-032: independent application and reflection](../implemented/ADR-032-connect-notebook-investigations-to-independent-application.md).
- [ADR-033: peer inquiry and individual learning](../implemented/ADR-033-scaffold-peer-inquiry-while-preserving-individual-learning.md).
- [Current shared agent contract](../../../shared/learning-agent.ts).
- [Kestin et al. (2025): AI tutoring outperforms in-class active learning](https://doi.org/10.1038/s41598-025-97652-6).
- [Bastani et al. (2025): Generative AI without guardrails can harm learning](https://doi.org/10.1073/pnas.2422633122).
- [Schroeder, Davis and Yang: Designing and Learning With Pedagogical Agents: An Umbrella Review](https://doi.org/10.1177/07356331241288476).
