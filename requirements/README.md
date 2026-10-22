# Versioned course requirements

The common contract, phase briefs, introduction and rubric in `specifications/` own the requirements.
The course interface's authored checklist in `shared/course-requirements.ts` summarizes where students should index their evidence; it does not replace those documents or determine grades.

Each course run stores a requirement edition on creation.
The instructor confirmed on 22 October 2026 that no existing course runs need preservation; `2026-10-v2` is the sole pre-course edition, with large-model Establish, small-model Challenge, and declared small/large or mixed-model fleets in Compare.
The `2026-10-solo-equivalence-v2` rubric retains standard group scoring and individually approved solo exceptions with the same numeric scoring and passing rules.
The public grading page covers the standard group criteria; [staff guidance](../docs/course-system.md#solo-assessment-equivalents) owns the exception assessment arrangements.
The pre-course scope review revises this unused edition in place: maintained specifications and an evolving decision log, focused pressure and friction evidence, required actual-run and supplied matched-trace analysis, and optional trace import, live pairs and additional pressures.
Students may use a supplied or custom benchmark runner under the same protocol and reference exact retained course configurations with actual-use confirmation and deviations.
Earlier unused requirement and rubric contracts have been removed.
Before the first course run, the current owners, checklist, and snapshots may be revised together in place.
Once a real run begins, its snapshots and checklist are immutable and later changes require a new edition.
The site builds readable archived briefs and Markdown downloads under `/project/requirements/<edition>/<document>/`.
Links among the briefs stay within their edition; links to supporting book concepts may follow the current book.

The build checks SHA-256 digests of every archived document and the serialized checklist.
It also checks the current edition against all six owning documents.
A changed owner or archived checklist therefore fails the build instead of silently changing a run's contract.
The digests detect drift; they do not establish the quality or semantic completeness of an authored checklist.

To revise requirements:

1. Edit the owning documents and review the common and phase checklist against their complete deliverables and rubric.
2. Before the first run, update the sole edition in `shared/course-requirements.ts` and regenerate its snapshots together with the owner changes.
   After a run begins, add a new independently retained edition and make it `requirementVersion`; retain every edition used by a run and avoid mutable shared arrays that change an earlier checklist.
3. Run `node scripts/snapshot-course-requirements.ts <edition>`.
   It creates a new directory and refuses to overwrite an existing edition.
   For an authorized pre-course revision, remove only the unused edition directory before regenerating it; never do this for an edition used by a real run.
4. Verify types, requirement/checklist tests, the affected course browser flow, build and HTML validation.
   Inspect the archived pages and their evidence links.
5. Commit the owner changes, new checklist and snapshots together before creating runs on that edition.

A change to the numerical rubric needs its own supported grading version; changing a checklist does not change scoring rules.
After the course begins, do not update an old manifest to bless edits to a run's contract.
