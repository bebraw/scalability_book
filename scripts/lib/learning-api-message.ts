import { learningAssert } from "../../shared/learning-workspace.ts";
import type { ChatWireMessage } from "./learning-chat-history.ts";

function googleSignature(
  value: unknown,
): Pick<ChatWireMessage, "extra_content"> {
  if (value === undefined) return {};
  learningAssert(
    value && typeof value === "object" && !Array.isArray(value),
    "The API returned invalid private continuation metadata. No tool was executed.",
    502,
  );
  const google = (value as { google?: unknown }).google;
  if (google === undefined) return {};
  learningAssert(
    google && typeof google === "object" && !Array.isArray(google),
    "The API returned invalid private continuation metadata. No tool was executed.",
    502,
  );
  const signature = (google as { thought_signature?: unknown })
    .thought_signature;
  if (signature === undefined) return {};
  learningAssert(
    typeof signature === "string" &&
      signature.length > 0 &&
      Buffer.byteLength(signature, "utf8") <= 128_000,
    "The API returned invalid or oversized private continuation metadata. No tool was executed.",
    502,
  );
  return { extra_content: { google: { thought_signature: signature } } };
}

/** Copy only validated wire fields and Google's bounded opaque signatures.
 * Signatures remain in their original positions for private replay.
 */
export function copyApiAssistantMessage(
  message: Record<string, unknown>,
  preserveGoogleSignatures: boolean,
): ChatWireMessage {
  const calls = message.tool_calls as
    | NonNullable<ChatWireMessage["tool_calls"]>
    | undefined;
  return {
    role: "assistant",
    content: (message.content as string | null) ?? null,
    ...(preserveGoogleSignatures ? googleSignature(message.extra_content) : {}),
    ...(calls?.length
      ? {
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.function.name,
              arguments: call.function.arguments,
            },
            ...(preserveGoogleSignatures
              ? googleSignature(call.extra_content)
              : {}),
          })),
        }
      : {}),
  };
}
