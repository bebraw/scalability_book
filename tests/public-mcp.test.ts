import test from "node:test";
import assert from "node:assert/strict";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  exportConceptGraph,
  renderConceptAgentGuide,
} from "../scripts/lib/concept-export.ts";
import {
  extractBookPassages,
  exportBookPassages,
} from "../scripts/lib/book-passages.ts";
import { renderMarkdown } from "../scripts/lib/markdown.ts";
import { readBookPassage, searchBook } from "../shared/book-retrieval.ts";
import { handlePublicMcp } from "../worker/public-mcp.ts";
import worker from "../worker/index.ts";

const origin = "https://scalableweb.dev";
const graph = exportConceptGraph(
  origin,
  "Elements of Scalable Web Development",
);
const html = renderMarkdown(
  `# Measurement

## Stable averages

Little's Law relates work in progress, throughput and average time at the same boundary.

### Conditions

Check stable long-run averages; an unbalanced backlog does not satisfy the stable model.

## A different section

Independent section.

::: comment
UNPUBLISHED-COMMENT
:::

---

AUTHOR-ONLY-NOTE`,
  { number: "" },
).content;
const book = exportBookPassages(
  extractBookPassages(
    html,
    { url: "/chapters/benchmarking/", title: "Measurement" },
    origin,
  ),
);
const reads: string[] = [];
const assets = new Map([
  ["/concepts/graph.json", JSON.stringify(graph)],
  ["/concepts/passages.json", JSON.stringify(book)],
  ["/concepts/agent-guide.md", renderConceptAgentGuide(graph)],
  ...graph.explorations.flatMap((activity) => [
    [new URL(activity.agentUrl).pathname, `SCENARIO: ${activity.summary}`],
    [new URL(activity.discussionUrl).pathname, "WORKED-REASONING"],
  ]),
]);
const readAsset = async (pathname: string) => {
  reads.push(pathname);
  const text = assets.get(pathname);
  if (!text) throw new Error("Missing fixture");
  return text;
};

