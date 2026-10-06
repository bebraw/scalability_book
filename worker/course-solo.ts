import type {
  Audit,
  Course,
  Envelope,
  Phase,
  Submission,
} from "../shared/course.ts";
import { soloGroup, type SoloReview } from "../shared/course-solo.ts";
import { obj, requireThat, text, Problem } from "./course-validation.ts";

export function parseSoloReview(
  course: Course,
  records: Envelope[],
  phase: Phase,
  group: string,
  value: unknown,
  now: string,
): SoloReview {
  requireThat(
    soloGroup(course, phase, group),
    "Allocate the approved solo route first.",
    409,
  );
  const data = obj(value),
    reference = obj(data.reference);
  const assignedGroup = course.phases[phase].audits.some(
    (a) => a.from === group,
  );
  const repository = text(
    reference.repository,
    "Reference repository HTTPS URL",
    1000,
    !assignedGroup,
  );
  let url: URL;
  try {
    url = new URL(repository || "https://example.invalid/");
  } catch {
    throw new Problem("Use a valid HTTPS reference repository URL.");
  }
  requireThat(
    url.protocol === "https:" && !url.username && !url.password && !url.hash,
    "Use an HTTPS reference repository without credentials or a fragment.",
  );
  const commit = text(
    reference.commit,
    "Full reference commit hash",
    64,
    !assignedGroup,
  ).toLowerCase();
  requireThat(
    (assignedGroup && !commit) ||
      /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit),
    "Supply the full reference commit hash.",
  );
  const source = records.find(
    (r) =>
      r.kind === "submission" &&
      (r.value as Submission).phase === phase &&
      (r.value as Submission).group === group,
  ) as Envelope<Submission> | undefined;
  requireThat(
    !commit || source?.value.commit.toLowerCase() !== commit,
    "The solo audit must inspect a different implementation.",
  );
  const nextReference = {
    repository,
    commit,
    setup: text(
      reference.setup,
      "Reference setup and validation",
      4000,
      !assignedGroup,
    ),
    probe: text(
      reference.probe,
      "Released change probe and audit tool policy",
      4000,
      !assignedGroup,
    ),
  };
  const previous = records.find(
    (r) =>
      r.kind === "solo-review" &&
      (r.value as SoloReview).phase === phase &&
      (r.value as SoloReview).group === group,
  ) as Envelope<SoloReview> | undefined;
  requireThat(
    !previous?.value.reference.commit ||
      !source?.value.frozenAt ||
      JSON.stringify(nextReference) ===
        JSON.stringify(previous.value.reference),
    "The reference assignment is retained once the student's implementation freezes.",
    409,
  );
  const report = text(data.report, "Incoming independent audit", 10000);
  const reviewer = text(data.reviewer, "Independent human reviewer", 200, true);
  requireThat(
    !report || source?.value.frozenRevision,
    "Freeze the student's implementation before recording its independent audit.",
    409,
  );
  return {
    phase,
    group,
    reference: nextReference,
    reviewer,
    checkIn: text(
      data.checkIn,
      "Instructor discussion: prediction, challenge, checks and acceptance",
      4000,
    ),
    report,
    targetRevision: report ? source!.value.frozenRevision : null,
    reviewedAt: report ? now : null,
  };
}

export function soloReviewReady(
  review: SoloReview | undefined,
  audit: Audit | undefined,
  submission: Submission | undefined,
) {
  return Boolean(
    review?.checkIn &&
    review.report &&
    review.reviewer &&
    review.targetRevision === submission?.frozenRevision &&
    audit?.submittedAt &&
    (audit.reference ? audit.targetRevision === review.reference.commit : true),
  );
}
