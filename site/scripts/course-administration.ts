import {
  csvRows,
  rosterHeaders,
  rosterColumns,
  mappedRoster,
  type RosterColumn,
} from "../../shared/course-roster.ts";
import type { AccessActivity } from "../../shared/course-administration.ts";
import {
  title,
  type Course,
  type Phase,
  type Envelope,
  type Group,
  type Student,
} from "../../shared/course.ts";
import {
  administrationSections,
  type AdministrationSection,
  type AdministrationRevisions,
  type RosterPreview,
} from "../../shared/course-administration.ts";
import { e, input, field, localDate } from "./course-ui.ts";
import { groupLabel } from "../../shared/course-formation.ts";
import { staffFormation } from "./course-formation.ts";
import { enrollmentStatus, staffEnrollment } from "./course-enrollment.ts";
import {
  activeStudent,
  activeStudents,
} from "../../shared/course-enrollment.ts";
import {
  requirementUrl,
  requirementsFor,
} from "../../shared/course-requirements.ts";

const labels: Record<AdministrationSection, string> = {
  students: "Students",
  groups: "Groups",
  schedule: "Phase administration",
  settings: "Course settings",
};
const reason = () => input("reason", "Reason for change", "");
const history = (record: Envelope<Course>) =>
  `<button type="button" class="course-quiet" data-history="${e(record.key)}">Record history</button>`;

export function administrationNavigation(current: string) {
  return `<nav class="course-administration-nav" aria-label="Course administration"><span class="course-eyebrow">Administration</span>${administrationSections.map((section) => `<button type="button" class="course-quiet" data-tab="${section}" ${current === section ? 'aria-current="page"' : ""}>${labels[section]}</button>`).join("")}</nav>`;
}

export function groupRow(course: Course, group: Group, index: number) {
  return `<fieldset class="course-group-row" data-group-row="${index}"><legend>${e(group.id ? groupLabel(group) : "New group")}</legend><p class="course-muted">${e(group.id || "Identifier assigned on save")}</p><input type="hidden" name="id-${index}" value="${e(group.id)}"><input type="hidden" name="proposal-${index}" value="${e(group.proposal || "")}">${input(`name-${index}`, "Group display name (optional)", group.name ?? "", false)}<label class="course-field">Members<select multiple name="members-${index}" size="4">${course.students
    .filter((s) => activeStudent(s) || group.members.includes(s.id))
    .map(
      (s) =>
        `<option value="${e(s.id)}" ${group.members.includes(s.id) ? "selected" : ""}>${e(s.name)}${!activeStudent(s) ? " · withdrawn (retained membership)" : s.login ? ` (${e(s.login)})` : ""}</option>`,
    )
    .join(
      "",
    )}</select><small>Choose three active members normally; four is the maximum for new allocations. Review withdrawn members before future work; frozen membership is retained.</small></label>${field(`exception-${index}`, "Instructor group size exception (required unless three members)", group.exception ?? "", 2000)}<button type="button" class="course-quiet" data-remove-group>Remove from this allocation</button></fieldset>`;
}

