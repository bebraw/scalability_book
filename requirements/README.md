# Versioned course requirements

The common contract, phase briefs, introduction and rubric in `specifications/` own the requirements.
The course interface's authored checklist in `shared/course-requirements.ts` summarizes where students should index their evidence; it does not replace those documents or determine grades.

Each course run stores a requirement edition on creation.
Historical runs without that field use the fixed first edition, `2026-10-v1`, rather than the current edition.
The current `2026-10-v2` edition adds an explicitly approved solo route across all three phases and retains the group route; its `2026-10-solo-equivalence-v2` rubric preserves numeric scoring and passing rules while replacing teammate-specific evidence for solo students.
The published snapshots below are immutable after publication, including their checklist text.
The site builds readable archived briefs and Markdown downloads under `/project/requirements/<edition>/<document>/`.
Links among the briefs stay within their edition; links to supporting book concepts may follow the current book.

The build checks SHA-256 digests of every archived document and the serialized checklist.
It also checks the current edition against all six owning documents.
A changed owner or archived checklist therefore fails the build instead of silently changing a run's contract.
The digests detect drift; they do not establish the quality or semantic completeness of an authored checklist.

To revise requirements:

1. Edit the owning documents and review the common and phase checklist against their complete deliverables and rubric.
2. Add a new independently retained edition in `shared/course-requirements.ts` and make it `requirementVersion`; retain every previous edition and `legacyRequirementVersion`.
   Do not reuse mutable common/phase arrays in a way that changes an old edition.
3. Run `node scripts/snapshot-course-requirements.ts <new-edition>`.
   It creates a new directory and refuses to overwrite an existing edition.
4. Verify types, requirement/checklist tests, the affected course browser flow, build and HTML validation.
   Inspect the archived pages and their evidence links.
5. Commit the owner changes, new checklist and snapshots together before creating runs on that edition.

Existing runs and frozen checklists are retained.
A change to the numerical rubric needs its own supported grading version; changing a checklist does not change scoring rules.
Do not update an old manifest to bless edits to a published edition.
