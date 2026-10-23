# Documentation

Use the guides below for current behavior and operating instructions.
The [architecture map](../ARCHITECTURE.md) identifies runtime and state owners; [student specifications](../specifications/README.md) own course requirements.

## Current guides

| Topic                                                              | Owning documentation                                                                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Development, verification and deployment                           | [Development](development.md)                                                                                                                |
| Decisions, alternatives and historical rationale                   | [ADR index](adrs/README.md)                                                                                                                  |
| Enrollment, submissions, audits, grading and simulation            | [Course system](course-system.md)                                                                                                            |
| Private reference, public benchmark runner and matched experiments | [Course preparation tooling](course-tooling.md)                                                                                              |
| Independent course schedule, commitments and activities            | [2026 solo pilot](solo-pilot-2026/README.md)                                                                                                 |
| Learning workspace and companion contracts                         | [Learning workspace](learning-workspace.md)                                                                                                  |
| Student notebook and model setup                                   | [Companion setup](learning-companion-setup.md)                                                                                               |
| External agents and public retrieval                               | [Agent setup](external-agent-setup.md), [resource contracts](agent-learning-resources.md)                                                    |
| Exercises, demos and measurement                                   | [Chapter exercises](chapter-exercises.md), [demo style](demo-style-guide.md), [friction audit measurement](friction-audit-estimate-basis.md) |
| Learner trials and instructor effort                               | [Workspace evaluation](learning-workspace-evaluation.md)                                                                                     |
| Reader feedback and moderation                                     | [Feedback setup](feedback-setup.md)                                                                                                          |
| Highlighted HTML reviews                                           | [Reviewing changes](reviewing-changes.md)                                                                                                    |

## Reviews and plans

These records contain planning context, research rationale or follow-up work; current requirements and implementation belong to the guides and specifications above.

- [First-run improvements](first-run-course-improvements.md) and [text-tightening review](text-tightening-review-2026-09-15.md): operational and editorial proposals to revisit against current material.
- [Project scope review](project-specification-scope-review-2026-10-22.md): the agreed simplifications and remaining preparation for the pilot.
- [Latest Obsidian intake](obsidian-content-review-2026-10-19.md): the 19 October source-review checkpoint for the next intake.
- [Feedback hardening](feedback-bot-hardening.md) and [ScholarMark integration](scholarmark-integration-report.md): capability proposals and their recorded implementation boundaries.
- [Three-build direction](three-build-project-direction.md) and [individual-assessment comparison](individual-assessment-requirements-2026-10-05.md): historical planning and research context; the linked ADRs and current rubric own the decisions.

## Retiring completed reviews

Remove a completed review report once its substantive findings are incorporated into the owning material and any unresolved work is retained explicitly.
Update incoming links, keep lasting decisions in ADRs and retain the latest source-intake checkpoint needed for future reviews.
Generated review output and private experiment records belong under ignored `.local/` as described in the relevant guide.

Earlier reports remain recoverable from Git without a duplicate archive directory:

```sh
rtk git log --all -- docs/<report-name>.md
rtk proxy git show <revision>:docs/<report-name>.md
```
