import type { Phase, Student } from "./course.ts";

export const administrationSections = [
  "students",
  "groups",
  "schedule",
  "settings",
] as const;
export type AdministrationSection = (typeof administrationSections)[number];
export interface AdministrationRevisions {
  students: string;
  settings: string;
  groups: Record<Phase, string>;
  schedule: Record<Phase, string>;
}
export interface RosterPreview {
  added: Student[];
  updated: Student[];
  unchanged: number;
  retained: number;
}
export interface AccessActivity {
  student: string;
  firstSignIn: string;
  lastSignIn: string;
}
