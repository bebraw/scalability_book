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
