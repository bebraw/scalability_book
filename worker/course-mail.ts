import type { SendEmail } from "@cloudflare/workers-types";
import type { CourseMailTransport } from "./course-auth.ts";

export const courseSender = "info@scalableweb.dev";
const escape = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });

// Adapters select this transport explicitly. Development/simulation use their
// own mock transport and never fall back to a production binding.
export function cloudflareCourseMail(
  binding: SendEmail | undefined,
  enabled: string | undefined,
): CourseMailTransport | undefined {
  if (!binding || enabled !== "true") return undefined;
  return {
    async send(message) {
      const link = new URL(message.url);
      if (
        link.origin !== "https://scalableweb.dev" ||
        link.pathname !== "/course/" ||
        link.username ||
        link.password ||
        link.searchParams.get("course") !== message.course ||
        !/^#login=[a-zA-Z0-9_-]{43}$/.test(link.hash)
      )
        throw new Error("Invalid course sign-in destination.");
      const expires = new Date(message.expiresAt).toISOString();
      const text = `Sign in to ${message.courseName}\n\nOpen this link and choose Confirm sign-in:\n${link.href}\n\nThis link can be used once and expires at ${expires} (UTC), 15 minutes after it was requested. Do not forward it.\n\nIf you did not request a sign-in link, you can ignore this message. For help, contact ${courseSender}.`;
      await binding.send({
        from: { email: courseSender, name: "Scalable Web course" },
        to: message.to,
        replyTo: courseSender,
        subject: "Your course sign-in link",
        text,
        html: `<h1>Sign in to ${escape(message.courseName)}</h1><p><a href="${escape(link.href)}">Open your course sign-in link</a>, then choose <strong>Confirm sign-in</strong>.</p><p>This link can be used once and expires at ${escape(expires)} (UTC), 15 minutes after it was requested. Do not forward it.</p><p>If you did not request a sign-in link, you can ignore this message. For help, contact <a href="mailto:${courseSender}">${courseSender}</a>.</p>`,
      });
    },
  };
}