export function renderAdministration(
  record: Envelope<Course>,
  phase: Phase,
  section: AdministrationSection,
  access: AccessActivity[] = [],
  local = false,
  now = new Date().toISOString(),
) {
  const course = record.value,
    schedule = course.phases[phase];
  const actions = (label: string) =>
    `${reason()}<div class="course-form-actions"><button type="submit">${label}</button>${history(record)}</div>`;
  if (section === "students") {
    const source = "student_id,first_name,last_name,email\n";
    return `<section class="course-section"><h3>Students</h3><p>Import your institutional roster before students sign in. Form groups separately; omitted rows remain enrolled.</p><div class="course-table-scroll" tabindex="0" role="region" aria-label="Course roster"><table class="course-table"><caption>Enrolled students · private to staff</caption><thead><tr><th>Name</th><th>Student ID</th><th>Institutional email</th><th>Sign-in status</th><th>Enrollment</th><th>Actions</th></tr></thead><tbody>${course.students
      .map((s) => {
        const activity = access.find((a) => a.student === s.id);
        return `<tr><th>${e(s.name)}</th><td>${e(s.number)}</td><td>${e(s.email || "Institutional details needed")}</td><td>${activity ? `Last sign-in ${e(new Date(activity.lastSignIn).toLocaleString())}` : s.email ? "Imported · awaiting first sign-in" : "Legacy GitHub access"}</td><td>${e(enrollmentStatus(s))}</td><td><button type="button" class="course-quiet" data-edit-student="${e(s.id)}">Correct student</button><button type="button" class="course-quiet" data-enrollment-student="${e(s.id)}">Enrollment arrangement</button></td></tr>`;
      })
      .join("")}</tbody></table></div>
    <form data-form="students"><h4>Import institutional CSV</h4>${field("roster", "Roster CSV", source, 64000, true)}<button type="button" data-roster-columns class="course-quiet">Read CSV columns</button><div data-roster-mapping class="course-roster-mapping">${mappingMarkup(rosterHeaders(source))}</div><p class="course-muted">Imports match existing student IDs in this course. A matching legacy student keeps their existing submissions and grades. Duplicate IDs or emails need correction before import.</p><button type="submit" value="preview" class="course-quiet" formnovalidate>Preview roster changes</button><div data-roster-preview aria-live="polite"></div>${actions("Save roster")}</form>
    <details><summary>Add or correct one student</summary><form data-form="student"><input type="hidden" name="identity" value=""><p data-student-edit-label>New student</p>${input("number", "Institutional student ID", "")}${input("firstName", "First name", "")}${input("lastName", "Last name", "")}${input("email", "Institutional email", "", true, "email")}${input("login", "GitHub login (optional profile information)", "", false)}${actions("Save student")}</form></details>
    ${staffEnrollment(course)}<aside class="course-note"><strong>Student sign-in</strong><p>Students open <a href="/course/?course=${e(course.id)}">this course workspace</a> and request a link using their imported institutional email. The link signs them in; it does not register a new student.</p>${local ? '<button type="button" data-mock-inbox class="course-quiet">Open local mock inbox</button><div data-mock-messages></div>' : ""}</aside></section>`;
  }
  if (section === "groups") {
    const unassigned = activeStudents(course).filter(
      (s) => !schedule.groups.some((g) => g.members.includes(s.id)),
    );
    return `<section class="course-section"><h3>${title(phase)} groups</h3><p>Allocate enrolled students to groups. New groups receive a course identifier when saved. Reuse Establish groups in later phases to keep their identifiers.</p>${staffFormation(course, phase, now)}<aside class="course-note"><strong>${unassigned.length} students awaiting allocation</strong><p>${e(unassigned.map((s) => s.name).join(", ") || "Everyone is assigned.")}</p></aside><form data-form="groups" data-next-group="${schedule.groups.length}"><div data-group-rows class="course-group-grid">${schedule.groups.map((g, i) => groupRow(course, g, i)).join("")}</div><div class="course-form-actions"><button type="button" data-add-group class="course-quiet" ${!course.students.length ? "disabled" : ""}>Add a group</button>${phase !== "establish" ? '<button type="button" data-reuse-groups class="course-quiet">Reuse Establish groups</button>' : ""}</div><p class="course-muted">Frozen membership and groups with saved evidence are retained. Clear any audit assignments before removing an unused group.</p>${actions("Save groups")}</form></section>`;
  }
  if (section === "schedule") {
    return `<section class="course-section"><h3>${title(phase)} administration</h3><p>Prepare deadlines and audit assignments for this phase. Save groups before arranging their audits.</p><form data-form="schedule"><div class="course-deadline-inputs">${input("freezeAt", "Implementation deadline", localDate(schedule.freezeAt), true, "datetime-local")}${input("auditAt", "Audit closes / class access opens", localDate(schedule.auditAt), true, "datetime-local")}${input("evidenceAt", "Evidence and portfolio deadline", localDate(schedule.evidenceAt), true, "datetime-local")}</div><p>Saved groups: ${e(schedule.groups.map((g) => g.id).join(", ") || "none yet")}.</p>${field("audits", "Audit assignments: auditor-group > target-group (one per line)", schedule.audits.map((a) => `${a.from} > ${a.to}`).join("\n"), 5000)}<button type="button" data-match="${phase}" class="course-quiet">Fill circular audit assignments</button>${actions("Save phase administration")}</form></section>`;
  }
  const edition = requirementsFor(course);
  return `<section class="course-section"><h3>Course settings</h3><p>Course identity, staff access and the published rubric used for this run.</p><p class="course-muted">Run identifier: <code>${e(course.id)}</code>. Requirements edition: <a href="${requirementUrl(edition.version, "common")}">${e(edition.version)}</a>; retained for this run.</p><form data-form="settings">${input("name", "Course run name", course.name)}${field("staff", "Course staff: numeric GitHub IDs, one per line", course.staff.join("\n"), 500, true)}<label class="course-field">Published rubric<select name="rubric"><option value="${e(course.rubric)}">${e(course.rubric)}</option></select><small>The run retains its rubric version for historical assessments.</small></label>${actions("Save course settings")}</form></section>`;
}

