import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  BookLookupError,
  getBookConcept,
  getBookNeighbors,
  getBookActivity,
  getBookDemo,
  publicBookInstructions,
  readBookPassage,
  searchBook,
  type BookPassages,
  type PublicBookGraph,
} from "../shared/book-retrieval.ts";

export type PublicAssetReader = (pathname: string) => Promise<string>;
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const idInput = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Published stable ID returned by search_book or get_concept."),
});

function dataResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

async function lookup(
  work: () => Promise<Record<string, unknown>> | Record<string, unknown>,
) {
  try {
    return dataResult(await work());
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof BookLookupError
              ? error.message
              : "The public learning resource is unavailable. Retry or use the Markdown agent guide.",
        },
      ],
    };
  }
}

export function createPublicBookServer(
  origin: string,
  readAsset: PublicAssetReader,
) {
  // Request-scoped publication reads, never authentication or user-supplied URLs.
  let graphPromise: Promise<PublicBookGraph> | undefined;
  let passagesPromise: Promise<BookPassages> | undefined;
  const graph = () =>
    (graphPromise ??= readAsset("/concepts/graph.json").then(
      (text) => JSON.parse(text) as PublicBookGraph,
    ));
  const passages = () =>
    (passagesPromise ??= readAsset("/concepts/passages.json").then(
      (text) => JSON.parse(text) as BookPassages,
    ));
  const server = new McpServer(
    {
      name: "scalableweb-book",
      title: "Elements of Scalable Web Development",
      version: "1.0.0",
      websiteUrl: origin,
    },
    { instructions: publicBookInstructions, maxToolInputElements: 20 },
  );

  server.registerTool(
    "search_book",
    {
      description:
        "Search public book passages, concepts, activities and demos by words. Returns citation URLs and stable IDs. Retrieve a passage before claiming to have read it; no private records are searched.",
      inputSchema: z.object({
        query: z.string().trim().min(2).max(200),
        limit: z.number().int().min(1).max(20).default(6),
      }),
      annotations,
    },
    ({ query, limit }) =>
      lookup(async () =>
        searchBook(await graph(), await passages(), query, limit),
      ),
  );

  server.registerTool(
    "get_concept",
    {
      description:
        "Retrieve a concept's authored definition, assumptions, example, misconception, usage, teaching passages, graphics, demos and activity IDs, with suggested next tools.",
      inputSchema: idInput,
      annotations,
    },
    ({ id }) => lookup(async () => getBookConcept(await graph(), id)),
  );

  server.registerTool(
    "get_neighbors",
    {
      description:
        "Find incoming and outgoing authored concept connections, preserving source, label, target, direction and qualifications. Following an incoming edge never reverses its claim; a path is not proof.",
      inputSchema: idInput,
      annotations,
    },
    ({ id }) => lookup(async () => getBookNeighbors(await graph(), id)),
  );

  server.registerTool(
    "read_passage",
    {
      description:
        "Read rendered public prose at a book passage URL or page, with section context and citations. Use search or concept teaching-passage URLs. Returns at most 8000 characters; use nextOffset to continue. Excludes interactive UI and exercise answers.",
      inputSchema: z.object({
        url: z
          .string()
          .min(1)
          .max(1000)
          .describe(
            "Same-site public passage URL or path; no external URL, query string or private API.",
          ),
        offset: z.number().int().min(0).max(1_000_000).default(0),
      }),
      annotations,
    },
    ({ url, offset }) =>
      lookup(async () =>
        readBookPassage(
          await passages(),
          new URL((await graph()).url).origin,
          url,
          offset,
        ),
      ),
  );

  server.registerTool(
    "get_activity",
    {
      description:
        "Retrieve an optional activity scenario, source links and conversation guidance. Start with one question and wait. Worked reasoning is separate: request part=discussion only after an attempt or the student's explicit request.",
      inputSchema: z.object({
        id: idInput.shape.id,
        part: z.enum(["start", "discussion"]).default("start"),
      }),
      annotations,
    },
    ({ id, part }) =>
      lookup(async () => {
        const activity = getBookActivity(await graph(), id, part);
        return {
          ...activity,
          text: await readAsset(new URL(activity.url).pathname),
        };
      }),
  );

  server.registerTool(
    "get_demo",
    {
      description:
        "Retrieve authored demo controls, assumptions, images and predict/try/observe/reflect prompts. This is metadata, not execution or live browser state. Wait for a prediction, then use a browser or ask the student to operate the linked demo and report observations.",
      inputSchema: idInput,
      annotations,
    },
    ({ id }) => lookup(async () => getBookDemo(await graph(), id)),
  );

  for (const [name, pathname, title, mimeType] of [
    [
      "agent-guide",
      "/concepts/agent-guide.md",
      "Learning and presentation guidance",
      "text/markdown",
    ],
    [
      "concept-graph",
      "/concepts/graph.json",
      "Authored concepts, connections and learning resources",
      "application/json",
    ],
  ]) {
    const uri = new URL(pathname!, origin).href;
    server.registerResource(
      name!,
      uri,
      { title: title!, mimeType: mimeType! },
      async () => ({
        contents: [
          { uri, mimeType: mimeType!, text: await readAsset(pathname!) },
        ],
      }),
    );
  }
  server.registerPrompt(
    "start_investigation",
    {
      title: "Explore the book",
      description:
        "Start a prediction-led investigation from the student's question, or offer three short starting choices.",
      argsSchema: z.object({
        question: z
          .string()
          .max(1000)
          .optional()
          .describe("The student's current question, if already chosen."),
      }),
    },
    ({ question }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${publicBookInstructions}\n\n${question ? `My question: ${question}` : "Offer three brief choices: follow a reading, connect queue and latency, or try the Cache decision lab (get_demo ID `demo-cache-decision-lab`). Recommend the experiment if unsure. End with one choice question and wait."}`,
          },
        },
      ],
    }),
  );
  return server;
}

export async function handlePublicMcp(
  request: Request,
  readAsset: PublicAssetReader,
  origin: string,
): Promise<Response> {
  const suppliedOrigin = request.headers.get("origin");
  const allowedOrigins = new Set([
    new URL(origin).origin,
    "https://chatgpt.com",
    "https://claude.ai",
  ]);
  if (suppliedOrigin && !allowedOrigins.has(suppliedOrigin))
    return new Response("Origin not allowed.", { status: 403 });
  const cors = suppliedOrigin
    ? {
        "Access-Control-Allow-Origin": suppliedOrigin,
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, MCP-Method, MCP-Name, MCP-Param-Query, MCP-Param-Limit, MCP-Param-Id, MCP-Param-Url, MCP-Param-Uri, MCP-Param-Offset, MCP-Param-Part, MCP-Param-Question",
        "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Session-Id",
        Vary: "Origin",
      }
    : {};
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  const handler = createMcpHandler(
    () => createPublicBookServer(origin, readAsset),
    { legacy: "stateless", maxRequestBodySize: 65_536 },
  );
  const response = await handler.fetch(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(cors)) headers.set(name, value);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
