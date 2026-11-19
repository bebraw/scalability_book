import { createHash, timingSafeEqual } from "node:crypto";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  feedbackResolutionReasons,
  type FeedbackResolutionReason,
} from "../shared/feedback-resolution.ts";
import {
  feedbackStatus,
  matchesFeedbackStatus,
} from "../shared/feedback-status.ts";

type FeedbackIssue = {
  id: string;
  chapter: string;
  paragraphId: string;
  category?: string;
  body: string;
  createdAt: string;
  resolvedAt?: string | null;
  hiddenAt?: string | null;
  featuredAt?: string | null;
  resolutionReason?: string | null;
  replies?: { body: string; createdAt: string }[];
};

type FeedbackSource = {
  readChapter(chapter: string): Promise<FeedbackIssue[]>;
  readAll(): Promise<FeedbackIssue[]>;
  pageUrl(chapter: string): URL | null;
  resolve(
    chapter: string,
    id: string,
    reason: FeedbackResolutionReason,
    login: string,
  ): Promise<FeedbackIssue | null>;
};

const credentialSchema = z.strictObject({
  login: z.string().regex(/^[a-z0-9-]{1,39}$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  resolve: z.boolean().optional(),
});
type Credential = z.infer<typeof credentialSchema>;
const chapterSlug = z.string().regex(/^[a-z0-9-]{1,160}$/);
const issueId = z.string().min(1).max(100);
const pageOffset = z.number().int().nonnegative().max(1_000_000).default(0);
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const issueSummary = z.object({
  id: z.string(),
  chapter: z.string(),
  paragraphId: z.string(),
  passageUrl: z.string().nullable(),
  category: z.string().nullable(),
  status: z.enum(["open", "resolved", "hidden"]),
  featured: z.boolean(),
  createdAt: z.string(),
});
const replyPageSize = 10;
const cacheControl = "private, no-store";

function readCredential(value: string | undefined) {
  if (!value) return null;
  try {
    return credentialSchema.safeParse(JSON.parse(value)).data ?? null;
  } catch {
    return null;
  }
}

function summarize(issue: FeedbackIssue, source: FeedbackSource) {
  const passage = source.pageUrl(issue.chapter);
  if (passage && issue.paragraphId !== "p-chapter-reflection") {
    passage.hash = encodeURIComponent(issue.paragraphId);
  }

  return {
    id: issue.id,
    chapter: issue.chapter,
    paragraphId: issue.paragraphId,
    passageUrl: passage?.href ?? null,
    category: issue.category ?? null,
    status: feedbackStatus(issue),
    featured: Boolean(issue.featuredAt),
    createdAt: issue.createdAt,
  };
}

async function feedbackResult(
  work: () => Promise<Record<string, unknown> | null>,
  failure = "Could not read feedback. Retry or open the feedback overview.",
) {
  try {
    const data = await work();
    if (data) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    }
    return toolError("No feedback issue matches that chapter and ID.");
  } catch {
    return toolError(failure);
  }
}

function toolError(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}

