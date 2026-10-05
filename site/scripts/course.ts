import { e, option, field, input } from "./course-ui.ts";
import { courseSignIn } from "./course-signin.ts";
import { rosterHeaders } from "../../shared/course-roster.ts";
import {
  administrationSections,
  type AdministrationRevisions,
  type RosterPreview,
  type AccessActivity,
} from "../../shared/course-administration.ts";
import {
  administrationNavigation,
  renderAdministration,
  administrationPayload,
  groupRow,
  previewMarkup,
  mappingMarkup,
} from "./course-administration.ts";
import {
  phases,
  title,
  projectCriteria,
  individualCriteria,
  lectureCriteria,
  emptyPortfolio,
  type Phase,
  type Course,
  type Envelope,
  type Submission,
  type Portfolio,
  type Audit,
  type Grade,
  type CourseFile,
  type Student,
  type Result,
} from "../../shared/course.ts";
interface View {
  config: Envelope<Course>;
  administration?: AdministrationRevisions;
  access?: AccessActivity[];
  staff: boolean;
  user: { id: string; login: string };
  now: string;
  submissions: Envelope<Submission>[];
  portfolios: Envelope<Portfolio>[];
  audits: Envelope<Audit>[];
  projects: Envelope<Grade>[];
  individuals: Envelope<Grade>[];
  files: Envelope<CourseFile>[];
  results: { student: Student; result: Result }[];
}
interface Listing {
  canCreate: boolean;
  user?: { id: string; login: string };
  courses: { id: string; name: string; staff: boolean }[];
}
const root = document.querySelector<HTMLElement>("[data-course-app]")!;
const content = root.querySelector<HTMLElement>("[data-course-content]")!;
const notice = root.querySelector<HTMLElement>("[data-course-notice]")!;
let listing: Listing = { canCreate: false, courses: [] };
let view: View | null = null;
let phase: Phase = "establish";
let tab = "overview";
let selectedGroup = "";
let selectedStudent = "";
let dirty = false;
let pending = false;
let local = false;
let githubLoginUrl: string | null = null;
let loginToken = new URLSearchParams(location.hash.slice(1)).get("login");
if (loginToken)
  history.replaceState(null, "", location.pathname + location.search);
const when = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
const route = (action: string, subject = "") =>
  `/api/courses/${view!.config.value.id}/${action}/${phase}${subject ? `/${encodeURIComponent(subject)}` : ""}`;
const revision = (r?: Envelope) => r?.revision ?? null;
const fileLink = (f: CourseFile) =>
  `<a href="${route("files", f.id)}">${e(f.name)}</a> <small>${(f.bytes / 1024).toFixed(0)} KiB · SHA-256 <code>${e(f.sha256)}</code></small>`;
const historyButton = (record?: Envelope) =>
  view!.staff && record
    ? `<button type="button" class="course-quiet" data-history="${e(record.key)}">Record history</button>`
    : "";
