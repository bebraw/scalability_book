# Course Project Introduction

The course uses three fresh implementations of the same Work Activity Tracker to study both application scalability and the development workflow that produces the application.
Begin here for the guidelines shared by all three projects, then read the [Common Contract](00_common_project.md) and the current phase brief.

## Three projects, one application

1. [**Establish**](01_establish.md): build implementation A with an approved large model and a single-agent workflow, then record its evidence baseline.
2. [**Challenge**](02_challenge.md): build implementation B with an approved small model and a single-agent workflow, then examine architectural assumptions and development friction.
3. [**Compare**](03_compare.md): build implementation C with a declared agent fleet with approved model assignments, then compare the three applications and development workflows.

The required behavior remains substantially stable while the development setup changes.
Each later phase also benefits from your growing domain knowledge, so the comparison supports a conditional engineering judgment rather than a universal model ranking.

## Groups, submissions, and access

### Shared work and individual assessment

Groups normally have three members.
A fourth member needs instructor approval; four is the maximum for new groups.
An explicitly approved smaller group may continue after a withdrawal when transferring members would be impractical.
The approved solo route below also permits a one-person allocation from the start.

Use the announced formation period to **Propose a group** or request **Assign me a group**.
A pair can propose together while awaiting a third member.
Every proposed member confirms participation; the proposer is not a permanent group leader.
The instructor reviews proposals, allocates unassigned students and publishes approved groups with a correction window.
The system assigns a stable course identifier such as **Group 01**; an optional display name does not replace it.
Only approved membership grants access to a group submission.

You may opt in to show your name as available to join a group.
Send meeting availability and relevant support constraints privately to the instructor; do not put institutional emails, student IDs or personal constraints in a class directory or technical bundle.
Agree briefly on availability, communication and handling missed commitments.
This working agreement helps the group operate and is not an additional graded deliverable.
Contact the instructor for a late-arrival catch-up arrangement or withdrawal; neither should erase submitted work or silently waive passing requirements.
Your recorded catch-up plan appears privately in **My progress** in the course workspace.
It does not change deadlines or passing requirements unless the instructor separately records an approved arrangement.

Keep the group stable across Establish, Challenge, and Compare where practical; agree membership changes with the teaching staff and record which group each student belongs to for the affected phase.
One member submits the group bundle on behalf of the registered group, and every member remains responsible for understanding and accepting its work.

Each group receives one project score per phase, which every registered member receives.
Individual contribution is assessed through the self- and peer-assessment criteria, while participation and learning diaries are also scored individually.

| Work                                         | Submitted by | Maximum per student across the course |
| -------------------------------------------- | ------------ | ------------------------------------- |
| Three project bundles                        | Group        | 90 points                             |
| Nine lecture participation and diary records | Individual   | 27 points                             |
| Three self- and peer-assessments             | Individual   | 36 points                             |

