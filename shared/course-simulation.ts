export const simulationPresetVersion = "2026-10-v2";
export const simulationPresets = [
  "empty",
  "preparation",
  "grading-review",
] as const;
export type SimulationPreset = (typeof simulationPresets)[number];
export type SimulationSize = "compact" | "larger";
export interface SimulationSelection {
  id: SimulationPreset;
  version: typeof simulationPresetVersion;
  size: SimulationSize;
}
export interface SimulationState {
  version: 1;
  generation: string;
  now: string;
  role: { course: string; student: string } | null;
  preset?: SimulationSelection;
  preparing?: {
    selection: SimulationSelection;
    generation: string;
    plan: string;
    cursor: number;
    total: number;
    now: string;
  };
}
