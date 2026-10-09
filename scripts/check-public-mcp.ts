import assert from "node:assert/strict";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import type { PublicBookGraph } from "../shared/book-retrieval.ts";

// Protocol/content acceptance checks. No model call, credentials or learner data.
const endpoint = new URL(process.argv[2] ?? "http://127.0.0.1:8790/mcp");
for (const era of ["modern", "legacy"] as const) {
  const client = new Client(
    { name: "scalableweb-check", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(
    new StreamableHTTPClientTransport(endpoint),
    era === "legacy" ? { prior: { kind: "legacy" } } : undefined,
  );
  try {
    assert.equal(client.getProtocolEra(), era);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 6);
    const { resources } = await client.listResources();
    const graphUri = resources.find(
      (resource) => resource.name === "concept-graph",
    )!.uri;
    const graphResource = await client.readResource({ uri: graphUri });
    const graphContent = graphResource.contents[0]!;
    assert.ok("text" in graphContent);
    const graph = JSON.parse(graphContent.text) as PublicBookGraph;
    const guide = await client.readResource({
      uri: resources.find((resource) => resource.name === "agent-guide")!.uri,
    });
    const guideContent = guide.contents[0]!;
    assert.ok("text" in guideContent);
    assert.match(guideContent.text, /predict.*interact.*explain/);
    const call = async (name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, JSON.stringify(result));
      const content = result.content[0]!;
      assert.ok(content.type === "text");
      assert.deepEqual(JSON.parse(content.text), result.structuredContent);
      return result.structuredContent as Record<string, any>;
    };

    const search = await call("search_book", { query: "Little law", limit: 6 });
    const hit = search.results.find((item: any) => item.kind === "passage");
    assert.ok(hit, "Search must offer an actual teaching passage.");
    const passage = await call(hit.retrieve.tool, hit.retrieve.arguments);
    assert.match(passage.text, /Little.?s Law/);
    assert.ok(passage.url.startsWith(new URL(graph.url).origin));
    const concept = await call("get_concept", { id: "little-law" });
    assert.deepEqual(
      concept.concept,
      graph.concepts.find(({ id }) => id === "little-law"),
    );

    const neighbors = await call("get_neighbors", { id: "latency" });
    const connection = neighbors.relationships.find(
      (edge: any) => edge.source === "queue" && edge.target === "latency",
    );
    assert.equal(connection.direction, "directed");
    assert.equal(connection.label, "can add waiting time to");
    const authored = graph.relationships.find(
      (edge) => edge.source === "queue" && edge.target === "latency",
    )!;
    assert.equal(connection.explanation, authored.explanation);

    const demo = await call("get_demo", { id: "demo-queue-balance-lab" });
    assert.deepEqual(
      demo.demo,
      graph.learningResources.find(({ id }) => id === "demo-queue-balance-lab"),
    );
    assert.equal(demo.nextActions[0].action, "ask_prediction");
    assert.equal(demo.capabilities.liveState, false);
    assert.equal(demo.capabilities.execute, false);
    const activity = await call("get_activity", {
      id: "challenge-an-explanation",
    });
    const discussion = await call("get_activity", {
      id: "challenge-an-explanation",
      part: "discussion",
    });
    assert.match(activity.text, /## Scenario/);
    assert.match(discussion.text, /^# Worked reasoning/);
    assert.ok(!activity.text.includes(discussion.text.trim()));
    await client.getPrompt({
      name: "start_investigation",
      arguments: { question: "How does review affect useful throughput?" },
    });
    for (const url of ["/api/learning/answers", "https://example.com/"]) {
      const result = await client.callTool({
        name: "read_passage",
        arguments: { url },
      });
      assert.equal(result.isError, true);
    }
    console.log(
      JSON.stringify({
        endpoint: endpoint.href,
        era,
        protocol: client.getNegotiatedProtocolVersion(),
        tools: tools.length,
        graphRevision: graph.revision,
        passage: passage.url,
        checks: [
          "find and read passage",
          "preserve qualified connection",
          "prediction-led experiment metadata",
          "separate discussion",
          "resources and prompt",
          "reject private and external URLs",
        ],
      }),
    );
  } finally {
    await client.close();
  }
}
