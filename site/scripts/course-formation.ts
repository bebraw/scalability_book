import type { Course, Envelope, Phase } from "../../shared/course.ts";
import {
  groupLabel,
  proposalAllocation,
  type WorkingAgreement,
} from "../../shared/course-formation.ts";
import { e, field, input, localDate } from "./course-ui.ts";

const names = (course: Course, members: string[]) =>
  members
    .map(
      (id) =>
        course.students.find((s) => s.id === id)?.name ?? "Unknown student",
    )
    .join(", ");
const when = (value: string) => new Date(value).toLocaleString();
const hidden = (name: string, value: string) =>
  `<input type="hidden" name="${name}" value="${e(value)}">`;

export function staffFormation(course: Course, phase: Phase, now: string) {
  const setup = course.phases[phase],
    formation = setup.formation;
  const deadline =
    formation?.deadline ??
    new Date(
      Math.min(
        Date.parse(now) + 7 * 86400000,
        Date.parse(setup.freezeAt) - 3 * 86400000,
      ),
    ).toISOString();
  const correction =
    formation?.correctionUntil ??
    new Date(Date.parse(deadline) + 2 * 86400000).toISOString();
  return `<aside class="course-note"><h4>Formation and publication</h4><p>Target three members. A fourth or a smaller continuing group needs an explicit instructor exception. Proposals do not grant submission access.</p><form data-form="formation"><div class="course-deadline-inputs">${input("deadline", "Group formation deadline", localDate(deadline), true, "datetime-local")}${input("correctionUntil", "Group correction window ends", localDate(correction), true, "datetime-local")}</div>${input("reason", "Formation change reason", "")}<div class="course-form-actions"><button type="submit" value="dates">${formation ? "Save formation dates" : "Open group formation"}</button><button type="submit" value="publish" ${formation?.publishedAt ? "disabled" : ""}>Publish approved groups</button></div></form><p>${formation?.publishedAt ? `Groups published ${e(when(formation.publishedAt))}; corrections requested by ${e(when(formation.correctionUntil))}.` : formation ? `Students can propose or request allocation until ${e(when(formation.deadline))}. Save the allocation below, then publish it.` : "Open formation before creating the initial allocation. Retained legacy allocations remain active."}</p></aside>
  ${
    formation
      ? `<h4>Student proposals</h4><div class="course-group-grid">${
          formation.proposals
            .filter((p) => !p.closed)
            .map((p) => {
              const allocated = proposalAllocation(course, phase, p);
              const ready = p.members.every((s) => p.confirmed.includes(s));
              return `<article class="course-note"><h5>${e(p.name || "Proposed group")}</h5><p>${e(names(course, p.members))}</p><p>${p.confirmed.length}/${p.members.length} confirmed${allocated ? ` · allocated to ${e(groupLabel(allocated))}` : p.members.length < 3 ? " · awaiting more members" : ""}.</p><button type="button" class="course-quiet" data-allocate-proposal="${e(p.id)}" ${!ready || allocated ? "disabled" : ""}>Add proposal to allocation</button></article>`;
            })
            .join("") || "<p>No pending proposals.</p>"
        }</div><details><summary>Private matching notes and allocation requests</summary><div class="course-table-scroll" tabindex="0" role="region" aria-label="Private allocation notes"><table class="course-table"><caption>Visible only to course staff</caption><thead><tr><th>Student</th><th>Request</th><th>Meeting availability</th><th>Support constraints</th></tr></thead><tbody>${formation.preferences.map((p) => `<tr><th>${e(names(course, [p.student]))}</th><td>${p.request === "assign" ? "Assign me a group" : "No allocation request"}${p.available ? " · directory opt-in" : ""}</td><td class="course-evidence">${e(p.availability)}</td><td class="course-evidence">${e(p.support)}</td></tr>`).join("") || '<tr><td colspan="4">No matching notes yet.</td></tr>'}</tbody></table></div></details>`
      : ""
  }`;
}

function agreement(
  course: Course,
  phase: Phase,
  student: string,
  records: Envelope<WorkingAgreement>[],
) {
  const group = course.phases[phase].groups.find((g) =>
    g.members.includes(student),
  );
  if (!group) return "";
  const record = records.find(
    (r) => r.value.phase === phase && r.value.group === group.id,
  );
  return `<aside class="course-note"><h4>${e(groupLabel(group))}: working agreement</h4><p>Agree briefly on availability, communication and handling missed commitments. This helps the team work; it is not graded.</p><form data-form="working-agreement">${hidden("group", group.id)}${hidden("expected", record?.revision ?? "")}${field("text", "Our team working agreement", record?.value.text ?? "", 2000, true)}<button type="submit">Save working agreement</button></form></aside>`;
}

