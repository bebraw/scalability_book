import type { Envelope } from "../../shared/course.ts";
import type { SoloReview } from "../../shared/course-solo.ts";
import { e, field, input } from "./course-ui.ts";

export function soloReviewForm(
  record: Envelope<SoloReview> | undefined,
  assignedGroup = false,
) {
  const value = record?.value;
  return `<details open class="course-note"><summary>Solo route: independent review and reference audit</summary><p>Arrange a human reviewer. Supply a reproducible reference implementation when no course group is assigned for the outgoing audit. The student receives the reference and probe when the audit window opens. Record the instructor discussion and incoming audit after they take place.</p><form data-form="solo-review">
  ${input("reviewer", "Independent human reviewer", value?.reviewer ?? "")}
  ${input("referenceRepository", "Reference repository HTTPS URL", value?.reference.repository ?? "", !assignedGroup, "url")}
  ${input("referenceCommit", "Full reference commit hash", value?.reference.commit ?? "", !assignedGroup)}
  ${field("referenceSetup", "Reference setup and validation", value?.reference.setup ?? "", 4000, !assignedGroup)}
  ${field("referenceProbe", "Released change probe and audit tool policy", value?.reference.probe ?? "", 4000, !assignedGroup)}
  ${field("checkIn", "Instructor discussion: prediction, challenge, checks and acceptance", value?.checkIn ?? "", 4000)}
  ${field("incomingReport", "Incoming independent audit: setup, timing, prior exposure, checks and findings", value?.report ?? "", 10000)}
  ${input("reason", "Solo review arrangement or correction reason", "")}
  <button type="submit">Save solo review</button></form></details>`;
}

export function referenceAudit(
  record: Envelope<SoloReview> | undefined,
  report: string,
  staff: boolean,
) {
  const reference = record?.value.reference;
  const available = Boolean(reference?.commit);
  return `<h3>Assigned reference audit</h3><p>Inspect the supplied frozen implementation in a disposable checkout. Record prior exposure, setup time separately from the 30-minute change probe, tool use, checks, findings and incomplete work.</p>${available ? `<p><a href="${e(reference!.repository)}" target="_blank" rel="noopener noreferrer">Reference repository ↗</a> · <code>${e(reference!.commit)}</code></p><h4>Setup and validation</h4><p class="course-evidence">${e(reference!.setup)}</p><h4>Change probe and tool policy</h4><p class="course-evidence">${e(reference!.probe)}</p><form data-form="audit">${field("report", "Audit report: setup, timing, prior inspection, change probe, findings and evidence", report, 10000, true)}${staff ? input("reason", "Staff audit reason", "") : ""}<button type="submit">Submit reference audit</button></form>` : '<aside class="course-note">Staff must arrange the reference audit. Its repository and probe become available when the audit window opens.</aside>'}`;
}
