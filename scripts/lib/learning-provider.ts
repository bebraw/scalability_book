import type { TeachingPolicyIdentity } from "../../shared/learning-agent.ts";

export interface LearningReply {
  text: string;
  model: string;
  notices: string[];
}
export interface LearningProvider {
  name: string;
  version?: string | null;
  model?: string;
  teaching?: TeachingPolicyIdentity;
  /** Local models receive relevant authored navigation rather than all catalogs. */
  focusedContext?: boolean;
  capabilities?: { tools: "none" | "native"; contextWindow: number };
  validateThread?(threadId: string | null): void;
  run(
    threadId: string | null,
    text: string,
    tool: (name: string, args: unknown) => Promise<unknown>,
    saveThread: (id: string) => void,
  ): Promise<string | LearningReply>;
  cancel(): Promise<void>;
  close(): void;
}

export const learningToolSpecs = [
  {
    type: "function",
    name: "read_book",
    description:
      "Read an approved published book page/resource. HTML is static source, not an observed demo.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "observe_demo",
    description:
      "Observe the real active browser demo, its declared controls, current inputs, visible results and authored assumptions.",
    inputSchema: {
      type: "object",
      properties: { demoId: { type: "string" } },
      required: ["demoId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "change_demo",
    description:
      "Propose one bounded change to a declared live demo control. The student must have saved initial thinking and approve it in the browser. The result is a real observation.",
    inputSchema: {
      type: "object",
      properties: {
        demoId: { type: "string" },
        controlId: { type: "string" },
        value: { type: ["string", "number", "boolean", "null"] },
      },
      required: ["demoId", "controlId", "value"],
      additionalProperties: false,
    },
  },
];
