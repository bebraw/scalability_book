import {
  checklistEntries,
  emptyChecklist,
  requirementsFor,
  type EvidenceCheckpoint,
  type PhaseReference,
} from "../shared/course-requirements.ts";
import type {
  Course,
  CourseFile,
  Envelope,
  Phase,
  Submission,
} from "../shared/course.ts";
import { array, obj, requireThat, text } from "./course-validation.ts";

export function parseChecklist(
  course: Course,
  phase: Phase,
  input: unknown,
  prior?: EvidenceCheckpoint[],
): EvidenceCheckpoint[] {
  if (input === undefined) return prior ?? emptyChecklist(course, phase);
  const expected = checklistEntries(course, phase);
  const provided = array(input, 40).map((item): EvidenceCheckpoint => {
    const row = obj(item),
      id = text(row.id, "Requirement identifier", 40, true);
    requireThat(
      expected.some((r) => r.id === id),
      "Unknown checklist requirement.",
    );
    requireThat(
      row.status === "unindexed" ||
        row.status === "located" ||
        row.status === "missing",
      "Choose located, missing or not indexed for each requirement.",
    );
    return {
      id,
      status: row.status,
      location: text(
        row.location,
        "Evidence location or missing-work explanation",
        500,
        row.status === "located",
      ),
    };
  });
  requireThat(
    new Set(provided.map((r) => r.id)).size === provided.length,
    "Each checklist requirement appears once.",
  );
  return expected.map(
    (r) =>
      provided.find((p) => p.id === r.id) ?? {
        id: r.id,
        status: "unindexed",
        location: "",
      },
  );
}

export function parseFinalEvidence(
  course: Course,
  phase: Phase,
  group: string,
  data: Record<string, unknown>,
  records: Envelope[],
  prior: Submission,
) {
  const edition = requirementsFor(course);
  requireThat(
    !prior.requirements || prior.requirements === edition.version,
    "This submission uses another requirement edition.",
    409,
  );
  if (data.finalEvidence === undefined && prior.finalEvidence)
    return prior.finalEvidence;
  const input = data.finalEvidence === undefined ? {} : obj(data.finalEvidence);
  const files = array(input.files ?? [], 12).map((id) =>
    text(id, "Evidence file identifier", 36, true),
  );
  requireThat(
    new Set(files).size === files.length,
    "Evidence attachments must be distinct.",
  );
  requireThat(
    files.every((id) =>
      records.some((r) => {
        if (r.kind !== "file") return false;
        const f = r.value as CourseFile;
        return (
          f.id === id &&
          f.phase === phase &&
          f.owner === group &&
          f.scope === "technical" &&
          f.purpose === "evidence"
        );
      }),
    ),
    "Choose only this group's technical evidence attachments; private portfolio files cannot be attached.",
  );
  const references: PhaseReference[] = array(input.references ?? [], 2).map(
    (value) => {
      const ref = obj(value);
      requireThat(
        phase === "compare" &&
          (ref.phase === "establish" || ref.phase === "challenge"),
        "Earlier A/B references belong to Compare.",
      );
      const target = records.find(
        (r) =>
          r.kind === "submission" &&
          (r.value as Submission).phase === ref.phase &&
          (r.value as Submission).group === ref.group,
      );
      const submission = target?.value as Submission | undefined;
      requireThat(
        submission?.frozenAt && submission.frozenRevision,
        "Choose an earlier frozen A/B submission.",
      );
      requireThat(
        ref.frozenRevision === submission.frozenRevision,
        "The earlier implementation revision does not match.",
        409,
      );
      return {
        phase: ref.phase,
        group: submission.group,
        frozenRevision: submission.frozenRevision,
      };
    },
  );
  requireThat(
    new Set(references.map((r) => r.phase)).size === references.length,
    "Choose one earlier submission per phase.",
  );
  return {
    index: text(
      input.index ?? "",
      "Completed technical evidence index and limitations",
      8000,
    ),
    files,
    checklist: parseChecklist(
      course,
      phase,
      input.checklist,
      prior.finalEvidence?.checklist ?? prior.checklist,
    ),
    references,
  };
}
