# Course Project Introduction

The course uses three fresh implementations of the same Work Activity Tracker to study both application scalability and the development workflow that produces the application.
Begin here for the guidelines shared by all three projects, then read the [Common Contract](00_common_project.md) and the current phase brief.

## Three projects, one application

1. [**Establish**](01_establish.md): build implementation A with a locally hosted model and a single-agent workflow, then record its evidence baseline.
2. [**Challenge**](02_challenge.md): build implementation B with an approved comparison model and a single-agent workflow, then examine architectural assumptions and development friction.
3. [**Compare**](03_compare.md): build implementation C with a declared agent fleet, then compare the three applications and development workflows.

The required behavior remains substantially stable while the development setup changes.
Each later phase also benefits from your growing domain knowledge, so the comparison supports a conditional engineering judgment rather than a universal model ranking.

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
