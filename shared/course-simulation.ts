export interface SimulationState {
  version: 1;
  generation: string;
  now: string;
  role: { course: string; student: string } | null;
}
