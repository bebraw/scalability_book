import {
  checklistEntries,
  emptyChecklist,
  requirementsFor,
  requirementUrl,
  type EvidenceCheckpoint,
  type PhaseReference,
} from "../../shared/course-requirements.ts";
import {
  title,
  type Course,
  type Envelope,
  type Phase,
  type Submission,
} from "../../shared/course.ts";
import { e, option } from "./course-ui.ts";

export function sourceGuidance() {
  return `<aside class="course-note"><strong>Smallest complete, reproducible source</strong><p>Include source, relevant tests, small synthetic fixtures, manifests and lockfiles, migrations, setup scripts, example configuration and curated technical evidence.</p><p>Leave out node_modules, .venv, .git, caches, reproducible build output, model weights, secrets and personal data. Explain necessary vendored or generated artifacts in the setup instructions.</p><p>Inspect the archive before uploading. The course server stores it without executing its code; a small archive does not establish correctness or safety.</p></aside>`;
}

const statusLabel = {
  unindexed: "Not indexed",
  located: "Evidence located",
  missing: "Missing / incomplete",
};
export function checklistMarkup(
  course: Course,
  phase: Phase,
  saved?: EvidenceCheckpoint[],
  editable = false,
) {
  const edition = requirementsFor(course);
  const items = saved ?? emptyChecklist(course, phase);
  const renderEntries = (ids: string[]) =>
    checklistEntries(course, phase)
      .filter((r) => ids.includes(r.id))
      .map((r) => {
        const item = items.find((i) => i.id === r.id) ?? {
          id: r.id,
          status: "unindexed",
          location: "",
        };
        const link = `<a href="${requirementUrl(edition.version, r.document, r.anchor)}" target="_blank" rel="noopener noreferrer">Read the requirement ↗</a>`;
        return editable
          ? `<fieldset class="course-checkpoint"><legend>${e(r.title)}</legend><p>${e(r.detail)} ${link}</p><label class="course-field">${e(r.title)} evidence status<select aria-label="${e(r.title)} evidence status" name="checkpoint-${e(r.id)}">${Object.entries(
              statusLabel,
            )
              .map(([value, label]) => option(value, label, item.status))
              .join(
                "",
              )}</select></label><label class="course-field">${e(r.title)} evidence location or missing-work note<input aria-label="${e(r.title)} evidence location or missing-work note" aria-describedby="checkpoint-hint-${e(r.id)}" name="location-${e(r.id)}" maxlength="500" value="${e(item.location)}"><small id="checkpoint-hint-${e(r.id)}">One artifact can satisfy several entries. For missing work, state what remains.</small></label></fieldset>`
          : `<div class="course-checkpoint"><h5>${e(r.title)}</h5><p>${e(r.detail)} ${link}</p><p><strong>${statusLabel[item.status]}</strong>${item.location ? ` · ${e(item.location)}` : ""}</p></div>`;
      })
      .join("");
  return `<div class="course-checklist"><p class="course-muted">Requirements ${e(edition.version)} · <a href="${requirementUrl(edition.version, "grading")}" target="_blank" rel="noopener noreferrer">Run's published rubric ↗</a></p><p>These entries locate evidence. They do not award points or establish quality. Declare missing measurements honestly; keep individual portfolios separate.</p><details><summary>Common requirements · ${edition.common.length} entries</summary>${renderEntries(edition.common.map((r) => r.id))}</details><details><summary>${title(phase)} requirements · ${edition.phases[phase].length} entries</summary>${renderEntries(edition.phases[phase].map((r) => r.id))}</details></div>`;
}

export function checklistPayload(
  course: Course,
  phase: Phase,
  values: FormData,
): EvidenceCheckpoint[] {
  return checklistEntries(course, phase).map((r) => ({
    id: r.id,
    status: String(
      values.get(`checkpoint-${r.id}`) ?? "unindexed",
    ) as EvidenceCheckpoint["status"],
    location: String(values.get(`location-${r.id}`) ?? ""),
  }));
}

export function earlierReferences(
  phase: Phase,
  submissions: Envelope<Submission>[],
  saved: PhaseReference[] = [],
) {
  if (phase !== "compare") return "";
  return `<fieldset><legend>Earlier A and B submissions</legend><p>Link the existing frozen records and their evidence. You do not need to upload their archives again; declare a missing reference in the checklist.</p>${(
    ["establish", "challenge"] as const
  )
    .map(
      (p, i) =>
        `<label class="course-field">Earlier ${i === 0 ? "A" : "B"} submission<select aria-label="Earlier ${i === 0 ? "A" : "B"} submission" name="reference-${p}">${option("", "Not linked / unavailable", "")}${submissions
          .filter((r) => r.value.phase === p && r.value.frozenRevision)
          .map((r) =>
            option(
              r.value.group,
              `${r.value.group} · ${r.value.commit.slice(0, 12)}`,
              saved.find((ref) => ref.phase === p)?.group ?? "",
            ),
          )
          .join("")}</select></label>`,
    )
    .join("")}</fieldset>`;
}
export function referencePayload(
  values: FormData,
  submissions: Envelope<Submission>[],
): PhaseReference[] {
  return (["establish", "challenge"] as const).flatMap((phase) => {
    const group = values.get(`reference-${phase}`);
    if (!group) return [];
    const submission = submissions.find(
      (r) => r.value.phase === phase && r.value.group === group,
    )!.value;
    return [
      {
        phase,
        group: submission.group,
        frozenRevision: submission.frozenRevision!,
      },
    ];
  });
}
export function referenceLinks(references: PhaseReference[] = []) {
  return references
    .map(
      (ref) =>
        `<p><button type="button" class="course-quiet" data-reference-phase="${ref.phase}" data-reference-group="${e(ref.group)}">Open earlier ${ref.phase === "establish" ? "A" : "B"} submission · ${e(ref.group)}</button><small>Frozen revision ${e(ref.frozenRevision)}</small></p>`,
    )
    .join("");
}
