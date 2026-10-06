import type { Course, Phase } from "../shared/course.ts";
import type {
  GroupFormation,
  GroupProposal,
  FormationPreference,
} from "../shared/course-formation.ts";
import { proposalAllocation } from "../shared/course-formation.ts";
import { administrationRevisions } from "./course-administration.ts";
import {
  activeStudent,
  activeStudents,
  activeGroups,
} from "../shared/course-enrollment.ts";
import {
  array,
  date,
  requireThat,
  studentId,
  text,
  unique,
} from "./course-validation.ts";

const expected = (value: unknown, revision: string | null) =>
  requireThat(
    value === revision,
    "This formation record changed. Reload before saving; your text has not been saved.",
    409,
  );
const enrolled = (course: Course, id: string) =>
  course.students.some((s) => s.id === id && activeStudent(s));
function open(
  formation: GroupFormation | undefined,
  now: string,
): asserts formation is GroupFormation {
  requireThat(
    formation && !formation.publishedAt && now < formation.deadline,
    "The student group formation period is closed.",
    409,
  );
}
function boolean(value: unknown) {
  requireThat(typeof value === "boolean", "Specify a true or false value.");
  return value;
}
function proposal(formation: GroupFormation, id: string | undefined) {
  const found = formation.proposals.find((p) => p.id === id);
  requireThat(found, "Unknown group proposal.", 404);
  return found;
}

export function configureFormation(
  course: Course,
  phase: Phase,
  body: Record<string, unknown>,
  now: string,
) {
  expected(body.expected, administrationRevisions(course).groups[phase]);
  const next = structuredClone(course),
    schedule = next.phases[phase];
  const old = schedule.formation;
  const deadline = date(body.deadline),
    correctionUntil = date(body.correctionUntil);
  requireThat(
    deadline < correctionUntil && correctionUntil < schedule.freezeAt,
    "Formation must close before its correction window, and both must end before implementation freezes.",
  );
  requireThat(
    !old?.publishedAt ||
      (deadline === old.deadline && correctionUntil === old.correctionUntil),
    "Published formation dates are retained. Record later membership corrections through group allocation.",
  );
  const formation: GroupFormation = {
    deadline,
    correctionUntil,
    publishedAt: old?.publishedAt ?? null,
    preferences: old?.preferences ?? [],
    proposals: old?.proposals ?? [],
  };
  if (body.publish === true) {
    requireThat(
      activeStudents(course).length > 0 &&
        activeStudents(course).every((s) =>
          schedule.groups.some((g) => g.members.includes(s.id)),
        ),
      "Allocate every enrolled student before publishing groups.",
    );
    requireThat(
      activeGroups(course, phase).every(
        (g) =>
          g.members.length <= 4 &&
          (g.members.length === 3 || Boolean(g.exception)),
      ),
      "Approve and explain every group size exception before publishing.",
    );
    requireThat(
      now < correctionUntil,
      "Publish groups while their correction window is still open.",
    );
    formation.publishedAt ??= now;
  }
  schedule.formation = formation;
  return next;
}

// These student actions update only one preference/proposal on the latest
// snapshot. The caller writes with the course's atomic revision check.
export function updateFormation(
  course: Course,
  phase: Phase,
  action: string,
  subject: string | undefined,
  body: Record<string, unknown>,
  actor: string,
  now: string,
) {
  requireThat(enrolled(course, actor), "Student enrollment required.", 403);
  const next = structuredClone(course),
    formation = next.phases[phase].formation;
  open(formation, now);
  if (action === "group-preference") {
    const prior = formation.preferences.find((p) => p.student === actor);
    expected(body.expected, prior?.revision ?? null);
    requireThat(
      body.request === "none" || body.request === "assign",
      "Choose whether to request instructor allocation.",
    );
    const value: FormationPreference = {
      student: actor,
      revision: crypto.randomUUID(),
      request: body.request,
      available: boolean(body.available),
      availability: text(body.availability, "Meeting availability", 1000),
      support: text(body.support, "Private allocation constraints", 1000),
    };
    formation.preferences = [
      ...formation.preferences.filter((p) => p.student !== actor),
      value,
    ];
    return next;
  }
  const prior = subject ? proposal(formation, subject) : undefined;
  if (action === "group-proposal") {
    requireThat(
      !prior || prior.proposer === actor,
      "Only the proposer can edit this pending invitation.",
      403,
    );
    requireThat(
      !prior || !proposalAllocation(course, phase, prior),
      "An allocated proposal is retained; ask the instructor for a membership correction.",
      409,
    );
    expected(body.expected, prior?.revision ?? null);
    if (body.close === true) {
      requireThat(prior, "Select the proposal to withdraw.");
      prior.closed = true;
      prior.revision = crypto.randomUUID();
      return next;
    }
    const members = array(body.members, 4).map(studentId);
    requireThat(
      members.length > 0 && unique(members) && members.includes(actor),
      "Include yourself and distinct teammates; partial proposals are allowed.",
    );
    requireThat(
      members.every((s) => enrolled(course, s)),
      "Proposed members must be enrolled.",
    );
    requireThat(
      !formation.proposals.some(
        (p) => p.id !== prior?.id && !p.closed && p.confirmed.includes(actor),
      ),
      "Withdraw or decline your other confirmed proposal before proposing another.",
    );
    requireThat(
      prior ||
        formation.proposals.filter((p) => p.proposer === actor).length < 20,
      "Too many proposals. Ask the instructor for allocation.",
      429,
    );
    requireThat(
      prior || formation.proposals.length < 250,
      "The formation queue is full. Ask the instructor for allocation.",
      429,
    );
    const value: GroupProposal = {
      id: prior?.id ?? crypto.randomUUID(),
      revision: crypto.randomUUID(),
      proposer: actor,
      members,
      confirmed: [actor],
      name: text(body.name, "Optional group name", 80),
      closed: false,
    };
    formation.proposals = [
      ...formation.proposals.filter((p) => p.id !== value.id),
      value,
    ];
    return next;
  }
  requireThat(
    action === "group-confirmation" && prior,
    "Unknown formation action.",
    404,
  );
  requireThat(
    !prior.closed && prior.members.includes(actor),
    "Only an invited member can respond to this proposal.",
    403,
  );
  requireThat(
    !proposalAllocation(course, phase, prior),
    "An allocated proposal is retained; ask the instructor for a membership correction.",
    409,
  );
  expected(body.expected, prior.revision);
  const confirm = boolean(body.confirm);
  requireThat(
    !confirm || prior.members.every((id) => enrolled(course, id)),
    "A proposed member is no longer active. Ask the instructor to review the allocation.",
    409,
  );
  if (confirm)
    requireThat(
      !formation.proposals.some(
        (p) => p.id !== prior.id && !p.closed && p.confirmed.includes(actor),
      ),
      "Decline your other confirmed proposal before accepting this one.",
    );
  prior.confirmed = [
    ...prior.confirmed.filter((s) => s !== actor),
    ...(confirm ? [actor] : []),
  ];
  // Declining releases the invitee; a proposer must withdraw their own proposal.
  if (!confirm && actor === prior.proposer) prior.closed = true;
  prior.revision = crypto.randomUUID();
  return next;
}
