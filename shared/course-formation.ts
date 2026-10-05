import type { Course, Group, Phase } from "./course.ts";

export interface FormationPreference {
  student: string;
  revision: string;
  request: "none" | "assign";
  available: boolean;
  availability: string;
  support: string;
}
export interface GroupProposal {
  id: string;
  revision: string;
  proposer: string;
  members: string[];
  confirmed: string[];
  name: string;
  closed: boolean;
}
export interface GroupFormation {
  deadline: string;
  correctionUntil: string;
  publishedAt: string | null;
  preferences: FormationPreference[];
  proposals: GroupProposal[];
}
export interface WorkingAgreement {
  phase: Phase;
  group: string;
  text: string;
}
export const groupLabel = (group: Group) => {
  const number = /^group-([0-9]+)$/.exec(group.id)?.[1];
  return `${number ? `Group ${number}` : group.id}${group.name ? ` · ${group.name}` : ""}`;
};
export function proposalAllocation(
  course: Course,
  phase: Phase,
  proposal: GroupProposal,
) {
  return course.phases[phase].groups.find(
    (g) =>
      g.proposal === proposal.id &&
      proposal.members.every((s) => g.members.includes(s)),
  );
}

// Only names and an explicit opt-in signal are public. Private matching notes
// stay with the requesting student and staff, including in course snapshots.
export function studentFormation(
  formation: GroupFormation,
  student: string,
): GroupFormation {
  return {
    ...formation,
    preferences: formation.preferences.map((p) =>
      p.student === student
        ? p
        : {
            student: p.student,
            revision: "",
            request: "none",
            available: p.available,
            availability: "",
            support: "",
          },
    ),
    proposals: formation.proposals.filter((p) => p.members.includes(student)),
  };
}
