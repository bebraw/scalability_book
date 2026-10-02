import { createHash } from "node:crypto";
import { concepts } from "../../shared/concepts.ts";
import { conceptPages } from "../../shared/concept-pages.ts";
import { conceptRelationships } from "../../shared/concept-relationships.ts";

export function exportConceptGraph(siteUrl: string, title: string) {
  const absolute = (href: string) => new URL(href, siteUrl).href;
  const readings = conceptPages.map(({ url, title, concepts }) => ({
    url: absolute(url),
    title,
    concepts,
  }));
  return {
    schemaVersion: 1,
    // Identify the authored content independently of the preview's origin.
    revision: createHash("sha256")
      .update(JSON.stringify({ concepts, conceptRelationships, conceptPages }))
      .digest("hex"),
    title,
    url: absolute("/concepts/"),
    resources: {
      guide: absolute("/concepts/agent-guide.md"),
      json: absolute("/concepts/graph.json"),
      markdown: absolute("/concepts/graph.md"),
    },
    semantics: {
      relationships: "Authored, undirected teaching connections.",
      sourceAndTarget:
        "Endpoint identifiers, not a direction, prerequisite, or proof of causation.",
      readingMembership:
        "A concept is discussed in a reading. Co-occurrence does not create a graph edge.",
      coverage:
        "A curated guide to the book, not an exhaustive account of possible connections.",
    },
    concepts: concepts.map((concept) => ({
      ...concept,
      url: absolute(`/concepts/#${concept.id}`),
      contexts: concept.contexts.map((context) => ({
        ...context,
        href: absolute(context.href),
      })),
      ...(concept.usage
        ? {
            usage: {
              ...concept.usage,
              ...(concept.usage.sources
                ? {
                    sources: concept.usage.sources.map((source) => ({
                      ...source,
                      href: absolute(source.href),
                    })),
                  }
                : {}),
            },
          }
        : {}),
      readings: readings
        .filter((reading) => reading.concepts.includes(concept.id))
        .map((reading) => reading.url),
    })),
    relationships: conceptRelationships,
    readings,
  };
}

type ExportedGraph = ReturnType<typeof exportConceptGraph>;

export function renderConceptAgentGuide(graph: ExportedGraph): string {
  return `# Exploring ${graph.title} with your own agent

Choose your own question and use your agent to investigate it through the book's knowledge graph. Connecting the data, inspecting retrieval, and evaluating the explanation are part of the learning.

## Connect

- [Structured graph (JSON)](${graph.resources.json}): definitions, assumptions, examples, usage notes, explained connections, and reading locations.
- [Text graph (Markdown)](${graph.resources.markdown}): the same authored content for agents that read text more readily than JSON.
- [Visual explorer](${graph.url}): follow concepts and connections yourself.

Use an agent with an HTTP retrieval tool, or download this guide and either graph file and give them to an agent that reads local files. File-only agents can inspect the graph but need the linked reading pages supplied separately to verify the full argument. A chat assistant with no retrieval or file access cannot query these resources simply by being given a URL.

These are public, read-only files. Fetch them directly with an HTTP GET or a file reader. The URLs are data resources; they are not an MCP server endpoint. You can build a retrieval tool around the JSON using the operations below.

## Data contract

The JSON has \`schemaVersion: 1\`. Its \`revision\` is a SHA-256 hash of the authored graph content. Record it when keeping a retrieval trace; URLs identify the current publication, not an archived copy of that revision.

- \`concepts\`: stable \`id\`, \`title\`, \`group\`, \`definition\`, \`assumptions\`, \`example\`, \`misconception\`, and a \`url\` for citation. Optional \`usage\` notes explain vocabulary choices, with sources where available. \`contexts\` link to specific teaching passages. \`readings\` lists the broader reading locations.
- \`relationships\`: \`source\` and \`target\` concept IDs, a short \`label\`, and an authored \`explanation\`. Connections are undirected. The endpoint names do not establish causation or prerequisite order.
- \`readings\`: \`url\`, \`title\`, and \`concepts\` discussed there. Two concepts appearing in the same reading are not necessarily connected by an authored edge.
- \`resources\`: the guide and both graph formats. All resource and citation URLs are absolute, including on a local preview.

Definitions and examples use the book's declared assumptions. Some vocabulary is still developing; preserve the usage notes when interpreting it. Example rates are illustrative unless the reading identifies them as measurements.

## Retrieve from the graph

1. Search concept titles, definitions, and usage notes for the student's terms. Report the matching IDs and why they seem relevant. If the question is ambiguous, clarify it with the student.
2. Inspect a concept's assumptions, common mistake, and teaching passages, rather than relying on its title alone.
3. Find incident relationships by checking both \`source\` and \`target\`. Follow the other endpoint to expand the neighborhood. Keep the authored edge explanation with each step.
4. Find relevant readings through \`contexts\`, \`concept.readings\`, or membership in \`readings[].concepts\`. Retrieve those pages to check the fuller argument and surrounding qualifications.
5. Return the concepts and connection path used, citations to the concept or exact teaching passage, and any uncertainties. Describe what was actually retrieved.

For a tool that exposes neighbors, the lookup is small:

\`\`\`js
function neighbors(graph, id) {
  return graph.relationships
    .filter((edge) => edge.source === id || edge.target === id)
    .map((edge) => ({
      id: edge.source === id ? edge.target : edge.source,
      label: edge.label,
      explanation: edge.explanation,
    }));
}
\`\`\`

The same operations can be implemented as local file queries, HTTP-backed tools, or tools in the student's own MCP integration. The graph supplies the evidence; the student's agent supplies the question handling and explanation.

## Keep the investigation inspectable

The student chooses the question and states an initial explanation or prediction. Help them examine it and revise it using the retrieved material. Leave room for them to explain a connection in their own words.

Distinguish the book's definitions and authored connections from your own proposed connections or deductions. A path through the graph is a navigation route, not a logical proof. A missing edge does not prove that two ideas are unrelated.

Cite retrieved material precisely. Do not claim to have checked a reading or external source you have not retrieved. If access fails, say which material was unavailable. If the graph does not directly address a question, explain that gap before making an inference or consulting other sources.

The student should inspect at least one cited passage and record what they accepted, challenged, or could not verify. A fluent answer is an explanation to evaluate, not a grade or evidence of the student's understanding.
`;
}