test("passage publication uses rendered prose, nested heading context and public anchors", () => {
  const all = JSON.stringify(book);
  assert.doesNotMatch(
    all,
    /UNPUBLISHED-COMMENT|AUTHOR-ONLY-NOTE|Give feedback|paragraph-feedback/,
  );
  const section = readBookPassage(
    book,
    origin,
    "/chapters/benchmarking/#stable-averages",
  );
  assert.match(section.text, /Little's Law/);
  assert.match(section.text, /unbalanced backlog/);
  assert.doesNotMatch(section.text, /Independent section/);
  const paragraphAnchor = book.passages[0]!.anchors.find((id) =>
    id.startsWith("p-"),
  )!;
  assert.ok(paragraphAnchor);
  assert.match(
    readBookPassage(book, origin, `/chapters/benchmarking/#${paragraphAnchor}`)
      .text,
    /same boundary/,
  );
  const excluded = extractBookPassages(
    '<h2 id="public">Public</h2><p>Visible</p><div data-exercise><p>ANSWER-IN-IMPORT</p></div><details><p>WORKED-ANSWER</p></details><nav><p>NAVIGATION</p></nav>',
    { url: "/chapters/test/", title: "Test" },
    origin,
  );
  assert.equal(excluded[0]!.text, "Visible");
  const equation = extractBookPassages(
    renderMarkdown("## Model\n\n$L = \\lambda W$", { number: "" }).content,
    { url: "/chapters/test/", title: "Test" },
    origin,
  );
  assert.equal(equation[0]!.heading, "Model");
  assert.equal(equation[0]!.text, "$L = \\lambda W$");
});

test("Worker public MCP ignores credentials and never accesses private bindings", async () => {
  const assetRequests: Request[] = [];
  const env = new Proxy(
    {
      ASSETS: {
        fetch: async (request: Request) => {
          assetRequests.push(request);
          return new Response(await readAsset(new URL(request.url).pathname));
        },
      },
    },
    {
      get: (target, property) => {
        assert.equal(
          property,
          "ASSETS",
          "Public retrieval must not consult account or private storage bindings.",
        );
        return target.ASSETS;
      },
    },
  );
  const client = new Client({ name: "public-boundary", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("https://preview.example/mcp"), {
      requestInit: {
        headers: {
          cookie: "session=synthetic",
          authorization: "Bearer synthetic",
        },
      },
      fetch: (input, init) =>
        worker.fetch(new Request(input, init), env as any),
    }),
  );
  try {
    assert.ok(
      !(
        await client.callTool({
          name: "get_concept",
          arguments: { id: "queue" },
        })
      ).isError,
    );
    assert.ok(
      !(
        await client.callTool({
          name: "read_passage",
          arguments: {
            url: `${origin}/chapters/benchmarking/#stable-averages`,
          },
        })
      ).isError,
      "A preview runtime can retrieve the publication's canonical citation URL.",
    );
    assert.ok(assetRequests.length);
    assert.ok(
      assetRequests.every(
        (request) =>
          !request.headers.has("cookie") &&
          !request.headers.has("authorization"),
      ),
    );
  } finally {
    await client.close();
  }
});

test("search finds a qualified source and passage reads are bounded and allowlisted", () => {
  const result = searchBook(graph, book, "stable long-run averages", 20);
  const passage = result.results.find((item) => item.kind === "passage")!;
  assert.ok(passage);
  assert.match(
    readBookPassage(book, origin, passage.url).text,
    /unbalanced backlog/,
  );
  for (const url of [
    "https://example.com/",
    "/api/learning/answers",
    "/chapters/benchmarking/?secret=1",
    "https://scalableweb.dev@evil.example/",
  ]) {
    assert.throws(() => readBookPassage(book, origin, url));
  }
  const long = exportBookPassages([
    {
      url: `${origin}/chapters/long/#section`,
      title: "Long",
      heading: "Section",
      anchors: ["section"],
      text: "a".repeat(9000),
    },
  ]);
  const first = readBookPassage(long, origin, "/chapters/long/#section");
  assert.equal(first.text.length, 8000);
  const rest = readBookPassage(long, origin, first.url, first.nextOffset!);
  assert.equal(rest.nextOffset, null);
  assert.equal(first.text.length + rest.text.length, first.totalCharacters);
});

for (const era of ["modern", "legacy"] as const)
  test(`official MCP client completes learning tasks over ${era} HTTP`, async () => {
    const client = new Client(
      { name: "book-test", version: "1" },
      { versionNegotiation: { mode: "auto" } },
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`${origin}/mcp`),
      {
        fetch: async (input, init) =>
          handlePublicMcp(new Request(input, init), readAsset, origin),
      },
    );
    await client.connect(
      transport,
      era === "legacy" ? { prior: { kind: "legacy" } } : undefined,
    );
    try {
      assert.equal(client.getProtocolEra(), era);
      assert.match(client.getInstructions()!, /prediction/);
      const tools = await client.listTools();
      assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
        "get_activity",
        "get_concept",
        "get_demo",
        "get_neighbors",
        "read_passage",
        "search_book",
      ]);
      assert.ok(
        tools.tools.every((tool) => tool.annotations?.readOnlyHint === true),
      );
      const call = async (name: string, args: Record<string, unknown>) => {
        const result = await client.callTool({ name, arguments: args });
        assert.ok(!result.isError, JSON.stringify(result));
        assert.deepEqual(
          JSON.parse(result.content[0]!.text as string),
          result.structuredContent,
        );
        return result.structuredContent as Record<string, any>;
      };
      const search = await call("search_book", {
        query: "stable averages",
        limit: 20,
      });
      const hit = search.results.find((item: any) => item.kind === "passage");
      const passage = await call("read_passage", { url: hit.url });
      assert.match(passage.text, /stable long-run averages|Little's Law/);
      const concept = await call("get_concept", { id: "little-law" });
      assert.match(concept.concept.assumptions, /approximately balance/);
      const neighbors = await call("get_neighbors", { id: "latency" });
      const edge = neighbors.relationships.find(
        (item: any) => item.source === "queue" && item.target === "latency",
      );
      assert.equal(edge.direction, "directed");
      assert.equal(edge.label, "can add waiting time to");
      const demo = await call("get_demo", { id: "demo-cache-decision-lab" });
      assert.equal(demo.capabilities.execute, false);
      assert.equal(demo.capabilities.liveState, false);
      assert.match(
        demo.demo.experiment.predict,
        /reuse a response without contacting the origin/,
      );
      assert.equal(demo.nextActions[0].action, "ask_prediction");
      const activity = await call("get_activity", {
        id: "challenge-an-explanation",
      });
      assert.match(activity.text, /SCENARIO:/);
      assert.doesNotMatch(activity.text, /WORKED-REASONING/);
      assert.equal(
        (
          await call("get_activity", {
            id: "challenge-an-explanation",
            part: "discussion",
          })
        ).text,
        "WORKED-REASONING",
      );
      const unavailable = await client.callTool({
        name: "read_passage",
        arguments: { url: "/api/learning/answers" },
      });
      assert.equal(unavailable.isError, true);
      const unknown = await client.callTool({
        name: "get_concept",
        arguments: { id: "not-published" },
      });
      assert.equal(unknown.isError, true);
      const badArgs = await client.callTool({
        name: "search_book",
        arguments: { query: "queue", limit: 999 },
      });
      assert.equal(badArgs.isError, true);
      const resources = await client.listResources();
      assert.equal(resources.resources.length, 2);
      const guide = await client.readResource({
        uri: `${origin}/concepts/agent-guide.md`,
      });
      assert.match(guide.contents[0]!.text as string, /Your first reply/);
      const prompt = await client.getPrompt({
        name: "start_investigation",
        arguments: { question: "Why does a queue add latency?" },
      });
      assert.match(
        prompt.messages[0]!.content.text as string,
        /Why does a queue add latency/,
      );
    } finally {
      await client.close();
    }
  });

test("public endpoint rejects unexpected origins and oversized requests without reading accounts", async () => {
  const before = reads.length;
  assert.equal(
    (
      await handlePublicMcp(
        new Request(`${origin}/mcp`, {
          method: "POST",
          headers: { origin: "https://untrusted.example" },
        }),
        readAsset,
        origin,
      )
    ).status,
    403,
  );
  const preflight = await handlePublicMcp(
    new Request(`${origin}/mcp`, {
      method: "OPTIONS",
      headers: { origin: "https://chatgpt.com" },
    }),
    readAsset,
    origin,
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://chatgpt.com",
  );
  const large = await handlePublicMcp(
    new Request(`${origin}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        padding: "a".repeat(70_000),
      }),
    }),
    readAsset,
    origin,
  );
  assert.equal(large.status, 413);
  assert.equal(reads.length, before);
  assert.ok(
    reads.every(
      (pathname) =>
        pathname.startsWith("/concepts/") || pathname.startsWith("/explore/"),
    ),
  );
});