Submit one private individual portfolio per phase containing the relevant lecture diary entries and self- and peer-assessment.
Label entries by lecture so the instructor can apply the existing three-point lecture criteria.
The [assessment rubric](grading.md) defines the criteria, passing requirements, and grade thresholds.
To pass, each student must also complete the [mandatory lecture activities and individual assessments](grading.md#mandatory-individual-work) in every phase.

### Approved solo route

An instructor may approve a one-person group as an individual exception for all three phases.
Agree the route, realistic time budget, supported model/hardware access, independent reviewer and audit arrangements before work begins.
Approval is recorded for each phase; it does not reduce application behavior, evidence, points or passing requirements.
The student completes three fresh implementations and owns their correctness, operation and acceptance.
Keep optional scope small; the instructor may adjust scheduling explicitly rather than expect one student to supply a three-person team's working hours.

Use the solo instructions in each phase brief.
Replace rotating human responsibilities with explicit operator, challenger and validator passes, followed by a short instructor discussion in each phase.
A human reviewer independently audits the student's frozen implementation, and the student audits an assigned group or an instructor-supplied frozen reference implementation.
An agent can help within the announced phase/audit tool policy; it cannot stand in for the independent human reviewer.

Agree any exceptional assessment arrangements with the instructor in writing before work begins, and retain them in the private portfolio.
Keep lecture participation and diary obligations; a project check-in does not automatically count as a lecture activity.
Solo evidence supports conclusions about individual engineering and agent coordination, not claims of practiced human teamwork.

### Submit each phase in stages

Use one group submission record per phase, identified by the group, phase, implementation revision, and evidence index.
The course instructions publish the deadlines and submission locations before work begins.

1. **Freeze the implementation:** submit the implementation revision, setup and validation instructions, and the available common and phase-specific evidence.
2. **Audit:** after the implementation deadline, the assigned group inspects that frozen revision and returns the bounded audit report.
3. **Complete the evidence:** add the completed technical evidence index, technical attachments and the authors' response to the same group submission record, preserving the original implementation, setup, initial evidence, checklist and membership.
   Evidence drafts remain private to the group and staff until submitted.
   Use the checklist to locate artifacts or declare missing work; it does not assess quality or award points.
   Each student also submits the private individual portfolio by its published deadline.
4. **Assessment:** the instructor records the group project score and each student's individual scores, with criterion-level reasons and any missing evidence.

Label later code corrections separately; they become assessed revisions only when the announced correction policy permits them.
Report a missing audit or access problem to the teaching staff so they can arrange and record a fallback.
The [Common Contract](00_common_project.md#9-common-submission-bundle-and-comparable-evidence) defines the completed technical bundle and audit protocol.

### Browse other groups' submissions

After the phase's common implementation deadline, the assigned auditors receive access to the frozen technical bundles.
The instructor opens a course-only submission index for general class browsing after the audit window closes, so preparation outside the audit does not silently disappear from the recorded effort.
Each entry identifies the group and phase and links the frozen implementation revision, setup and validation instructions, evidence index, and audit report with the authors' response when available.
Classmates receive read access to the submitted source and technical evidence, so browsing supports learning beyond the assigned audit.
Course access is sufficient; public publication is optional.

Run checks or try changes in your own checkout, following the announced course tool policy.
Use synthetic demonstration data and provide access without sharing personal accounts or credentials.
For an assigned audit, declare any prior inspection of the implementation and follow the audit timing protocol.
Looking at another submission does not authorize copying its implementation; follow the [transfer policy](00_common_project.md#8-permitted-transfer-between-implementations) and acknowledge ideas that materially inform your decisions.

Keep learning diaries, self- and peer-assessment reports, personal support information, and scoring records in the private course submission channel.
Share useful feedback with teammates, while confidential assessment reports go to the teaching staff.
Each group can see its project score and feedback; each student can see their individual score breakdown, completed lecture activities, phase assessment results, total, and any unmet passing requirement.

## Guidelines for course work

These guidelines apply across all three implementations.

### Keep one evidence bundle

Each main chapter ends with a **Project artifact** section.
These sections are staged checkpoints for building the current phase's evidence; they do not silently create separate submissions.
The [common project specification](00_common_project.md) and current phase specification provide the authoritative deliverable checklist, and one clearly structured artifact may satisfy several chapter checkpoints.

### Record assistance and acceptance evidence

Record material assistance and human corrections in the AI-use log, and bind checks, acceptance decisions, and known limits to the submitted revision.
Use the [common evidence bundle](00_common_project.md#9-common-submission-bundle-and-comparable-evidence) so others can assess the work and compare workflows.
Preserve truthful provenance and accountable ownership; avoid false claims of human-only production.

### Follow external contribution policies

For an external issue or pull request, follow the receiving project's applicable contribution and AI policies.
Read them before preparing the submission: they may govern permitted assistance, who writes and posts public text, and disclosure.
Respect a project's refusal of particular assistance or submissions; disclosure does not make a prohibited contribution acceptable.
An external disclosure rule does not remove the course's evidence requirements.
[Appendix D's contribution-policy example](/appendices/agent-system-security/#external-contribution-policies) examines how private tooling, public authorship, and disclosure can be governed differently.

### Protect learning, not only output

Immediate task performance is not the only outcome worth protecting.
Across three randomized experiments involving short arithmetic and reading-comprehension tasks, brief AI assistance improved work while it was available but reduced later unaided performance and persistence.
In a cross-sectional subgroup analysis of the second experiment, participants who reported using AI for direct answers later performed worse and skipped more than both the control group and those who reported using it for hints :citep[liu2026assistance].
These tasks do not establish the long-term effect on professional programming, but they support a practical course rule: use agents for hints, critique, and verification when the underlying skill must remain yours.

## Begin the first project

Read the [Common Contract](00_common_project.md) for the application behavior, shared evidence, and evaluation requirements, then the [Establish brief](01_establish.md) for implementation A.
The [course environment sheet](https://github.com/bebraw/scalability_book/blob/main/specifications/course_environment.md) defines the supported models, tools, access, budgets, privacy, and fallback for the current course run.
Consult the [assessment rubric](grading.md) for the scoring and essential learning outcomes.
