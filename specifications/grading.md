# Course Assessment Rubric

This rubric turns the course learning outcomes and project evidence into student-facing scoring rules.
It applies to every course run unless the published course environment or learning-platform instructions announce a revision before the affected phase begins.

## Project scoring: 30 points per phase

Each project receives 20 points from common criteria and 10 points from its phase-specific criteria.
The same evidence may support several criteria, but the same accomplishment is not counted twice within one criterion.

### Common criteria: 20 points

| Criterion                                 | Points | Full-credit evidence                                                                                                                                                           |
| ----------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Required web behavior and correctness     |    0-6 | The common acceptance core works through the running application; persistence and invalid transitions behave correctly; known defects and missing evidence are reported.       |
| Reproducible setup and operation          |    0-4 | An unfamiliar group can follow the supported setup, run the application and checks, obtain demonstration data, and understand the declared environment and operational limits. |
| Scalability evidence and reasoning        |    0-5 | Workloads, boundaries, conditions, distributions, limits, signals, formal relationships where required, trade-offs, and unsupported claims are handled explicitly.             |
| Architecture and change capacity          |    0-3 | Authority, request and data paths, contracts, ownership, consequential decisions, and change or recovery obligations are coherent and reviewable.                              |
| Responsible development-workflow evidence |    0-2 | Material AI assistance, failed attempts, human correction, acceptance, resource use where measurable, and known limits are reported compactly and honestly.                    |

Use the following general interpretation within each point range:

- **Full credit:** complete, internally coherent, bound to the submitted revision, and supported by relevant evidence.
- **Most credit:** the central outcome is present, but one important condition, check, explanation, or limitation is weak.
- **Some credit:** partial evidence exists, but the result is difficult to reproduce, compare, or defend.
- **No credit:** absent, unusable, contradicted by the artifact, or presented without the evidence needed to assess it.

A visually polished or feature-rich application does not compensate for failure of the common behavioral core.
Conversely, a modest implementation can earn full credit when it satisfies the contract and supports its decisions with strong evidence.

### Establish-specific criteria: 10 points

| Criterion                                         | Points | Full-credit evidence                                                                                                                                                          |
| ------------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local single-agent constraint and project harness |    0-4 | The declared local-model workflow is followed; instructions, feature and architecture material, commands, and checks make accepted work reviewable; manual work is disclosed. |
| Baseline and bounded scalability claims           |    0-4 | The two initial claims, shared workload, primary pressure, observation baseline, and evidence limits provide a repeatable starting point for later phases.                    |
| Ownership and local-workflow reflection           |    0-2 | The ownership card and reflection distinguish model, harness, hardware or environment, project, and human contributions without turning impressions into causal claims.       |

### Challenge-specific criteria: 10 points

| Criterion                                     | Points | Full-credit evidence                                                                                                                                                                               |
| --------------------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh and comparable implementation B         |    0-3 | Implementation B starts cleanly, respects the single-agent and transfer constraints, completes the common core, and records scope or configuration differences.                                    |
| Architecture, friction, and pressure analysis |    0-5 | The architecture hypothesis, ownership card, standardized audit, primary and secondary pressures, documented-case transfer, recovery reasoning, and Little's Law check form one coherent analysis. |
| A-B interpretation                            |    0-2 | Observations, plausible explanations, practice effects, stack or hardware differences, and unresolved alternatives are separated clearly.                                                          |

### Compare-specific criteria: 10 points

| Criterion                                        | Points | Full-credit evidence                                                                                                                                                                                          |
| ------------------------------------------------ | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fleet design, integration, correction, and trace |    0-3 | Independent agent work, task and authority boundaries, integration, one correction loop, transformed trace, and debugging findings are inspectable and bounded.                                               |
| Applied scaling and deployment                   |    0-5 | Application- and workflow-level models, one implemented before-and-after response, its new failure or recovery obligation, realistic deployment, rerun workload, and target design are supported by evidence. |
| Final engineering judgment                       |    0-2 | The evidence matrix and decision narrative compare A, B, and C, label observation, inference, and proposal, reject alternatives, and state the next boundary and measurement.                                 |

## Participation and learning diary: 3 points per lecture

| Evidence                                                                                            | Points |
| --------------------------------------------------------------------------------------------------- | -----: |
| Participates in the live lecture or completes the announced equivalent remote activity              |      1 |
| Records one concrete idea, model, failure, or trade-off from the lecture in the learning diary      |      1 |
| Connects that idea to project evidence, a prior assumption, or a decision the student would revisit |      1 |

The diary entry may be written, audio, or video.
Production polish is not graded; specificity and reflection are.

## Self- and peer-assessment: 12 points per phase

| Criterion                                  | Points | Full-credit evidence                                                                                                                                                                             |
| ------------------------------------------ | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence-based self-assessment             |    0-3 | Identifies concrete contributions, decisions, missed commitments, learning, and next improvement without equating activity with value.                                                           |
| Useful peer feedback                       |    0-3 | Gives each teammate specific, respectful feedback connected to observable collaboration, review, integration, or project evidence.                                                               |
| Response to feedback and group reflection  |    0-3 | Summarizes agreements and differences, records one adjustment, and identifies a groupworking condition that affected the result.                                                                 |
| Reliable contribution and shared ownership |    0-3 | Instructor judgment based on corroborated project history, submitted evidence, self-assessment, and peer reports shows that the student contributed and supported shared acceptance of the work. |

In each phase's existing self-assessment, answer: “Identify one consequential decision you challenged, tested, or reviewed; link the evidence and explain the outcome.”
Use this evidence when assessing contribution and shared ownership; prompt counts, commit counts, and transcript length do not establish learning or contribution.

Peer ratings are evidence, not automatic votes on another student's grade.
The instructor resolves unsupported, retaliatory, mutually inflated, or contradictory reports against the project record and may ask for clarification.
Private circumstances should be handled through the course's ordinary support process rather than disclosed to teammates in detail.

## Passing and final grade

The maximum is 153 points:

- projects: `3 × 30 = 90`;
- participation and learning diaries: `9 × 3 = 27`;
- self- and peer-assessment: `3 × 12 = 36`.

To pass, a student must:

1. receive at least 10 points from each of the three projects; and
2. receive at least 50% of the available total points.

Let `p = 100 × earned_points / available_points` after any formally approved absence adjustment.
Once all passing requirements are met, the final grade is:

|       Percentage | Grade |
| ---------------: | ----: |
|        Below 50% |  Fail |
| 50% to below 60% |     1 |
| 60% to below 70% |     2 |
| 70% to below 80% |     3 |
| 80% to below 90% |     4 |
|     90% or above |     5 |

Keep the original evidence and scoring record when a factual correction, approved accommodation, or formal reassessment changes a result.
