# Simplification review — 24 September 2026

This pass applies the four proposed simplifications against `b1be1bf`.
It shortens the required reading path and consolidates the final evidence package while preserving the assessed application and workflow work.

## Reading changes

| Change                      | Main path                                                                                                              | Detail retained elsewhere                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Chapter 4 placement         | One comparison of servers, cloud instances, managed services, and edge delivery, grounded in the event tracker         | The dated CDN and provider-release history is removed; NIST and CDN definitions remain beside the comparison   |
| Chapter 4 specialist detail | Request tracing, consumer policy, authoritative state, HTTP cache correctness, and architectural trade-offs            | Appendix C retains crawler/rate policy, the event-view rebuild and cutover, and query-parameter cache matching |
| Chapters 2 and 7 vocabulary | Constrain → generate → validate → revise, with propose/prepare/execute authority and accountable owners                | The HAR acronym and the separate eight-stage decision path and six-stage correction loop are removed           |
| Chapter 7 continuity        | Decomposition, Amdahl, project preparation, authority, integration failure, correction, and measured coordination cost | Appendix D retains three optional exercises on changed guidance, contract completeness, and human review gates |
| Final submission            | Implementation; fleet evidence; scaling and deployment experiment; final decision                                      | Existing artifacts are linked through one evidence index rather than repeated in additional reports            |

The recap still connects application behavior, development work, and the agentic workflow.
Those are distinct perspectives on the same system, not competing instructions for carrying out a task.
The reflection builder, teaching notes, and lecture wording use the revised vocabulary and packaging.

By a consistent source-word count, Chapter 4 falls from 5,006 to 3,769 words (about 25%) and Chapter 7 from 3,711 to 3,072 (about 17%).
These counts include Markdown and source links; they describe the main reading path, not a measured reduction in student effort.

## Learning outcomes remain assessed

| Outcome from `course_plan.md`                            | Required evidence retained                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| LO1: Multiple scalability dimensions and factors         | Shared primary pressure, selected additional pressures, resource use, and the final evidence matrix                                       |
| LO2: Apply architectural patterns and techniques         | One implemented and remeasured scaling response, with explicit costs and a new failure or recovery obligation                             |
| LO3: Understand design decisions and their impacts       | Architecture hypothesis, request and data paths, ownership, target architecture, and rejected alternatives                                |
| LO4: Use scalability laws in architectural decisions     | Little's Law and Amdahl teaching sequence, plus separate application and workflow formal-model analyses                                   |
| LO5: Evaluate at multiple abstraction levels             | Runtime, architecture, reliability, maintainability, simplicity, resource efficiency, and coordination evidence                           |
| LO6: Design, build, and deploy scalable web applications | All three implementations, common acceptance checks, cross-team audits and responses, scaling experiment, and realistic deployed workload |

No grading weights or common acceptance scenarios change.
The application and workflow models remain separate requirements.
Failure/recovery, realistic deployment, unsuccessful experiment results, and cross-team audit evidence remain mandatory.

## Deliverable crosswalk

| Previous Compare item                                                                   | New location                          |
| --------------------------------------------------------------------------------------- | ------------------------------------- |
| Common implementation C bundle and cross-team audit/response                            | 6.1 Implementation                    |
| 1: Fleet plan or task graph                                                             | 6.2 Fleet evidence                    |
| 2: Selected execution trace                                                             | 6.2 Fleet evidence                    |
| 3: Transformed trace and repeatable loader                                              | 6.2 Fleet evidence                    |
| 4: Debugging views and at least two findings                                            | 6.2 Fleet evidence                    |
| 5: Coordination measurements and analysis                                               | 6.2 Fleet evidence                    |
| 6: Workflow formal model                                                                | 6.2 Fleet evidence                    |
| 6: Application formal model                                                             | 6.3 Scaling and deployment experiment |
| 7: Implemented response, before/after measurements, and new failure/recovery obligation | 6.3 Scaling and deployment experiment |
| 8: Realistic deployed-workload evidence                                                 | 6.3 Scaling and deployment experiment |
| 9: Target architecture and scaling trade-offs, separating implemented from proposed     | 6.4 Final decision                    |
| 10: Evidence matrix and decision narrative                                              | 6.4 Final decision                    |

The previous nine final-comparison questions now form four parts of one argument:

- Establish the comparison covers the common specification and implementation differences (questions 1–2).
- Explain consequential results covers architectural pressure and what the debugging view revealed (questions 6 and 9).
- Bound the explanation covers model effects, orchestration effects, and alternatives (questions 3–5).
- Choose and set a revisit condition covers workflow choice and human responsibility (questions 7–8), plus the existing recap's ownership and next measurement.

## What to review

Read Chapters 4 and 7 in revised-text mode first: do the shorter explanations still support the request trace, architecture hypothesis, task graph, and correction exercise?
Then read Compare sections 6–7 alongside the recap: can a student locate each required result without writing the same explanation twice?
Use the appendices only when checking whether the moved examples remain usable on their own.

Generate the working-copy report with `npm run review`.
The report is a snapshot of this editorial pass against the last commit; no commit is needed to review it.

## Validation

- Site build exports all nine study modules; type checking and validation of 52 generated HTML files pass.
- All 22 focused browser tests pass for the reflection builder, project routes, architecture lens, fleet planner, and scalability-law labs.
- The seven changed chapter/appendix/project pages have valid internal fragment links (399 checked) and well-formed rendered tables.
- The four-bundle builder was inspected at desktop and mobile sizes, with no horizontal overflow or page errors.
- Formatting and Git whitespace checks pass.
