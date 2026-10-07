import type { TeachingContext } from "./learning-agent.ts";

/** Release and connection metadata, independent of a provider or rendering. */
export const companionRelease = {
  name: "@scalableweb/companion",
  version: "0.1.0",
  protocol: 1,
  notebookSchema: 1,
  conversationSchema: 1,
  codexVersion: "0.154.0",
} as const;
export interface CompanionStatus {
  connected: true;
  version: number;
  provider: string | null;
  /** Absent on older companions and when no policy-aware provider is enabled. */
  teaching?: TeachingContext;
  release?: { name: string; version: string; sourceRevision: string };
  storage?: string;
  schemas?: { notebook: number; conversations: number; archive: number };
}
