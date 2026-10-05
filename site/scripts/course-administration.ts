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

const labels: Record<AdministrationSection, string> = {
  students: "Students",
  groups: "Groups",
  schedule: "Phase administration",
  settings: "Course settings",
};
const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
const reason = () => input("reason", "Reason for change", "");
const history = (record: Envelope<Course>) =>
  `<button type="button" class="course-quiet" data-history="${e(record.key)}">Record history</button>`;

export function administrationNavigation(current: string) {
  return `<nav class="course-administration-nav" aria-label="Course administration"><span class="course-eyebrow">Administration</span>${administrationSections.map((section) => `<button type="button" class="course-quiet" data-tab="${section}" ${current === section ? 'aria-current="page"' : ""}>${labels[section]}</button>`).join("")}</nav>`;
}

export function groupRow(course: Course, group: Group, index: number) {
  return `<fieldset class="course-group-row" data-group-row="${index}"><legend>${e(group.id || "New group")}</legend><input type="hidden" name="id-${index}" value="${e(group.id)}"><label class="course-field">Members<select multiple name="members-${index}" size="4">${course.students.map((s) => `<option value="${e(s.id)}" ${group.members.includes(s.id) ? "selected" : ""}>${e(s.name)} (${e(s.login)})</option>`).join("")}</select><small>Choose multiple names with Command/Ctrl-click. Every student can belong to one group in a phase.</small></label><button type="button" class="course-quiet" data-remove-group>Remove from this allocation</button></fieldset>`;
}

export function renderAdministration(
  record: Envelope<Course>,
  phase: Phase,
  section: AdministrationSection,
) {
  const course = record.value,
    schedule = course.phases[phase];
  const actions = (label: string) =>
    `${reason()}<div class="course-form-actions"><button type="submit">${label}</button>${history(record)}</div>`;
  if (section === "students") {
    const source = [
      "student_number,name,github_id,github_login",
      ...course.students.map((s) =>
        [s.number, s.name, s.id.replace(/^github:/, ""), s.login]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");
    return `<section class="course-section"><h3>Students</h3><p>Import students now and form groups later. Imports add or update students; omitted rows remain enrolled.</p><div class="course-table-scroll" tabindex="0" role="region" aria-label="Course roster"><table class="course-table"><caption>Enrolled students · private to staff</caption><thead><tr><th>Name</th><th>Student number</th><th>GitHub login</th><th>Access identity</th></tr></thead><tbody>${course.students.map((s) => `<tr><th>${e(s.name)}</th><td>${e(s.number)}</td><td>${e(s.login)}</td><td><code>${e(s.id)}</code></td></tr>`).join("")}</tbody></table></div><form data-form="students">${field("roster", "Roster CSV: student_number,name,github_id,github_login", source, 24000, true)}<p class="course-muted">Use numeric GitHub user IDs for access. Keep the ID when correcting a student's name, number or login. You can paste just the rows to add or correct.</p><button type="submit" value="preview" class="course-quiet" formnovalidate>Preview roster changes</button><div data-roster-preview aria-live="polite"></div>${actions("Save roster")}</form></section>`;
  }
  if (section === "groups") {
    const unassigned = course.students.filter(
      (s) => !schedule.groups.some((g) => g.members.includes(s.id)),
    );
    return `<section class="course-section"><h3>${title(phase)} groups</h3><p>Allocate enrolled students to groups. New groups receive a course identifier when saved. Reuse Establish groups in later phases to keep their identifiers.</p><aside class="course-note"><strong>${unassigned.length} students awaiting allocation</strong><p>${e(unassigned.map((s) => s.name).join(", ") || "Everyone is assigned.")}</p></aside><form data-form="groups" data-next-group="${schedule.groups.length}"><div data-group-rows class="course-group-grid">${schedule.groups.map((g, i) => groupRow(course, g, i)).join("")}</div><div class="course-form-actions"><button type="button" data-add-group class="course-quiet" ${!course.students.length ? "disabled" : ""}>Add a group</button>${phase !== "establish" ? '<button type="button" data-reuse-groups class="course-quiet">Reuse Establish groups</button>' : ""}</div><p class="course-muted">Frozen membership and groups with saved evidence are retained. Clear any audit assignments before removing an unused group.</p>${actions("Save groups")}</form></section>`;
  }
  if (section === "schedule") {
    return `<section class="course-section"><h3>${title(phase)} administration</h3><p>Prepare deadlines and audit assignments for this phase. Save groups before arranging their audits.</p><form data-form="schedule"><div class="course-deadline-inputs">${input("freezeAt", "Implementation deadline", localDate(schedule.freezeAt), true, "datetime-local")}${input("auditAt", "Audit closes / class access opens", localDate(schedule.auditAt), true, "datetime-local")}${input("evidenceAt", "Evidence and portfolio deadline", localDate(schedule.evidenceAt), true, "datetime-local")}</div><p>Saved groups: ${e(schedule.groups.map((g) => g.id).join(", ") || "none yet")}.</p>${field("audits", "Audit assignments: auditor-group > target-group (one per line)", schedule.audits.map((a) => `${a.from} > ${a.to}`).join("\n"), 5000)}<button type="button" data-match="${phase}" class="course-quiet">Fill circular audit assignments</button>${actions("Save phase administration")}</form></section>`;
  }
  return `<section class="course-section"><h3>Course settings</h3><p>Course identity, staff access and the published rubric used for this run.</p><p class="course-muted">Run identifier: <code>${e(course.id)}</code>.</p><form data-form="settings">${input("name", "Course run name", course.name)}${field("staff", "Course staff: numeric GitHub IDs, one per line", course.staff.join("\n"), 500, true)}<label class="course-field">Published rubric<select name="rubric"><option value="${e(course.rubric)}">${e(course.rubric)}</option></select><small>The run retains its rubric version for historical assessments.</small></label>${actions("Save course settings")}</form></section>`;
}

function csvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("The roster CSV contains an unclosed quote.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((s) => s.trim())) rows.push(row);
  return rows.filter((row) => row.some((s) => s.trim()));
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
  course: Course,
  phase: Phase,
  section: AdministrationSection,
  revisions: AdministrationRevisions,
) {
  const values = new FormData(form);
  const val = (key: string) => String(values.get(key) ?? "");
  const expected =
    section === "groups" || section === "schedule"
      ? revisions[section][phase]
      : revisions[section];
  const base = { expected, reason: val("reason") };
  if (section === "students")
    return { ...base, students: roster(val("roster")) };
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