function roster(source: string): Student[] {
  const rows = csvRows(source);
  if (rows.shift()?.join(",") !== "student_number,name,github_id,github_login")
    throw new Error(
      "Keep the roster CSV header: student_number,name,github_id,github_login.",
    );
  return rows.map((row) => {
    if (row.length !== 4)
      throw new Error("Each roster row needs four columns.");
    return {
      number: row[0]!.trim(),
      name: row[1]!.trim(),
      id: `github:${row[2]!.trim().replace(/^github:/, "")}`,
      login: row[3]!.trim().toLowerCase(),
    };
  });
}

export function administrationPayload(
  form: HTMLFormElement,
  values: FormData,
  course: Course,
  phase: Phase,
  section: AdministrationSection,
  revisions: AdministrationRevisions,
) {
  const val = (key: string) => String(values.get(key) ?? "");
  const expected =
    section === "groups" || section === "schedule"
      ? revisions[section][phase]
      : revisions[section];
  const base = { expected, reason: val("reason") };
  if (section === "students") {
    const source = val("roster");
    if (
      csvRows(source)[0]?.join(",") ===
      "student_number,name,github_id,github_login"
    )
      return { ...base, students: roster(source) };
    const mapping = Object.fromEntries(
      rosterColumns.map((key) => [key, val(`map-${key}`)]),
    ) as Record<RosterColumn, string>;
    return {
      ...base,
      format: "institutional",
      students: mappedRoster(source, mapping),
    };
  }
  if (section === "settings")
    return {
      ...base,
      name: val("name"),
      staff: val("staff")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      rubric: val("rubric"),
    };
  if (section === "groups")
    return {
      ...base,
      groups: Array.from(
        form.querySelectorAll<HTMLElement>("[data-group-row]"),
      ).map((row) => {
        const index = row.dataset.groupRow!;
        return {
          id: val(`id-${index}`),
          members: values.getAll(`members-${index}`).map(String),
          name: val(`name-${index}`),
          exception: val(`exception-${index}`),
          proposal: val(`proposal-${index}`),
        };
      }),
    };
  const deadlines = Object.fromEntries(
    ["freezeAt", "auditAt", "evidenceAt"].map((key) => {
      const original =
        course.phases[phase][key as "freezeAt" | "auditAt" | "evidenceAt"];
      return [
        key,
        val(key) === localDate(original)
          ? original
          : new Date(val(key)).toISOString(),
      ];
    }),
  );
  const audits = val("audits")
    .split("\n")
    .filter((s) => s.trim())
    .map((line) => {
      const pair = line.split(">");
      if (pair.length !== 2)
        throw new Error("Write each audit as auditor-group > target-group.");
      return { from: pair[0]!.trim(), to: pair[1]!.trim() };
    });
  return { ...base, ...deadlines, audits };
}

export function previewMarkup(preview: RosterPreview) {
  return `<aside class="course-note"><h4>Roster import preview</h4><p>${preview.added.length} additions · ${preview.updated.length} corrections · ${preview.unchanged} unchanged. All ${preview.retained} existing students remain enrolled.</p>${preview.added.length || preview.updated.length ? `<ul>${[...preview.added.map((s) => ({ s, action: "Add" })), ...preview.updated.map((s) => ({ s, action: "Correct" }))].map(({ s, action }) => `<li>${action}: ${e(s.name)} · ${e(s.number)} · ${e(s.login)}</li>`).join("")}</ul>` : ""}</aside>`;
}

export function mappingMarkup(headers: string[]) {
  const labels = [
    "Student ID column",
    "First name column",
    "Last name column",
    "Email column",
  ];
  return rosterColumns
    .map(
      (key, i) =>
        `<label class="course-field">${labels[i]}<select name="map-${key}"><option value="">Choose column</option>${headers.map((header) => `<option value="${e(header)}" ${header === key ? "selected" : ""}>${e(header)}</option>`).join("")}</select></label>`,
    )
    .join("");
}
