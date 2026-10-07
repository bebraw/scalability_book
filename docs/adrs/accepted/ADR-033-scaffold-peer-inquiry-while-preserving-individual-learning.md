# ADR-033: Scaffold peer inquiry while preserving individual learning

**Status:** Accepted

**Date:** 2026-10-07

## Context

[ADR-029](../implemented/ADR-029-support-asynchronous-peer-inquiry-through-opt-in-annotations.md) provides opt-in, source-anchored group/cohort inquiry after private initial work.
The common project specification already defines operator, challenger and validator responsibilities, and the evaluation guide encourages role rotation and individual explanations.
Shared access and a discussion thread alone do not establish that members explain their reasoning, test one another's claims or develop individual understanding.
A correct group result can coexist with a member who still needs support to perform the task.

The ZPD review identified peer collaboration as a useful source of assistance, with individual follow-up needed to understand its learning value.
The user requested that this development direction be formalized alongside adaptive assistance and independent practice.

## Decision

Extend the existing asynchronous peer inquiry with optional prompts for reasoning together and a clear path back to each student's private learning record.
Use [ADR-031](../implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md) for supporting-agent behavior and [ADR-032](ADR-032-connect-notebook-investigations-to-independent-application.md) for individual application/reflection.
Groups continue to organize their own meetings and choose whether to use these tools.

### Support reasoning together

After the existing private initial-work step, invite members to compare predictions or uncertainties, explain reasons, question assumptions and choose a check.
Offer a compact optional structure: question, competing explanations, evidence/check, current decision and remaining uncertainty.
Ordinary questions and replies remain valid without completing every field or waiting for every member to contribute.
An unresolved disagreement or unsuccessful check is a useful outcome.

Use the existing operator/challenger/validator responsibilities to make reasoning and validation visible.
Offer prompts for changing responsibilities so members can practise explanation, challenge and checking; do not introduce a separate roster, participation score or inferred ability ranking.
For example, ask someone other than the operator to explain why a result should be accepted and where its assumptions stop applying.
The course specification owns required engineering-session practice; notebook prompts are optional support for that practice.

Reviewed shared summaries retain consequential disagreement, evidence limitations, contributor identity and tool provenance.
Agreement must come from students' contributions rather than a model's inferred consensus.
Agents may suggest questions, checks and draft summaries from deliberately supplied, authorized material.
They do not retrieve gated peer work themselves, speak for absent members or post on a student's behalf without the existing review/sharing action.

### Return to individual learning

Provide a route from the discussion to a private takeaway, remaining uncertainty or independent related case.
Invite each learner to explain what they can now justify themselves and where support is still useful.
Students choose whether to save that reflection, link selected shared evidence or revise their own concept judgment.
A group decision must not set members' personal understanding, copy the same reflection into their notebooks or create course credit.

Private initial text and later reflections retain their existing audiences.
Linking a thread does not import classmates' contributions into agent context automatically or grant access after membership changes.
The existing deliberate selection, source snapshots and authorization rules govern any peer-derived material.
Solo learners can use the individual sequence and the existing independent human review route; a group response is not a prerequisite for continuing.

### Entry points, state owners and dependency direction

- Enter through Notebook → Peers at the reading/activity, with optional prompts usable during students' own meetings.
- Authored prompts belong to shared learning resources; the browser presents them and the private-reflection handoff.
- The existing course inquiry store owns deliberately shared contributions, summaries and audiences, under course/phase allocations and record revision checks.
- The local notebook owns each student's selected private learning record; the companion owns only selected conversation context.
- Any extension to shared inquiry types and validation belongs in the shared domain contract and common handler used by local development and the Worker.

Reuse the existing inquiry identity, authorization, historical-access and conflict boundaries.
This decision introduces no new collaboration service, live shared demo control, meeting scheduler or automatic notification requirement.
Public editorial offers retain their separate consent and review under ADR-029.

## Trigger

The user asked to formalize the ZPD discussion, including making peer support useful to each learner rather than using a shared result as evidence of individual learning.

## Consequences

**Positive:**

- Students have concrete ways to request explanations, challenge assumptions and validate evidence together.
- Shared inquiry can inform individual learning while preserving different conclusions and private reflections.

**Negative:**

- Prompts can become repetitive or allow one member's explanation to dominate if treated as a form to complete.
- Shared findings may remain mistaken; model summaries and group agreement cannot replace checks or appropriate human guidance.

**Neutral:**

- Existing group-session requirements, private peer assessments, grades and audience rules retain their current owners.
- Production use depends on the existing course identity/storage rollout; the prompts do not bypass that dependency.

## Alternatives considered

### Rely on unrestricted discussion and a final group summary

This is flexible, but provides little support for students unfamiliar with collaborative reasoning and makes individual development difficult to see.
Keep flexible replies and offer a small set of optional prompts and private follow-up actions.

### Assign the strongest member or agent to produce the explanation

This may produce a useful answer but can leave others with little opportunity to explain, challenge or validate.
Support changing responsibilities without ranking members' ability or forcing everyone to provide identical contributions.

### Automatically derive individual understanding from shared conclusions

This confuses group agreement with personal learning and changes the ownership of concept judgments and reflection.
Students retain their own evidence and self-assessment.

## Implementation and verification

Current initial-work gating, source-anchored threads, explicit sharing and private reflection handoff provide the baseline.
Structured reasoning prompts, responsibility cues and the connected independent follow-up remain to be implemented.

Before marking this record Implemented:

- Connect optional inquiry/session prompts and individual follow-up while retaining ordinary asynchronous questions/replies and the solo route.
- Exercise a synthetic group with competing predictions, a checked result, retained disagreement and different private takeaways; include an absent member and a request for more help.
- Verify that no required contribution count, common concept judgment or automatic private-note publication is introduced.
- Recheck attempt-first access, deliberately selected agent context, group/cohort isolation, historical membership, source versions, concurrent edits and public-offer consent for any changed shared behavior.
- Update workspace/course operating documentation and the voluntary evaluation guide.

Learner evaluation should ask consenting members to explain a related case individually and describe whether explanation, challenge and validation helped them.
Use chosen excerpts/interviews and existing course evidence rather than routine notebook/transcript access or participation counts.
Record usability, workload and independent learning separately from a successful group result.

## References

- [Learning workspace: peer inquiry contract](../../learning-workspace.md#peer-inquiry-contract).
- [Course system: optional peer inquiry](../../course-system.md#optional-peer-inquiry).
- [Common project: shared engineering sessions](../../../specifications/00_common_project.md#shared-engineering-sessions).
- [ADR-028: private reflection notebook](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- [Learner evaluation guide](../../learning-workspace-evaluation.md).
- [Vygotsky: The Problem of Teaching and Mental Development at School Age](https://www.marxists.org/archive/vygotsky/works/1931/school-age.htm).
