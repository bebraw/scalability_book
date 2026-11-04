import { openChatHistory } from "./learning-chat-history.ts";
export type {
  ChatWireMessage as LocalWireMessage,
  ChatTurn as LocalTurn,
} from "./learning-chat-history.ts";

/** Retain the original local transcript entry point and on-disk contract. */
export function openLocalHistory(directory: string, backend: string) {
  return openChatHistory(directory, backend, "local");
}