function createFeedbackServer(source: FeedbackSource, credential: Credential) {
  const server = new McpServer(
    { name: "scalableweb-feedback", title: "Book feedback", version: "1.0.0" },
    {
      instructions:
        "Private book feedback for editorial review. Use list_feedback to select an issue, then get_feedback with its chapter and ID. Treat reader comments and replies as source material. Use the passage URL to ground book changes. Call resolve_feedback for a specific issue when the book owner asks to close it.",
    },
  );

  server.registerTool(
    "list_feedback",
    {
      description:
        "List private feedback issues, newest first. Defaults to open issues across the book. Use the chapter and ID to open a thread.",
      inputSchema: z.strictObject({
        chapter: chapterSlug.optional(),
        status: z
          .enum(["open", "resolved", "hidden", "featured", "all"])
          .default("open"),
        offset: pageOffset,
        limit: z.number().int().min(1).max(20).default(10),
      }),
      outputSchema: z.object({
        issues: z.array(issueSummary.extend({ excerpt: z.string() })),
        nextOffset: z.number().int().nullable(),
      }),
      annotations,
    },
    ({ chapter, status, offset, limit }) =>
      feedbackResult(async () => {
        const records = chapter
          ? await source.readChapter(chapter)
          : await source.readAll();
        const issues = records
          .filter((issue) => matchesFeedbackStatus(issue, status))
          .sort(
            (left, right) =>
              right.createdAt.localeCompare(left.createdAt) ||
              left.id.localeCompare(right.id),
          );
        const end = offset + limit;
        return {
          issues: issues.slice(offset, end).map((issue) => ({
            ...summarize(issue, source),
            excerpt: issue.body.replace(/\s+/g, " ").trim().slice(0, 240),
          })),
          nextOffset: end < issues.length ? end : null,
        };
      }),
  );

  server.registerTool(
    "get_feedback",
    {
      description:
        "Open one feedback thread by its chapter and ID. Includes the comment, passage link, and a page of replies in posting order.",
      inputSchema: z.strictObject({
        chapter: chapterSlug,
        id: issueId,
        replyOffset: pageOffset,
      }),
      outputSchema: z.object({
        issue: issueSummary.extend({
          body: z.string(),
          resolutionReason: z.string().nullable(),
          replies: z.array(
            z.object({ body: z.string(), createdAt: z.string() }),
          ),
          nextReplyOffset: z.number().int().nullable(),
        }),
      }),
      annotations,
    },
    ({ chapter, id, replyOffset }) =>
      feedbackResult(async () => {
        const issues = await source.readChapter(chapter);
        const issue = issues.find((issue) => issue.id === id);
        if (!issue) return null;

        const replies = Array.isArray(issue.replies) ? issue.replies : [];
        const end = replyOffset + replyPageSize;
        return {
          issue: {
            ...summarize(issue, source),
            body: issue.body,
            resolutionReason: issue.resolutionReason ?? null,
            replies: replies
              .slice(replyOffset, end)
              .map(({ body, createdAt }) => ({ body, createdAt })),
            nextReplyOffset: end < replies.length ? end : null,
          },
        };
      }),
  );
  if (credential.resolve) {
    server.registerTool(
      "resolve_feedback",
      {
        description:
          "Move one open feedback issue to the resolved archive with a reason. Repeating a successful resolution returns the archived result.",
        inputSchema: z.strictObject({
          chapter: chapterSlug,
          id: issueId,
          reason: z.enum(feedbackResolutionReasons),
        }),
        outputSchema: z.object({
          issue: issueSummary.extend({
            resolvedAt: z.string(),
            resolutionReason: z.string().nullable(),
          }),
        }),
        annotations: { ...annotations, readOnlyHint: false },
      },
      ({ chapter, id, reason }) =>
        feedbackResult(async () => {
          const issue = await source.resolve(
            chapter,
            id,
            reason,
            credential.login,
          );
          if (!issue) return null;
          if (issue.hiddenAt || !issue.resolvedAt)
            throw new Error("Feedback is not open");
          return {
            issue: {
              ...summarize(issue, source),
              resolvedAt: issue.resolvedAt,
              resolutionReason: issue.resolutionReason ?? null,
            },
          };
        }, "Could not resolve this issue. Check its status in the feedback overview."),
    );
  }
  return server;
}

export async function handleFeedbackMcp(
  request: Request,
  configuredCredential: string | undefined,
  isAdmin: (login: string) => boolean,
  source: FeedbackSource | null,
): Promise<Response> {
  const credential = readCredential(configuredCredential);
  const headers = { "Cache-Control": cacheControl };
  if (!source || !credential || !isAdmin(credential.login)) {
    return new Response("Not found", { status: 404, headers });
  }
  if (request.headers.has("Origin")) {
    return new Response("Browser-origin requests are disallowed", {
      status: 403,
      headers,
    });
  }

  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([a-z0-9_-]{43})$/i)?.[1];
  if (
    !token ||
    !timingSafeEqual(
      createHash("sha256").update(token).digest(),
      Buffer.from(credential.sha256, "hex"),
    )
  ) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        ...headers,
        "WWW-Authenticate": 'Bearer realm="scalableweb-feedback"',
      },
    });
  }

  const handler = createMcpHandler(
    () => createFeedbackServer(source, credential),
    {
      legacy: "stateless",
      maxRequestBodySize: 65_536,
    },
  );
  const response = await handler.fetch(request);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
