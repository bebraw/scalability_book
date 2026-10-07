# ADR-033: Scaffold peer inquiry while preserving individual learning

**Status:** Implemented

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
Use [ADR-031](../implemented/ADR-031-adapt-learning-support-to-the-students-current-task.md) for supporting-agent behavior and [ADR-032](../implemented/ADR-032-connect-notebook-investigations-to-independent-application.md) for individual application/reflection.
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

`shared/learning-inquiry.ts` now owns optional question, competing-explanation, evidence/check, decision and uncertainty prompts, plus the existing operator/challenger/validator responsibilities and rotation cues.
The browser can prepare a freely editable outline without required fields, contribution counts or waiting for every member.
The course specification retains ownership of required engineering-session practice and the solo independent human review route.

Contribution selection starts unchecked.
Students can prepare a summary from selected visible contributions, retaining author identity/contribution IDs, disagreement, evidence links, dates and tool provenance without deriving consensus.
Oversized selections fail visibly instead of silently losing material.
The existing reviewed sharing action, audiences and record revisions still govern posting; no new shared schema, store, API or authorization rule is introduced.

The private reflection handoff now contains only a thread reference and optional personal starters unless the student deliberately selects contributions to copy.
The draft links their existing private records and requires review/save; it does not retrieve peer work for an agent or grant future thread access.
Each thread also offers an optional authored independent case through the same practice component, with its own tab draft and a separately saved linked notebook attempt.
Students can request help or continue the private guide without a group decision, and keep different personal explanations and concept judgments.

Verification on 2026-10-07 used synthetic records:

- A two-student browser journey leaves a third member absent, compares explanations, runs an actual browser-model check, preserves disagreement and prepares a reviewed attributed summary before sharing.
- It verifies a link-only private handoff by default, deliberately selected evidence in another student's draft, different private takeaways, requested help and a separately saved independent case without automatic concept updates.
- Existing inquiry tests retain attempt-first disclosure, group/cohort and phase isolation, historical membership, original source snapshots, concurrent-write/allocation rejection and separate public-offer consent.
- All 150 unit tests and 20 combined Chromium/WebKit notebook/onboarding/demo/peer checks pass, along with type checks, production build/77-page HTML validation, formatting and changed-document links.
- The locally packed companion passes clean installation and retained-record checks on macOS / Node 26; the published npm package is unchanged.
  ADR-031's new provider instructions still require a future companion release.

Workspace, student setup, course operating and voluntary evaluation documentation now explain optional collaborative reasoning and each learner's chosen evidence, independent application, workload and ordinary course progress.
Production inquiry still depends on the existing course identity/storage rollout.
These establish working software and an evaluation protocol; learner outcomes remain unmeasured.

## References

- [Learning workspace: peer inquiry contract](../../learning-workspace.md#peer-inquiry-contract).
- [Course system: optional peer inquiry](../../course-system.md#optional-peer-inquiry).
- [Common project: shared engineering sessions](../../../specifications/00_common_project.md#shared-engineering-sessions).
- [ADR-028: private reflection notebook](../implemented/ADR-028-use-a-private-reflection-notebook-to-support-course-learning.md).
- [Learner evaluation guide](../../learning-workspace-evaluation.md).
- [Vygotsky: The Problem of Teaching and Mental Development at School Age](https://www.marxists.org/archive/vygotsky/works/1931/school-age.htm).