function tell(message: string, error = false) {
  notice.textContent = message;
  notice.classList.toggle("course-error", error);
}
window.addEventListener("hashchange", () => {
  const token = new URLSearchParams(location.hash.slice(1)).get("login");
  if (!token) return;
  loginToken = token;
  history.replaceState(null, "", location.pathname + location.search);
  if (!allowNavigation()) {
    tell(
      "The sign-in link is ready. Finish your changes, then choose Email sign-in.",
    );
    return;
  }
  dirty = false;
  content.innerHTML = courseSignIn("", githubLoginUrl, local, loginToken);
  tell("Confirm the sign-in link to open your course.");
});
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data as T;
}
function allowNavigation() {
  if (pending) {
    tell("Wait for the current save or upload to finish.");
    return false;
  }
  return !dirty || window.confirm("You have unsaved changes. Leave this form?");
}
async function openCourse(id: string) {
  view = await api<View>(`/api/courses/${id}`);
  const listed = listing.courses.find((course) => course.id === id);
  if (listed) listed.name = view.config.value.name;
  const url = new URL(location.href);
  url.searchParams.set("course", id);
  history.replaceState(null, "", url);
  const config = view.config.value;
  const myGroup = config.phases[phase].groups.find((g) =>
    g.members.includes(view!.user.id),
  );
  if (!config.phases[phase].groups.some((g) => g.id === selectedGroup))
    selectedGroup =
      (view.staff ? config.phases[phase].groups[0] : myGroup)?.id ?? "";
  if (!config.students.some((s) => s.id === selectedStudent))
    selectedStudent =
      (view.staff ? config.students[0]?.id : view.user.id) ?? "";
  dirty = false;
  render();
}
function header() {
  const course = view!.config.value;
  return `<div class="course-toolbar"><label>Course run <select data-course-select>${listing.courses.map((c) => option(c.id, c.name, course.id)).join("")}</select></label><a href="/project/introduction/">Project guide ↗</a><a href="/project/grading/">Published rubric ↗</a><button type="button" class="course-quiet" data-refresh>Refresh records</button><button type="button" class="course-quiet" data-back>All courses</button><button type="button" class="course-quiet" data-email-login>Email sign-in</button><button type="button" class="course-quiet" data-course-logout>Sign out</button></div>
  <div class="course-heading"><div><p class="course-eyebrow">${view!.staff ? "Instructor workspace" : "Student workspace"}${local ? " · Local development" : ""}</p><h2>${e(course.name)}</h2></div><p class="course-identity">Signed in as <strong>${e(view!.user.login)}</strong></p></div>
  <div class="course-phases" role="group" aria-label="Project phase">${phases.map((p, i) => `<button type="button" data-phase="${p}" aria-pressed="${phase === p}"><span>0${i + 1}</span> ${title(p)} <small>${course.phases[p].published ? "Results released" : "Results pending"}</small></button>`).join("")}</div>
  <nav class="course-tabs" aria-label="Course workspace">${[
    ["overview", view!.staff ? "Review queue" : "My progress"],
    ["submission", "Group submission"],
    ["portfolio", view!.staff ? "Private portfolios" : "My portfolio"],
    ["audit", "Assigned audit"],
    ["gallery", "Class submissions"],
    ...(view!.staff
      ? [
          ["gradebook", "Gradebook"],
          ["students", "Administration"],
        ]
      : []),
  ]
    .map(
      ([id, label]) =>
        `<button type="button" data-tab="${id}" ${tab === id || (id === "students" && administrationSections.includes(tab as (typeof administrationSections)[number])) ? 'aria-current="page"' : ""}>${label}</button>`,
    )
    .join(
      "",
    )}</nav>${view!.staff && administrationSections.includes(tab as (typeof administrationSections)[number]) ? administrationNavigation(tab) : ""}`;
}
function resultMarkup(result: Result) {
  return `<div class="course-result"><div><span class="course-score">${result.earned}<small> / ${result.available}</small></span><p>${result.percentage.toFixed(1)}% · ${result.status === "pending" ? "Assessment pending" : result.status === "fail" ? "Passing requirements unmet" : `Grade ${result.grade}`}</p></div><div><p><strong>Each phase requires</strong> 10 project points, two complete lecture activities, a submitted self/peer assessment earning 6 points, and 1 contribution point. Approved arrangements appear below.</p>${result.pending.length ? `<p class="course-muted">Pending: ${e(result.pending.join("; "))}.</p>` : ""}${result.unmet.length ? `<ul class="course-unmet">${result.unmet.map((s) => `<li>${e(s)}</li>`).join("")}</ul>` : ""}</div></div>
  <div class="course-table-scroll" tabindex="0" role="region" aria-label="Scrollable assessment table"><table class="course-table"><caption>Points and mandatory work by phase</caption><thead><tr><th>Phase</th><th>Project /30</th><th>Lecture /9</th><th>Complete /3</th><th>Assessment /12</th><th>Contribution /3</th></tr></thead><tbody>${result.breakdown.map((b) => `<tr><th>${title(b.phase)}${!b.published ? " · unreleased" : ""}</th><td>${b.project ?? "Pending"}</td><td>${b.lecture ?? "Pending"}</td><td>${b.completed ?? "Pending"}</td><td>${b.assessment ?? "Pending"}</td><td>${b.contribution ?? "Pending"}</td></tr>`).join("")}</tbody></table></div>`;
}
function assessmentCriteria(phase: Phase, project: boolean) {
  return project
    ? projectCriteria(phase)
    : [
        ...[1, 2, 3].flatMap((n) =>
          lectureCriteria.map((c) => [`Lecture ${n}: ${c[0]}`, c[1]] as const),
        ),
        ...individualCriteria,
      ];
}
function feedbackCard(record: Envelope<Grade>, project: boolean) {
  const g = record.value;
  const evidence = (project ? view!.submissions : view!.portfolios).find(
    (r) =>
      r.value.phase === g.phase &&
      (project
        ? (r.value as Submission).group
        : (r.value as Portfolio).student) === g.subject,
  );
  const stale = g.evidenceRevision !== (evidence?.revision ?? null);
  return `<details><summary>${title(g.phase)} ${project ? "group" : "private"} assessment${stale ? " · previous evidence; reassessment pending" : ""}</summary><p class="course-muted">Assessed ${e(when(record.updatedAt))}. ${g.missing ? "Missing work was explicitly assessed." : ""}</p><div class="course-table-scroll" tabindex="0" role="region" aria-label="Scrollable assessment table"><table class="course-table"><caption>${project ? "Project" : "Individual"} criterion scores</caption><thead><tr><th>Criterion</th><th>Score</th></tr></thead><tbody>${assessmentCriteria(
    g.phase,
    project,
  )
    .map(
      ([label, max], i) =>
        `<tr><th>${e(label)}</th><td>${g.scores[i]} / ${max}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><h4>Feedback and reasons</h4><p class="course-evidence">${e(g.feedback)}</p>${g.reason ? `<p>Assessment record reason: ${e(g.reason)}</p>` : ""}</details>`;
}
function overview() {
  const v = view!,
    course = v.config.value,
    schedule = course.phases[phase];
  if (!v.staff) {
    const r = v.results[0];
    return `<section class="course-section"><h3>My course progress</h3>${r ? resultMarkup(r.result) : "<p>Your instructor has not added your assessment record.</p>"}${course.adjustments
      .filter((a) => a.student === v.user.id)
      .map(
        (a) =>
          `<aside class="course-note"><strong>${title(a.phase)} approved arrangement</strong><p>${e(a.reason)}</p><p>Lecture activities: ${a.lectureMinimum}; assessment minimum: ${a.assessmentMinimum}; contribution minimum: ${a.contributionMinimum}; available individual points: ${a.availablePoints}.</p></aside>`,
      )
      .join(
        "",
      )}${v.projects.map((g) => feedbackCard(g, true)).join("")}${v.individuals.map((g) => feedbackCard(g, false)).join("")}</section>`;
  }
  const frozen = v.submissions.filter(
    (r) => r.value.phase === phase && r.value.frozenAt,
  ).length;
  const submitted = v.portfolios.filter(
    (r) => r.value.phase === phase && r.value.submittedAt,
  ).length;
  const graded =
    v.projects.filter((r) => r.value.phase === phase).length +
    v.individuals.filter((r) => r.value.phase === phase).length;
  return `<section class="course-section"><div class="course-section-heading"><h3>${title(phase)} review queue</h3><button type="button" data-tab="schedule" class="course-quiet">Manage this phase</button></div>
  <div class="course-metrics"><div><strong>${frozen}<span> / ${schedule.groups.length}</span></strong><p>Implementations frozen</p></div><div><strong>${submitted}<span> / ${course.students.length}</span></strong><p>Private portfolios submitted</p></div><div><strong>${graded}<span> / ${schedule.groups.length + course.students.length}</span></strong><p>Assessments recorded</p></div></div>
  <div class="course-deadlines"><p><strong>Implementation</strong>${when(schedule.freezeAt)}</p><p><strong>Audit closes / class access opens</strong>${when(schedule.auditAt)}</p><p><strong>Evidence & portfolios</strong>${when(schedule.evidenceAt)}</p></div>
  ${!course.students.length ? '<aside class="course-note">Start in Students: import the roster, then form groups and prepare phase deadlines and audits.</aside>' : ""}
  ${
    course.students.some(
      (s) => !schedule.groups.some((g) => g.members.includes(s.id)),
    )
      ? `<aside class="course-note"><strong>Students awaiting a group</strong><p>${e(
          course.students
            .filter(
              (s) => !schedule.groups.some((g) => g.members.includes(s.id)),
            )
            .map((s) => s.name)
            .join(", "),
        )}</p><button type="button" data-tab="groups" class="course-quiet">Allocate groups</button></aside>`
      : ""
  }
  ${schedule.groups.some((g) => !schedule.audits.some((a) => a.from === g.id) || !schedule.audits.some((a) => a.to === g.id)) ? '<aside class="course-note"><strong>Audit arrangements incomplete</strong><p>Each group needs an incoming and outgoing audit, or a staff-arranged fallback.</p><button type="button" data-tab="schedule" class="course-quiet">Arrange audits</button></aside>' : ""}
  <div class="course-table-scroll" tabindex="0" role="region" aria-label="Scrollable assessment table"><table class="course-table"><caption>Group review status</caption><thead><tr><th>Group</th><th>Implementation</th><th>Incoming audit</th><th>Author response</th><th>Assessment</th><th>Review</th></tr></thead><tbody>${schedule.groups
    .map((g) => {
      const s = v.submissions.find(
          (r) => r.value.phase === phase && r.value.group === g.id,
        ),
        a = v.audits.find(
          (r) => r.value.phase === phase && r.value.to === g.id,
        ),
        grade = v.projects.find(
          (r) => r.value.phase === phase && r.value.subject === g.id,
        );
      return `<tr><th>${e(g.id)}</th><td>${s?.value.frozenAt ? "Frozen" : s ? "Draft" : "Missing"}</td><td>${a ? "Submitted" : "Missing"}</td><td>${s?.value.submittedAt ? "Submitted" : "Pending"}</td><td>${grade ? (grade.value.evidenceRevision !== (s?.revision ?? null) ? "Needs reassessment" : `${grade.value.scores.reduce((a, b) => a + b, 0)}/30`) : "Ungraded"}</td><td><button type="button" data-review-group="${e(g.id)}">Review</button></td></tr>`;
    })
    .join("")}</tbody></table></div>
  <div class="course-table-scroll" tabindex="0" role="region" aria-label="Scrollable assessment table"><table class="course-table"><caption>Individual review status · private to staff</caption><thead><tr><th>Student</th><th>Portfolio</th><th>Assessment</th><th>Course status</th><th>Review</th></tr></thead><tbody>${course.students
    .map((s) => {
      const p = v.portfolios.find(
          (r) => r.value.phase === phase && r.value.student === s.id,
        ),
        g = v.individuals.find(
          (r) => r.value.phase === phase && r.value.subject === s.id,
        ),
        r = v.results.find((r) => r.student.id === s.id)?.result;
      return `<tr><th>${e(s.name)}<small>${e(s.number)}</small></th><td>${p?.value.submittedAt ? "Submitted" : p ? "Draft" : "Missing"}</td><td>${g ? (g.value.evidenceRevision !== (p?.revision ?? null) ? "Needs reassessment" : "Recorded") : "Ungraded"}</td><td>${e(r?.status ?? "pending")}</td><td><button type="button" data-review-student="${e(s.id)}">Review</button></td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}
function groupPicker() {
  return view!.staff
    ? `<label class="course-inline-field">Group <select data-group-select>${view!.config.value.phases[phase].groups.map((g) => option(g.id, g.id, selectedGroup)).join("")}</select></label>`
    : `<p class="course-eyebrow">Group ${e(selectedGroup)}</p>`;
}
function studentPicker() {
  return view!.staff
    ? `<label class="course-inline-field">Student <select data-student-select>${view!.config.value.students.map((s) => option(s.id, `${s.name} · ${s.number}`, selectedStudent)).join("")}</select></label>`
    : "";
}
function upload(scope: "private" | "technical") {
  return `<label class="course-field">${scope === "private" ? "Attach written, audio or video evidence" : "Upload source archive"}<input type="file" data-upload="${scope}" ${scope === "technical" ? 'accept=".zip,.tar,.tgz,.gz"' : ""}><small>Maximum 20 MiB per file. ${scope === "private" ? "Visible only to you and course staff." : "Archive should match the full commit hash; include setup and evidence."} Upload first, then save the form.</small></label>`;
}
function gradeForm(
  kind: "project-grade" | "individual-grade",
  subject: string,
) {
  const g = (
    kind === "project-grade" ? view!.projects : view!.individuals
  ).find((r) => r.value.phase === phase && r.value.subject === subject);
  const p = kind === "project-grade";
  const criteria = assessmentCriteria(phase, p);
  return `<form data-form="${kind}" class="course-grade-form"><h4>${p ? "Group project assessment" : "Private individual assessment"}</h4><p>Use the <a href="/project/grading/">published rubric</a>. Participation needs recorded live or remote evidence; contribution is an instructor judgment supported by the portfolio and project history.</p>
  <fieldset class="course-score-grid"><legend>Criterion scores</legend>${criteria.map(([label, max], i) => `<label>${e(label)}<span><input type="number" name="score-${i}" min="0" max="${max}" step="1" value="${g?.value.scores[i] ?? ""}" required aria-label="${e(label)} score"> / ${max}</span></label>`).join("")}</fieldset>
  <label class="course-check"><input type="checkbox" name="missing" ${g?.value.missing ? "checked" : ""}> Explicitly record missing work (all scores must be zero)</label>
  ${field("feedback", "Criterion reasons, feedback and missing evidence", g?.value.feedback ?? "", 8000, true)}
  ${input("reason", g ? "Reason for this assessment correction" : "Assessment record reason", "")}
  <div class="course-form-actions"><button type="submit">${g ? "Save corrected assessment" : "Record assessment"}</button>${historyButton(g)}<small>Scores are private until the phase is released.</small></div></form>`;
}
function submission() {
  const v = view!;
  if (!selectedGroup)
    return '<section class="course-section"><h3>Group submission</h3><p>Your phase group has not been assigned yet.</p></section>';
  const record = v.submissions.find(
      (r) => r.value.phase === phase && r.value.group === selectedGroup,
    ),
    s = record?.value;
  const incoming = v.audits.find(
    (a) => a.value.phase === phase && a.value.to === selectedGroup,
  );
  const archives = v.files.filter(
    (f) =>
      f.value.phase === phase &&
      f.value.scope === "technical" &&
      f.value.owner === selectedGroup,
  );
  return `<section class="course-section">${groupPicker()}<div class="course-section-heading"><h3>${s?.frozenAt ? "Frozen implementation" : "Prepare implementation"}</h3>${historyButton(record)}</div><p>Implementation deadline: ${when(v.config.value.phases[phase].freezeAt)}. One member submits for the whole group.</p>
  ${
    s?.frozenAt
      ? `<aside class="course-note">Frozen ${when(s.frozenAt)} · <code>${e(s.commit)}</code><p>Registered members: ${s.members.map((id) => e(v.config.value.students.find((x) => x.id === id)?.name ?? id)).join(", ")}</p></aside><p><a href="${e(s.repository)}" target="_blank" rel="noopener noreferrer">Repository ↗</a></p><p>${archives
          .filter((f) => f.value.id === s.archive)
          .map((f) => fileLink(f.value))
          .join(
            "",
          )}</p><h4>Setup and validation</h4><p class="course-evidence">${e(s.setup)}</p><h4>Initial evidence and limitations</h4><p class="course-evidence">${e(s.evidence)}</p>
  <h4>Incoming audit</h4>${incoming ? `<p class="course-evidence">${e(incoming.value.report)}</p>` : '<p class="course-muted">No audit submitted yet. Contact staff if a fallback is needed.</p>'}
  <form data-form="evidence">${field("response", "Author response: findings, corrections and evidence links", s.response, 8000, true)}${v.staff ? input("reason", "Staff submission reason", "") : ""}<div class="course-form-actions"><button type="submit">${s.submittedAt ? "Resubmit author response" : "Submit author response"}</button><small>Initial source, setup and evidence remain frozen.</small></div></form>`
      : `<form data-form="submission">${input("repository", "Repository URL (HTTPS)", s?.repository ?? "", true, "url")}${input("commit", "Full implementation commit hash", s?.commit ?? "")}${upload("technical")}<label class="course-field">Source archive<select name="archive">${option("", "Choose an uploaded archive", s?.archive ?? "")}${archives.map((f) => option(f.value.id, f.value.name, s?.archive ?? "")).join("")}</select></label>${field("setup", "Supported setup, demo data and validation commands", s?.setup ?? "", 8000, true)}${field("evidence", "Initial evidence, conditions and known limitations", s?.evidence ?? "", 8000, true)}${v.staff ? input("reason", "Staff submission reason", "") : ""}<div class="course-form-actions"><button type="submit" name="stage" value="draft" class="course-secondary">Save draft</button><button type="submit" name="stage" value="freeze">Freeze implementation</button></div><p class="course-muted">Freezing preserves this archive, commit, setup, initial evidence and membership. The system records an archive hash; you attest that it matches the commit.</p></form>`
  }
  ${v.staff ? gradeForm("project-grade", selectedGroup) : ""}</section>`;
}
function portfolio() {
  const v = view!,
    student = v.staff ? selectedStudent : v.user.id;
  if (!student)
    return '<section class="course-section"><h3>Private portfolios</h3><p>Add students to the roster first.</p></section>';
  const record = v.portfolios.find(
      (r) => r.value.phase === phase && r.value.student === student,
    ),
    p = record?.value ?? emptyPortfolio(phase, student);
  const attachments = v.files.filter(
    (f) =>
      f.value.phase === phase &&
      f.value.scope === "private" &&
      f.value.owner === student,
  );
  return `<section class="course-section">${studentPicker()}<div class="course-section-heading"><h3>${title(phase)} private portfolio</h3>${historyButton(record)}</div><p>Visible to the student and course staff. ${p.submittedAt ? `Submitted ${when(p.submittedAt)}.` : "Not submitted yet."}</p>
  ${
    v.staff
      ? `<div class="course-portfolio-read">${p.lectures.map((l, i) => `<details open><summary>Lecture ${i + 1} · ${e(l.mode)}</summary><h4>Participation evidence</h4><p class="course-evidence">${e(l.participation || "Missing")}</p><h4>Concrete idea</h4><p class="course-evidence">${e(l.idea || "Missing")}</p><h4>Connection</h4><p class="course-evidence">${e(l.connection || "Missing")}</p></details>`).join("")}${[
          ["Self-assessment", p.self],
          ["Private peer feedback", p.peers],
          ["Response and reflection", p.reflection],
          ["Decision challenged, tested or reviewed", p.contribution],
        ]
          .map(
            ([label, value]) =>
              `<h4>${label}</h4><p class="course-evidence">${e(value || "Missing")}</p>`,
          )
          .join("")}<h4>Attachments</h4>${
          attachments
            .filter((f) => p.files.includes(f.value.id))
            .map((f) => `<p>${fileLink(f.value)}</p>`)
            .join("") || "<p>None</p>"
        }</div>${gradeForm("individual-grade", student)}`
      : `<form data-form="portfolio">${p.lectures.map((l, i) => `<fieldset class="course-lecture"><legend>Lecture ${i + 1}</legend><label class="course-field">Participation<select name="mode-${i}" aria-label="Participation">${["missing", "live", "remote"].map((mode) => option(mode, mode === "missing" ? "Not completed" : mode === "live" ? "Live participation" : "Announced remote equivalent", l.mode)).join("")}</select></label>${field(`participation-${i}`, "Participation or equivalent activity evidence", l.participation, 1000)}${field(`idea-${i}`, "One concrete idea, failure, model or trade-off", l.idea, 1800)}${field(`connection-${i}`, "Connection to project evidence, an assumption or a decision", l.connection, 1800)}</fieldset>`).join("")}${field("self", "Self-assessment: contributions, commitments, learning and next improvement", p.self, 2500, true)}${field("peers", "Private peer feedback: specific feedback for each teammate", p.peers, 2500, true)}${field("reflection", "Response to feedback, one adjustment and a groupworking condition", p.reflection, 2500, true)}${field("contribution", "One consequential decision you challenged, tested or reviewed: link evidence and explain the outcome", p.contribution, 2500, true)}${upload("private")}${attachments.map((f) => `<label class="course-check"><input type="checkbox" name="file" value="${e(f.value.id)}" ${p.files.includes(f.value.id) ? "checked" : ""}> ${e(f.value.name)}</label>`).join("")}<div class="course-form-actions"><button type="submit" name="stage" value="draft" class="course-secondary" formnovalidate>Save draft</button><button type="submit" name="stage" value="submit">${p.submittedAt ? "Resubmit portfolio" : "Submit portfolio"}</button></div></form>`
  }</section>`;
}
function audit() {
  const v = view!,
    assignment = v.config.value.phases[phase].audits.find(
      (a) => a.from === selectedGroup,
    );
  const record = v.audits.find(
    (r) => r.value.phase === phase && r.value.from === selectedGroup,
  );
  const target = v.submissions.find(
    (r) =>
      r.value.phase === phase &&
      r.value.group === assignment?.to &&
      r.value.frozenAt,
  );
  return `<section class="course-section">${groupPicker()}<h3>Assigned change audit</h3>${assignment ? `<p><strong>${e(assignment.from)} → ${e(assignment.to)}</strong> · Closes ${when(v.config.value.phases[phase].auditAt)}.</p>` : "<p>No audit assigned. Contact course staff.</p>"}
  <p>Use a disposable copy of the frozen revision. Record prior inspection, setup time, tools and policy; begin the approximately 30-minute change probe after setup works. Use the <a href="/project/">common audit protocol</a>.</p>
  ${
    target
      ? `<details open><summary>Assigned frozen implementation · ${e(target.value.group)}</summary><p><code>${e(target.value.commit)}</code></p>${v.files
          .filter((f) => f.value.id === target.value.archive)
          .map((f) => `<p>${fileLink(f.value)}</p>`)
          .join(
            "",
          )}<p class="course-evidence">${e(target.value.setup)}</p><p class="course-evidence">${e(target.value.evidence)}</p></details>`
      : '<aside class="course-note">The frozen implementation will be available when the audit window opens. If it is missing during the window, ask staff for a fallback.</aside>'
  }
  ${assignment ? `<form data-form="audit">${field("report", "Audit report: setup, timing, prior inspection, change probe, findings and evidence", record?.value.report ?? "", 10000, true)}${v.staff ? input("reason", "Staff audit reason", "") : ""}<div class="course-form-actions"><button type="submit" ${!target ? "disabled" : ""}>${record ? "Resubmit audit" : "Submit assigned audit"}</button>${historyButton(record)}</div></form>` : ""}</section>`;
}
function gallery() {
  const v = view!,
    open = v.now >= v.config.value.phases[phase].auditAt;
  return `<section class="course-section"><h3>Class submission catalogue</h3><p>Technical evidence only. Portfolios, individual reports and grades stay private.</p>${
    !open && !v.staff
      ? `<aside class="course-note">Class access opens after the audit window closes: ${when(v.config.value.phases[phase].auditAt)}. Your assigned audit is available in Assigned audit.</aside>`
      : `${!open ? '<aside class="course-note">Staff preview. Students cannot browse this catalogue until the audit window closes.</aside>' : ""}<div class="course-gallery">${
          v.submissions
            .filter((r) => r.value.phase === phase && r.value.frozenAt)
            .map((r) => {
              const s = r.value,
                a = v.audits.find(
                  (r) => r.value.phase === phase && r.value.to === s.group,
                );
              return `<article><p class="course-eyebrow">${title(phase)} · ${e(s.group)}</p><h4><a href="${e(s.repository)}" target="_blank" rel="noopener noreferrer">${e(s.group)} implementation ↗</a></h4><p><code>${e(s.commit)}</code></p>${v.files
                .filter((f) => f.value.id === s.archive)
                .map((f) => `<p>${fileLink(f.value)}</p>`)
                .join(
                  "",
                )}<details><summary>Setup & validation</summary><p class="course-evidence">${e(s.setup)}</p></details><details><summary>Initial evidence</summary><p class="course-evidence">${e(s.evidence)}</p></details><details><summary>Audit & author response</summary><p class="course-evidence">${e(a?.value.report ?? "Audit pending")}</p><p class="course-evidence">${e(s.response || "Author response pending")}</p></details></article>`;
            })
            .join("") || "<p>No frozen submissions yet.</p>"
        }</div>`
  }</section>`;
}
function gradebook() {
  const v = view!,
    course = v.config.value,
    selected = v.results.find((r) => r.student.id === selectedStudent);
  const schedule = course.phases[phase];
  const adjustment = course.adjustments.find(
    (a) => a.student === selectedStudent && a.phase === phase,
  );
  return `<section class="course-section"><div class="course-section-heading"><h3>Course gradebook</h3><a class="course-button" href="/api/courses/${course.id}/export">Export released grades (CSV)</a></div><p>Instructor view includes provisional scores. Exports use released assessments; pending work has a blank final grade. Missing work must be explicitly assessed.</p><div class="course-table-scroll" tabindex="0" role="region" aria-label="Scrollable assessment table"><table class="course-table"><caption>Instructor totals · provisional until release</caption><thead><tr><th>Student</th><th>Points</th><th>Percentage</th><th>Result</th><th>Requirements</th></tr></thead><tbody>${v.results.map(({ student, result }) => `<tr><th><button type="button" data-grade-student="${e(student.id)}">${e(student.name)}</button><small>${e(student.number)}</small></th><td>${result.earned}/${result.available}</td><td>${result.percentage.toFixed(1)}%</td><td>${result.grade === null ? "Pending" : result.grade === 0 ? "Fail" : `Grade ${result.grade}`}</td><td>${e([...result.pending, ...result.unmet].join("; ") || "All met")}</td></tr>`).join("")}</tbody></table></div>
  <form data-form="publish" class="course-note"><h4>${title(phase)} results: ${schedule.published ? "released" : "private drafts"}</h4><p>All groups and students need assessment records before release. Record zero scores for missing work, with reasons.</p>${input("reason", "Reason for releasing or withdrawing results", "")}<button type="submit">${schedule.published ? "Withdraw phase results" : "Release phase results"}</button></form>
  ${studentPicker()}${selected ? `<h4>${e(selected.student.name)}: points and passing requirements</h4>${resultMarkup(selected.result)}<details><summary>Approved individual arrangement for ${title(phase)}</summary><form data-form="adjustment"><p>Document the approved replacement activity or adjusted requirement. Changes and reasons remain in the private history.</p>${input("lectureMinimum", "Required complete lecture activities (0–3)", String(adjustment?.lectureMinimum ?? 2), true, "number")}${input("assessmentMinimum", "Self/peer minimum (0–12)", String(adjustment?.assessmentMinimum ?? 6), true, "number")}${input("contributionMinimum", "Contribution minimum (0–3)", String(adjustment?.contributionMinimum ?? 1), true, "number")}${input("availablePoints", "Available individual points this phase (1–21)", String(adjustment?.availablePoints ?? 21), true, "number")}${field("reason", "Approved arrangement, replacement activity and reason", adjustment?.reason ?? "", 2000, true)}<button type="submit">Save private arrangement</button></form></details>` : ""}</section>`;
}
function render() {
  if (!view) {
    const identity =
      listing.user && !listing.courses.length && !listing.canCreate
        ? `<aside class="course-note"><p>Signed in as <strong>${e(listing.user.login)}</strong>. Your numeric GitHub ID is <code>${e(listing.user.id.replace(/^github:/, ""))}</code>.</p><p>Share this ID with your instructor for roster registration.</p></aside>`
        : "";
    content.innerHTML = `<div class="course-course-list">${listing.courses.map((c) => `<button type="button" class="course-run" data-open="${c.id}"><span>${c.staff ? "Instructor" : "Student"} workspace</span><strong>${e(c.name)}</strong><span>Open course →</span></button>`).join("") || "<p>No courses assigned yet. Your instructor must add your GitHub numeric ID to the roster.</p>"}</div>${listing.canCreate ? `<form data-form="create" class="course-section"><h2>Create a course run</h2><p>Each run has its own roster, groups, submissions and assessment history.</p>${input("name", "Course name", "", true)}<button type="submit">Create course</button></form>` : ""}`;
    content.insertAdjacentHTML("afterbegin", identity);
    return;
  }
  const screens: Record<string, () => string> = {
    overview,
    submission,
    portfolio,
    audit,
    gallery,
    gradebook,
    ...Object.fromEntries(
      administrationSections.map((section) => [
        section,
        () =>
          renderAdministration(
            view!.config,
            phase,
            section,
            view!.access,
            local,
          ),
      ]),
    ),
  };
  if (!view.staff && ["gradebook", ...administrationSections].includes(tab))
    tab = "overview";
  content.innerHTML =
    header() +
    (screens[tab] ?? overview)() +
    '<dialog data-history-dialog><h3>Record history</h3><div data-history-content></div><form method="dialog"><button>Close history</button></form></dialog>';
  for (const scroll of content.querySelectorAll<HTMLElement>(
    ".course-table-scroll",
  )) {
    const summary =
      scroll.closest("details")?.querySelector("summary")?.textContent ?? "";
    const caption =
      scroll.querySelector("caption")?.textContent ?? "Assessment table";
    scroll.setAttribute("aria-label", `${summary} ${caption}`.trim());
  }
}
content.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest("form")) dirty = true;
  if (target.matches('[name="roster"],[name^="map-"]')) {
    const preview = target
      .closest("form")
      ?.querySelector("[data-roster-preview]");
    if (preview) preview.textContent = "";
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = true;
  }
});
content.addEventListener("change", async (event) => {
  const el = event.target as HTMLInputElement;
  let ownsPending = false;
  try {
    if (el.matches("[data-course-select]")) {
      if (allowNavigation()) await openCourse(el.value);
      else el.value = view!.config.value.id;
    }
    if (el.matches("[data-group-select]")) {
      if (allowNavigation()) {
        selectedGroup = el.value;
        dirty = false;
        render();
      } else el.value = selectedGroup;
    }
    if (el.matches("[data-student-select]")) {
      if (allowNavigation()) {
        selectedStudent = el.value;
        dirty = false;
        render();
      } else el.value = selectedStudent;
    }
    if (el.matches("[data-upload]")) {
      if (pending) {
        tell("Wait for the current upload or save to finish.");
        return;
      }
      const file = el.files?.[0];
      if (!file) return;
      if (file.size < 1 || file.size > 20 * 1024 * 1024)
        throw new Error("Choose a file from 1 byte to 20 MiB.");
      const scope = el.dataset.upload!,
        owner = scope === "technical" ? selectedGroup : view!.user.id;
      const reason =
        (
          el
            .closest("form")
            ?.elements.namedItem("reason") as HTMLInputElement | null
        )?.value ?? "";
      pending = true;
      ownsPending = true;
      const response = await fetch(
        `${route("files", owner)}?scope=${scope}&name=${encodeURIComponent(file.name)}&reason=${encodeURIComponent(reason)}`,
        { method: "POST", body: file, credentials: "same-origin" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      const record = data as Envelope<CourseFile>;
      view!.files.push(record);
      if (scope === "technical") {
        const select = content.querySelector<HTMLSelectElement>(
          'select[name="archive"]',
        )!;
        select.add(new Option(file.name, record.value.id, true, true));
      } else {
        const label = document.createElement("label");
        label.className = "course-check";
        const check = document.createElement("input");
        check.type = "checkbox";
        check.name = "file";
        check.value = record.value.id;
        check.checked = true;
        label.append(check, document.createTextNode(" " + file.name));
        el.closest("label")!.after(label);
      }
      dirty = true;
      tell(
        "File uploaded. Save or submit the form to attach it to the record.",
      );
    }
  } catch (error) {
    tell((error as Error).message, true);
  } finally {
    if (ownsPending) pending = false;
  }
});
content.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button",
  );
  if (!button) return;
  if (
    pending &&
    button.matches(
      "[data-add-group],[data-remove-group],[data-reuse-groups],[data-match]",
    )
  ) {
    tell("Wait for the current save or upload to finish.");
    return;
  }
  try {
    if (button.dataset.version && button.dataset.history) {
      const data = await api<{ history: Envelope[] }>(
        `/api/courses/${view!.config.value.id}/history?key=${encodeURIComponent(button.dataset.history)}&revision=${encodeURIComponent(button.dataset.version)}`,
      );
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(data.history[0]?.value, null, 2);
      button.replaceWith(pre);
      return;
    }
    if (button.dataset.history) {
      const data = await api<{ history: (Envelope & { reason: string })[] }>(
        `/api/courses/${view!.config.value.id}/history?key=${encodeURIComponent(button.dataset.history)}`,
      );
      const dialog = content.querySelector<HTMLDialogElement>(
        "[data-history-dialog]",
      )!;
      dialog.querySelector("[data-history-content]")!.innerHTML = data.history
        .map(
          (r) =>
            `<details><summary>${e(when(r.updatedAt))} · ${e(r.reason)}</summary><p>Actor: ${e(r.actor)} · Revision: ${e(r.revision)}</p><button type="button" data-history="${e(r.key)}" data-version="${e(r.revision)}">Load this revision</button></details>`,
        )
        .join("");
      dialog.showModal();
      return;
    }
    if (button.hasAttribute("data-roster-columns")) {
      const form = button.closest("form")!;
      const source = (form.elements.namedItem("roster") as HTMLTextAreaElement)
        .value;
      form.querySelector("[data-roster-mapping]")!.innerHTML = mappingMarkup(
        rosterHeaders(source),
      );
      form.querySelector("[data-roster-preview]")!.textContent = "";
      dirty = true;
      return;
    }
    if (button.dataset.editStudent) {
      const student = view!.config.value.students.find(
        (s) => s.id === button.dataset.editStudent,
      )!;
      const form = content.querySelector<HTMLFormElement>(
        'form[data-form="student"]',
      )!;
      const fields = {
        identity: student.id,
        number: student.number,
        firstName: student.firstName ?? "",
        lastName: student.lastName ?? "",
        email: student.email ?? "",
        login: student.login,
      };
      for (const [key, value] of Object.entries(fields))
        (form.elements.namedItem(key) as HTMLInputElement).value = value;
      form.closest("details")!.open = true;
      form.querySelector("[data-student-edit-label]")!.textContent =
        `Correcting ${student.name}. Existing submissions and grades remain attached.`;
      (form.elements.namedItem("number") as HTMLInputElement).focus();
      return;
    }
    if (button.hasAttribute("data-mock-inbox")) {
      const data = await api<{
        messages: { to: string; url: string; expiresAt: string }[];
      }>(`/api/course-auth/mock-inbox?course=${view!.config.value.id}`);
      content.querySelector("[data-mock-messages]")!.innerHTML = data.messages
        .length
        ? data.messages
            .map(
              (m) =>
                `<p><strong>${e(m.to)}</strong> · expires ${e(when(m.expiresAt))}<br><a href="${e(m.url)}" target="_blank" rel="noopener noreferrer">Follow mock sign-in link</a></p>`,
            )
            .join("")
        : "<p>No mock messages yet. Request a student sign-in link first.</p>";
      return;
    }
    if (button.hasAttribute("data-add-group")) {
      const form = button.closest("form")!;
      const list = form.querySelector<HTMLElement>("[data-group-rows]")!;
      const index = Number(form.dataset.nextGroup ?? "0");
      list.insertAdjacentHTML(
        "beforeend",
        groupRow(view!.config.value, { id: "", members: [] }, index),
      );
      form.dataset.nextGroup = String(index + 1);
      dirty = true;
      return;
    }
    if (button.hasAttribute("data-remove-group")) {
      button.closest("[data-group-row]")!.remove();
      dirty = true;
      return;
    }
    if (button.hasAttribute("data-reuse-groups")) {
      const form = button.closest("form")!;
      const list = form.querySelector<HTMLElement>("[data-group-rows]")!;
      const groups = view!.config.value.phases.establish.groups;
      list.innerHTML = groups
        .map((g, i) => groupRow(view!.config.value, g, i))
        .join("");
      form.dataset.nextGroup = String(groups.length);
      dirty = true;
      return;
    }
    if (button.dataset.match) {
      const form = button.closest("form")!;
      const groups = view!.config.value.phases[phase].groups.map((g) => g.id);
      if (groups.length < 2)
        throw new Error("Save at least two groups before assigning audits.");
      (form.elements.namedItem("audits") as HTMLTextAreaElement).value = groups
        .map((g, i) => `${g} > ${groups[(i + 1) % groups.length]}`)
        .join("\n");
      dirty = true;
      return;
    }
    if (
      !button.matches(
        "[data-tab],[data-phase],[data-open],[data-back],[data-refresh],[data-review-group],[data-review-student],[data-grade-student],[data-email-login],[data-course-logout]",
      )
    )
      return;
    if (!allowNavigation()) return;
    dirty = false;
    if (button.hasAttribute("data-email-login")) {
      content.innerHTML = courseSignIn(
        view!.config.value.id,
        githubLoginUrl,
        local,
        loginToken,
      );
      return;
    }
    if (button.hasAttribute("data-course-logout")) {
      await api("/api/course-auth/logout", "POST", {});
      await api("/api/auth/logout", "POST", {});
      location.reload();
      return;
    }
    if (button.hasAttribute("data-refresh")) {
      await openCourse(view!.config.value.id);
      tell("Course records refreshed.");
      return;
    }
    if (button.dataset.open) {
      await openCourse(button.dataset.open);
      return;
    }
    if (button.hasAttribute("data-back")) {
      view = null;
      const url = new URL(location.href);
      url.searchParams.delete("course");
      history.replaceState(null, "", url);
      listing = await api<Listing>("/api/courses");
      render();
      return;
    }
    if (button.dataset.tab) tab = button.dataset.tab;
    if (button.dataset.phase) {
      phase = button.dataset.phase as Phase;
      selectedGroup = "";
      await openCourse(view!.config.value.id);
      return;
    }
    if (button.dataset.reviewGroup) {
      selectedGroup = button.dataset.reviewGroup;
      tab = "submission";
    }
    if (button.dataset.reviewStudent) {
      selectedStudent = button.dataset.reviewStudent;
      tab = "portfolio";
    }
    if (button.dataset.gradeStudent) {
      selectedStudent = button.dataset.gradeStudent;
      tab = "gradebook";
    }
    render();
    content
      .querySelector<HTMLElement>(".course-section h3")
      ?.setAttribute("tabindex", "-1");
    content.querySelector<HTMLElement>(".course-section h3")?.focus();
  } catch (error) {
    tell((error as Error).message, true);
  }
});
content.addEventListener("submit", async (event) => {
  const form = event.target as HTMLFormElement;
  const kind = form.dataset.form;
  if (!kind) return;
  event.preventDefault();
  if (pending) {
    tell("Wait for the current save or upload to finish.");
    return;
  }
  pending = true;
  const values = new FormData(form);
  const val = (key: string) => String(values.get(key) ?? "");
  const submit = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  const buttons = form.querySelectorAll<HTMLButtonElement>(
    'button[type="submit"]',
  );
  buttons.forEach((b) => (b.disabled = true));
  try {
    if (kind === "email-request") {
      const data = await api<{ message: string }>(
        "/api/course-auth/request",
        "POST",
        { course: val("course"), email: val("email") },
      );
      dirty = false;
      tell(data.message);
      return;
    }
    if (kind === "email-verify") {
      const data = await api<{ course: string }>(
        "/api/course-auth/verify",
        "POST",
        { token: loginToken },
      );
      loginToken = null;
      listing = await api<Listing>("/api/courses");
      tab = "overview";
      await openCourse(data.course);
      tell("Signed in to your course.");
      return;
    }
    if (kind === "create") {
      const record = await api<Envelope<Course>>("/api/courses", "POST", {
        name: val("name"),
      });
      listing = await api<Listing>("/api/courses");
      await openCourse(record.value.id);
      tab = "students";
      render();
      tell("Course created. Add the roster and phase groups.");
      return;
    }
    const v = view!,
      course = v.config.value;
    if (kind === "student") {
      await api(`/api/courses/${course.id}/students`, "PUT", {
        expected: v.administration!.students,
        format: "institutional",
        reason: val("reason"),
        students: [
          {
            ...(val("identity") ? { id: val("identity") } : {}),
            number: val("number"),
            firstName: val("firstName"),
            lastName: val("lastName"),
            email: val("email"),
            login: val("login"),
          },
        ],
      });
    } else if (
      administrationSections.includes(
        kind as (typeof administrationSections)[number],
      )
    ) {
      const section = kind as (typeof administrationSections)[number];
      const payload = administrationPayload(
        form,
        v.config.value,
        phase,
        section,
        v.administration!,
      );
      const perPhase = section === "groups" || section === "schedule";
      const url = `/api/courses/${course.id}/${section}${perPhase ? `/${phase}` : ""}`;
      if (section === "students" && submit?.value === "preview") {
        const preview = await api<RosterPreview>(url, "POST", payload);
        form.querySelector<HTMLElement>("[data-roster-preview]")!.innerHTML =
          previewMarkup(preview);
        tell("Preview ready. Review the changes, then save the roster.");
        return;
      }
      await api(url, "PUT", payload);
    } else if (kind === "submission" || kind === "evidence") {
      const old = v.submissions.find(
        (r) => r.value.phase === phase && r.value.group === selectedGroup,
      );
      await api(route("submission", selectedGroup), "PUT", {
        expected: revision(old),
        stage: kind === "evidence" ? "evidence" : (submit?.value ?? "draft"),
        value:
          kind === "evidence"
            ? { response: val("response") }
            : {
                repository: val("repository"),
                commit: val("commit"),
                archive: val("archive"),
                setup: val("setup"),
                evidence: val("evidence"),
              },
        reason: val("reason"),
      });
    } else if (kind === "portfolio") {
      const old = v.portfolios.find(
        (r) => r.value.phase === phase && r.value.student === v.user.id,
      );
      const value = {
        lectures: [0, 1, 2].map((i) => ({
          mode: val(`mode-${i}`),
          participation: val(`participation-${i}`),
          idea: val(`idea-${i}`),
          connection: val(`connection-${i}`),
        })),
        self: val("self"),
        peers: val("peers"),
        reflection: val("reflection"),
        contribution: val("contribution"),
        files: values.getAll("file").map(String),
      };
      await api(route("portfolio", v.user.id), "PUT", {
        expected: revision(old),
        stage: submit?.value ?? "draft",
        value,
      });
    } else if (kind === "audit") {
      const old = v.audits.find(
        (r) => r.value.phase === phase && r.value.from === selectedGroup,
      );
      await api(route("audit", selectedGroup), "PUT", {
        expected: revision(old),
        report: val("report"),
        reason: val("reason"),
      });
    } else if (kind === "project-grade" || kind === "individual-grade") {
      const subject =
        kind === "project-grade" ? selectedGroup : selectedStudent;
      const old = (kind === "project-grade" ? v.projects : v.individuals).find(
        (r) => r.value.phase === phase && r.value.subject === subject,
      );
      await api(route(kind, subject), "PUT", {
        expected: revision(old),
        scores: Array.from(
          { length: kind === "project-grade" ? 8 : 13 },
          (_, i) => {
            if (!val(`score-${i}`))
              throw new Error("Enter every criterion score, including zero.");
            return Number(val(`score-${i}`));
          },
        ),
        missing: values.has("missing"),
        feedback: val("feedback"),
        reason: val("reason"),
      });
    } else if (kind === "publish")
      await api(route("publish"), "POST", {
        expected: v.config.revision,
        published: !course.phases[phase].published,
        reason: val("reason"),
      });
    else if (kind === "adjustment")
      await api(`/api/courses/${course.id}/adjustment`, "PUT", {
        expected: v.config.revision,
        adjustment: {
          student: selectedStudent,
          phase,
          lectureMinimum: Number(val("lectureMinimum")),
          assessmentMinimum: Number(val("assessmentMinimum")),
          contributionMinimum: Number(val("contributionMinimum")),
          availablePoints: Number(val("availablePoints")),
          reason: val("reason"),
        },
      });
    await openCourse(course.id);
    tell("Saved. The record history retains this revision and its reason.");
  } catch (error) {
    tell((error as Error).message, true);
    buttons.forEach((b) => (b.disabled = false));
  } finally {
    pending = false;
    buttons.forEach((b) => (b.disabled = false));
  }
});
async function start() {
  try {
    const auth = await api<{
      authenticated: boolean;
      local: boolean;
      loginUrl: string | null;
    }>("/api/course-auth/status");
    local = auth.local;
    githubLoginUrl = auth.loginUrl;
    if (loginToken) {
      content.innerHTML = courseSignIn("", githubLoginUrl, local, loginToken);
      tell("Confirm the sign-in link to open your course.");
      return;
    }
    if (!auth.authenticated) {
      tell(
        "Sign in to see your course. Your instructor must add you to the roster.",
      );
      content.innerHTML = courseSignIn(
        new URLSearchParams(location.search).get("course") ?? "",
        githubLoginUrl,
        local,
      );
      return;
    }
    listing = await api<Listing>("/api/courses");
    const query = new URLSearchParams(location.search).get("course");
    if (query && listing.courses.some((c) => c.id === query))
      await openCourse(query);
    else if (listing.courses.length === 1)
      await openCourse(listing.courses[0]!.id);
    else render();
    tell(
      local
        ? "Local workspace · data is stored on this computer. Production course records use separate storage."
        : "Course records loaded. Private portfolios and grades are visible only to their owners and course staff.",
    );
  } catch (error) {
    tell((error as Error).message, true);
    content.innerHTML =
      '<p>The course workspace is unavailable. See <a href="/project/introduction/">the project guide</a> while storage is configured.</p>';
  }
}
void start();
