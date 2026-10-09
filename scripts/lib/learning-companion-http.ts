import { randomBytes } from "node:crypto";
import { queueInvestigation } from "../../shared/reading-investigation.ts";
import type { LearningNotebook } from "./learning-notebook.ts";
import type { LearningConversations } from "./learning-conversations.ts";
import {
  companionRelease,
  type CompanionStatus,
} from "../../shared/learning-connection.ts";
import {
  LearningProblem,
  learningAssert,
  learningObject,
  learningList,
  learningId,
  notebookMarkdown,
} from "../../shared/learning-workspace.ts";

export interface CompanionOptions {
  origins: string[];
  port: number;
  notebook: LearningNotebook;
  now?: () => number;
  conversations?: LearningConversations;
  metadata?: Pick<CompanionStatus, "release" | "storage" | "schemas">;
}
export function createCompanionHandler(options: CompanionOptions) {
  const now = options.now ?? Date.now;
  const origins = new Set(
    options.origins.map((origin) => {
      const url = new URL(origin);
      learningAssert(
        url.origin === origin && ["http:", "https:"].includes(url.protocol),
        "Configure exact HTTP(S) origins.",
      );
      return origin;
    }),
  );
  const sessions = new Map<string, { origin: string; expires: number }>();
  function createSession(origin: string) {
    for (const [token, session] of sessions)
      if (session.expires <= now()) sessions.delete(token);
    learningAssert(
      sessions.size < 64,
      "Too many connected tabs. Disconnect unused tabs or restart the companion; your stored work is retained.",
      429,
    );
    const token = randomBytes(32).toString("base64url");
    sessions.set(token, { origin, expires: now() + 12 * 60 * 60_000 });
    return { token, version: companionRelease.protocol };
  }
  async function body(request: Request, maximum = 96_000) {
    learningAssert(
      request.headers.get("content-type")?.split(";")[0] === "application/json",
      "Send JSON.",
      415,
    );
    learningAssert(request.body, "Missing request body.");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.length;
        if (length > maximum) {
          await reader.cancel();
          throw new LearningProblem("Request is too large.", 413);
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    try {
      return learningObject(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch (error) {
      if (error instanceof LearningProblem) throw error;
      throw new LearningProblem("Invalid JSON.");
    }
  }
  return {
    async handle(request: Request): Promise<Response> {
      const origin = request.headers.get("origin") ?? "";
      const headers = new Headers({
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        Vary: "Origin",
      });
      const reply = (value: unknown, status = 200) =>
        Response.json(value, { status, headers });
      try {
        const url = new URL(request.url);
        learningAssert(
          url.host === `127.0.0.1:${options.port}`,
          "Use the loopback companion address.",
          403,
        );
        learningAssert(
          origins.has(origin),
          "This website is not allowed to connect to the companion.",
          403,
        );
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS",
        );
        headers.set(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type",
        );
        headers.set("Access-Control-Allow-Private-Network", "true");
        if (request.method === "OPTIONS")
          return new Response(null, { status: 204, headers });
        if (url.pathname === "/connect" && request.method === "POST") {
          // JSON excludes simple cross-site form requests. The exact allowed
          // Origin and loopback Host above authorize this session bootstrap.
          await body(request);
          return reply(createSession(origin));
        }
        const token = request.headers
          .get("authorization")
          ?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
        const session = token ? sessions.get(token) : undefined;
        learningAssert(
          session && session.origin === origin && session.expires > now(),
          session && session.expires <= now()
            ? "Your companion session expired."
            : "Connect the companion from the book's Connect section.",
          401,
        );
        if (url.pathname === "/disconnect" && request.method === "POST") {
          await options.conversations?.stop(token!);
          sessions.delete(token!);
          return reply({ disconnected: true });
        }
        if (url.pathname === "/status" && request.method === "GET")
          return reply({
            connected: true,
            version: companionRelease.protocol,
            provider: options.conversations?.provider ?? null,
            readingActivities: [
              {
                id: queueInvestigation.id,
                version: queueInvestigation.version,
              },
            ],
            ...(options.conversations?.capabilities
              ? { capabilities: options.conversations.capabilities }
              : {}),
            ...(options.conversations?.teaching
              ? { teaching: options.conversations.teaching }
              : {}),
            ...options.metadata,
          });
        if (url.pathname.startsWith("/agent/")) {
          const conversations = options.conversations;
          learningAssert(
            conversations,
            "Agent conversations are unavailable in this companion.",
            503,
          );
          if (
            url.pathname === "/agent/conversations" &&
            request.method === "GET"
          )
            return reply(conversations.list());
          if (
            url.pathname === "/agent/conversations" &&
            request.method === "POST"
          )
            return reply(conversations.start(await body(request), origin), 201);
          if (url.pathname === "/agent/stop" && request.method === "POST")
            return reply(await conversations.stop(token!));
          if (url.pathname === "/agent/requests" && request.method === "GET")
            return reply(
              conversations.requests(
                token!,
                learningId(url.searchParams.get("browser")),
              ),
            );
          const conversation = url.pathname.match(
            /^\/agent\/conversations\/([a-f0-9-]{36})$/,
          );
          if (conversation && request.method === "GET")
            return reply(conversations.get(conversation[1]!));
          if (conversation && request.method === "POST")
            return reply(
              conversations.send(
                conversation[1]!,
                await body(request),
                token!,
                origin,
              ),
              202,
            );
          const result = url.pathname.match(
            /^\/agent\/requests\/([a-f0-9-]{36})$/,
          );
          if (result && request.method === "POST")
            return reply(
              conversations.respond(result[1]!, await body(request), token!),
            );
        }
        if (url.pathname === "/notebook" && request.method === "GET")
          return reply({
            entries: options.notebook.entries(),
            judgments: options.notebook.judgments(),
          });
        if (url.pathname === "/entries" && request.method === "POST")
          return reply(options.notebook.saveEntry(await body(request)), 201);
        const entryMatch = url.pathname.match(/^\/entries\/([a-f0-9-]{36})$/);
        if (entryMatch && request.method === "PUT")
          return reply(
            options.notebook.saveEntry({
              ...(await body(request)),
              id: entryMatch[1],
            }),
          );
        if (entryMatch && request.method === "DELETE") {
          const value = await body(request);
          options.notebook.deleteEntry(
            entryMatch[1]!,
            learningId(value.expected),
          );
          return reply({ deleted: true });
        }
        if (url.pathname === "/judgments" && request.method === "POST")
          return reply(options.notebook.saveJudgment(await body(request)));
        if (url.pathname === "/export" && request.method === "GET")
          return reply(options.notebook.export());
        if (url.pathname === "/import" && request.method === "POST")
          return reply(
            options.notebook.import(await body(request, 16_000_000)),
          );
        if (url.pathname === "/prepare" && request.method === "POST") {
          const value = await body(request);
          const entries = learningList(value.ids, 200).map((id) => {
            const entry = options.notebook.entry(learningId(id));
            learningAssert(entry, "A selected note is missing.", 404);
            return entry;
          });
          learningAssert(
            entries.length,
            "Select notes for your submission draft.",
          );
          return reply({
            markdown: notebookMarkdown(entries),
            sourceIds: entries.map((entry) => entry.id),
          });
        }
        return reply({ message: "Unknown companion route." }, 404);
      } catch (error) {
        return reply(
          {
            message:
              error instanceof LearningProblem
                ? error.message
                : "The companion could not complete this request. Your stored notebook was retained.",
          },
          error instanceof LearningProblem ? error.status : 500,
        );
      }
    },
  };
}
