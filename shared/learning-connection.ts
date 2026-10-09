import type { TeachingContext } from "./learning-agent.ts";

/** Release and connection metadata, independent of a provider or rendering. */
export const companionRelease = {
  name: "@scalableweb/companion",
  version: "0.3.0",
  protocol: 2,
  notebookSchema: 1,
  conversationSchema: 1,
  localProviderSchema: 1,
  codexVersion: "0.154.0",
} as const;
export interface CompanionStatus {
  connected: true;
  version: number;
  provider: string | null;
  readingActivities?: { id: string; version: number }[];
  /** Absent on older companions and when no policy-aware provider is enabled. */
  teaching?: TeachingContext;
  capabilities?: { tools: "none" | "native"; contextWindow: number };
  release?: { name: string; version: string; sourceRevision: string };
  storage?: string;
  schemas?: {
    notebook: number;
    conversations: number;
    archive: number;
    localProvider?: number;
  };
}
