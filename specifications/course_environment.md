# Course Development Environments

This file defines the operational choices that must be published for each course run.
Model and agent products change faster than the book's architectural and measurement concepts, so the current assignments belong here rather than in permanent chapter prose.

## Publication rule

The instructor must complete and publish the table below before the affected project begins.
A phase does not begin until every student has a supported access path, a declared fallback for service failure, and a cost policy that does not require unannounced personal spending or hardware.

| Phase     | Required assignment before launch                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Establish | Approved local model artifact or departmental endpoint; resolved revision where exposed; runtime and quantization where applicable; supported hardware or hosted allocation; single-agent harness; context and tool limits; network and data-boundary policy; fallback and support contact |
| Challenge | Approved second model and endpoint; comparison hypothesis; single-agent harness and enforcement rule; account or credit provision; data-boundary and retention policy; tool limits; fallback and support contact                                                                           |
| Compare   | Approved fleet harness; declared base model, preferably the Challenge model; maximum concurrent agents and total budget; isolation and external-action policy; trace export or transformation path; fallback and support contact                                                           |

The instructor should publish one filled table per course run with the following fields:

| Field                                             | Establish       | Challenge       | Compare         |
| ------------------------------------------------- | --------------- | --------------- | --------------- |
| Model and resolved revision or declared route     | To be announced | To be announced | To be announced |
| Agent harness and version                         | To be announced | To be announced | To be announced |
| Orchestration rule                                | Single agent    | Single agent    | To be announced |
| Supported execution environment                   | To be announced | To be announced | To be announced |
| Student cost limit and provided credit            | To be announced | To be announced | To be announced |
| Project-data egress and retention                 | To be announced | To be announced | To be announced |
| Tool, network, and external-action limits         | To be announced | To be announced | To be announced |
| Fallback when the assigned service is unavailable | To be announced | To be announced | To be announced |
| Support and exception path                        | To be announced | To be announced | To be announced |

## Publish the course workflow

Before each phase begins, publish the operational details for the [group and submission workflow](00_introduction.md#groups-submissions-and-access).
Use one group record per phase and one private individual portfolio per student and phase.

| Detail         | Required course-run decision                                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Groups         | Registration location, group identifiers and membership, formation deadline, and route for membership changes.                                                                                                          |
| Submissions    | Locations and deadlines for the frozen implementation, audit report, completed evidence bundle, and private individual portfolio; late-work and correction rules.                                                       |
| Class browsing | Assigned-auditor access after the implementation deadline, course-only submission index opening after the audit window, source and evidence access, and handling of approved exceptions.                                |
| Audits         | Assigned auditing groups, setup and probe time boxes, common tool policy, report destination, and fallback for missing reports or access.                                                                               |
| Assessment     | Published rubric version, feedback timing, group and individual score breakdowns, completed lecture activities, phase assessment and contribution minima, total and passing-status calculation, and correction history. |

Keep the class browsing index focused on technical submissions.
Give teaching staff access to the private records needed for assessment and each student access to their own results.
Publish the live and remote participation paths and the completion and correction arrangements for [mandatory individual work](grading.md#mandatory-individual-work).
Record approved changes to an individual requirement alongside any points adjustment.
For an approved solo route, publish the phase workload/schedule, instructor discussion arrangements, independent human reviewer and outgoing cross-group or frozen-reference audit assignment before work begins.
Keep model access and budgets supported for the solo student, and distinguish a check-in from an announced equivalent lecture activity.
Before launch, test the access paths as an author, a classmate, and an instructor, including access to a frozen source revision.

## Verify the assigned workflow

Before launch, run one small task with the published configuration and retain its trace.
For Establish and Challenge, confirm that automatic delegation and unapproved model routes are disabled or fail closed; one visible chat window is not evidence of one agent.
For Compare, verify child-task attribution, cancellation, usage accounting, workspace isolation, and trace export with the selected harness version.
Repeat this check after a material tool or routing change and record the change date.

## Comparison rules

- Choose a Challenge model different from Establish and publish the hypothesis the comparison will test; either model may be a foundation model, and hosting or size alone does not establish a capability ranking.
- Keep the Challenge model as the Compare fleet's base model when practical so B-C primarily changes orchestration.
- If a model, route, harness, or hardware allocation changes, record the actual configuration and narrow the comparison claim.
- Do not rank local inference latency across unequal student hardware as though the environment were controlled.
- Manual implementation remains legitimate and must be reported; access failure should not pressure students to conceal work or buy an unapproved service.
- When the assigned tool does not expose a requested configuration field, record it as unavailable rather than estimating it.

This operational sheet may change between course runs.
The behavioral specification, evidence categories, and assessment rubric should remain stable unless a revision is announced before students begin the affected phase.