export function renderConceptGraphMarkdown(graph: ExportedGraph): string {
  const byId = new Map(graph.concepts.map((concept) => [concept.id, concept]));
  const link = (id: string) => {
    const concept = byId.get(id)!;
    return `[${concept.title}](${concept.url})`;
  };
  return `# ${graph.title}: knowledge graph

Schema version: ${graph.schemaVersion}. Authored content revision: \`${graph.revision}\`.

${graph.concepts.length} concepts, ${graph.relationships.length} explained connections, and ${graph.readings.length} reading locations.

[Agent guide](${graph.resources.guide}) · [JSON](${graph.resources.json}) · [Visual explorer](${graph.url})

${Object.values(graph.semantics).join(" ")}

## Concepts

${graph.concepts
  .map(
    (concept) => `### ${link(concept.id)}

ID: \`${concept.id}\`. Group: ${concept.group}.

**Definition:** ${concept.definition}

${concept.usage ? `**Usage in this book:** ${concept.usage.note}\n\n${concept.usage.sources?.map((source) => `- [${source.label}](${source.href})`).join("\n") || ""}\n\n` : ""}**Assumptions:** ${concept.assumptions}

**Worked example:** ${concept.example}

**Common mistake:** ${concept.misconception}

**Teaching passages:**

${concept.contexts.map((context) => `- [${context.label}](${context.href}): ${context.description}`).join("\n")}

**Readings:**

${graph.readings
  .filter((reading) => reading.concepts.includes(concept.id))
  .map((reading) => `- [${reading.title}](${reading.url})`)
  .join("\n")}`,
  )
  .join("\n\n")}

## Connections

${graph.relationships.map((edge) => `- ${link(edge.source)} ↔ ${link(edge.target)} — **${edge.label}:** ${edge.explanation}`).join("\n")}
`;
}

export function renderConceptAgentIndex(graph: ExportedGraph): string {
  return `# ${graph.title}

> A book and course on architecture, measurement, scaling pressure, and agentic workflows.

The knowledge graph provides curated definitions, assumptions, examples, and explained teaching connections. Students choose their own questions and can retrieve the graph using their own agents. Connections are undirected teaching relationships, not prerequisites or proof of causation. Reading membership is recorded separately.

## Knowledge graph

- [Agent guide](${graph.resources.guide}): access, data contract, retrieval operations, citations, and checking an explanation against the book.
- [Graph as Markdown](${graph.resources.markdown}): the complete authored concept reference and connection explanations.
- [Graph as JSON](${graph.resources.json}): structured data for searching concepts, following edges, and locating readings.
`;
}