export function studentGroups(
  course: Course,
  phase: Phase,
  student: string,
  now: string,
  agreements: Envelope<WorkingAgreement>[],
) {
  const setup = course.phases[phase],
    formation = setup.formation;
  const published = !formation || Boolean(formation.publishedAt);
  const heading = `<section class="course-section"><h3>${phase.charAt(0).toUpperCase() + phase.slice(1)} group formation</h3><p>Groups normally have three members, with at most four after instructor approval. Everyone confirms a proposal; the proposer is not a permanent team leader.</p>`;
  const allocation = `<h4>Approved groups</h4>${published && setup.groups.length ? `<ul>${setup.groups.map((g) => `<li><strong>${e(groupLabel(g))}</strong>: ${e(names(course, g.members))}${g.members.includes(student) ? " · your group" : ""}</li>`).join("")}</ul>` : "<p>The instructor has not published this phase's allocation yet.</p>"}${formation?.publishedAt ? `<p>Request a correction from your instructor by ${e(when(formation.correctionUntil))}. Later membership changes also need instructor approval.</p>` : ""}${published ? agreement(course, phase, student, agreements) : ""}`;
  if (!formation)
    return `${heading}<p>Your instructor has not opened a student proposal period for this phase. Existing approved groups appear below.</p>${allocation}</section>`;
  const closed = Boolean(formation.publishedAt) || now >= formation.deadline;
  const preference = formation.preferences.find((p) => p.student === student);
  const own = [...formation.proposals]
    .reverse()
    .find((p) => p.proposer === student && !p.closed);
  if (closed)
    return `${heading}<p>${formation.publishedAt ? "Your instructor has published the allocation." : "The proposal deadline has passed; your instructor is reviewing the allocation."} Contact your instructor for a correction.</p>${allocation}<details><summary>Your earlier formation requests</summary>${preference ? `<p>Allocation request: ${preference.request === "assign" ? "Assign me a group" : "Student proposal"}.</p><p class="course-evidence">Your private availability: ${e(preference.availability || "None supplied")}</p><p class="course-evidence">Your private matching constraints: ${e(preference.support || "None supplied")}</p>` : ""}${
      formation.proposals
        .filter((p) => !p.closed)
        .map(
          (p) =>
            `<p><strong>${e(p.name || "Proposal")}</strong>: ${e(names(course, p.members))}. Confirmed: ${e(names(course, p.confirmed))}.</p>`,
        )
        .join("") || "<p>No proposal history.</p>"
    }</details></section>`;
  return `${heading}<p>Formation deadline: <strong>${e(when(formation.deadline))}</strong>. ${closed ? "The proposal period is closed; contact your instructor for allocation or a correction." : "A pair can propose together and ask the instructor to find a third member."}</p>
  <form data-form="group-preference"><fieldset ${closed ? "disabled" : ""}><legend>Allocation and private matching notes</legend>${hidden("expected", preference?.revision ?? "")}<label class="course-field">Instructor allocation<select name="request"><option value="none" ${preference?.request !== "assign" ? "selected" : ""}>I am arranging a proposal</option><option value="assign" ${preference?.request === "assign" ? "selected" : ""}>Assign me a group</option></select></label><label class="course-check"><input type="checkbox" name="available" ${preference?.available ? "checked" : ""}> Show my name as available to join a group</label>${field("availability", "Meeting availability (private to you and staff)", preference?.availability ?? "", 1000)}${field("support", "Relevant support or matching constraints (private to you and staff)", preference?.support ?? "", 1000)}<button type="submit">Save allocation preference</button></fieldset></form>
  <aside class="course-note"><h4>Names available to join</h4><p>${e(
    names(
      course,
      formation.preferences
        .filter((p) => p.available && p.student !== student)
        .map((p) => p.student),
    ) || "Nobody else has opted in yet.",
  )}</p><p>Institutional contact details and private matching notes are not shared.</p></aside>
  <form data-form="group-proposal"><fieldset ${closed ? "disabled" : ""}><legend>${own ? "Your pending proposal" : "Propose a group"}</legend>${hidden("proposal", own?.id ?? "")}${hidden("expected", own?.revision ?? "")}${input("name", "Optional group display name", own?.name ?? "", false)}<label class="course-field">Proposed teammates<select multiple name="members" size="5">${course.students
    .filter((s) => s.id !== student)
    .map(
      (s) =>
        `<option value="${e(s.id)}" ${own?.members.includes(s.id) ? "selected" : ""}>${e(s.name)}</option>`,
    )
    .join(
      "",
    )}</select><small>You are included automatically. Choose up to three teammates with Command/Ctrl-click. A fourth member needs an instructor exception.</small></label><p>Editing a proposal asks everyone to confirm again. A proposal does not create an approved group.</p><div class="course-form-actions"><button type="submit" value="save">${own ? "Update proposal" : "Submit proposal"}</button>${own ? '<button type="submit" value="close" class="course-quiet">Withdraw proposal</button>' : ""}</div></fieldset></form>
  <h4>Your invitations and confirmations</h4><div class="course-group-grid">${
    formation.proposals
      .filter((p) => !p.closed)
      .map((p) => {
        const allocated = proposalAllocation(course, phase, p);
        return `<article class="course-note"><h5>${e(p.name || "Group proposal")}</h5><p>${e(names(course, p.members))}</p><p>Confirmed: ${e(names(course, p.confirmed))}. ${allocated ? `Approved as ${e(groupLabel(allocated))}.` : "Awaiting instructor allocation and publication."}</p>${!allocated ? `<form data-form="group-confirmation">${hidden("proposal", p.id)}${hidden("expected", p.revision)}<div class="course-form-actions"><button type="submit" value="confirm" ${closed || p.confirmed.includes(student) ? "disabled" : ""}>Confirm participation</button><button type="submit" value="decline" class="course-quiet" ${closed ? "disabled" : ""}>Decline participation</button></div></form>` : ""}</article>`;
      })
      .join("") || "<p>No pending invitations.</p>"
  }</div>${allocation}</section>`;
}
