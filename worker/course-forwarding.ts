import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import { courseEmailAddress } from "./course-mail.ts";

type IncomingMessage = Pick<
  ForwardableEmailMessage,
  "to" | "forward" | "setReject"
>;

// Both addresses stay in Worker secrets. Forward the existing stream through
// Cloudflare without parsing, storing or logging the message or private address.
export async function forwardCourseEmail(
  message: IncomingMessage,
  configuredDestination: string | undefined,
  configuredInbox: string | undefined,
) {
  const courseInbox = courseEmailAddress(configuredInbox);
  if (!courseInbox) {
    message.setReject("Course inbox forwarding is unavailable.");
    return;
  }
  if (message.to.toLowerCase() !== courseInbox.toLowerCase()) {
    message.setReject("Unknown course inbox.");
    return;
  }
  const destination = configuredDestination?.trim();
  if (
    !destination ||
    !/^[^\s<>@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(destination) ||
    destination.toLowerCase() === courseInbox.toLowerCase()
  ) {
    message.setReject("Course inbox forwarding is unavailable.");
    return;
  }
  try {
    await message.forward(destination);
  } catch {
    // Provider errors can contain the destination or other message metadata.
    throw new Error("Course inbox forwarding failed.");
  }
}
