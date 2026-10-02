import { createHash } from "node:crypto";
import { concepts } from "../../shared/concepts.ts";
import { conceptPages } from "../../shared/concept-pages.ts";
import { conceptRelationships } from "../../shared/concept-relationships.ts";
import { learningResources } from "../../shared/learning-resources.ts";

export function exportConceptGraph(siteUrl: string, title: string) {
  const absolute = (href: string) => new URL(href, siteUrl).href;
  const readings = conceptPages.map(({ url, title, concepts }) => ({
    url: absolute(url),
    title,
    concepts,
  }));
  return {
    schemaVersion: 2,
    // Identify the authored content independently of the preview's origin.
    revision: createHash("sha256")
      .update(
        JSON.stringify({
          concepts,
          conceptRelationships,
          conceptPages,
          learningResources,
        }),
      )
      .digest("hex"),
    title,
    url: absolute("/concepts/"),
    resources: {
      guide: absolute("/concepts/agent-guide.md"),
      json: absolute("/concepts/graph.json"),
      markdown: absolute("/concepts/graph.md"),
    },
    semantics: {
      relationships:
        "Authored teaching connections with explicit directed or undirected semantics.",
      sourceAndTarget:
        "For direction=directed, read source → label → target. For direction=undirected, endpoint order has no meaning. The label and explanation establish the claim, not the arrow alone; direction does not imply a prerequisite.",
      readingMembership:
        "A concept is discussed in a reading. Co-occurrence does not create a graph edge.",
      coverage:
        "A curated guide to the book, not an exhaustive account of possible connections.",
      learningResources:
        "Curated concept-to-resource mappings, not new graph edges. Graphics are authored illustrations. Demo PNGs are static previews of default views, not live execution or measured evidence; current behavior and saved input state can differ. Prediction prompts deliberately omit a model answer.",
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
      resourceIds: learningResources
        .filter(
          (resource) =>
            resource.id !== "graph-complete" &&
            resource.conceptIds.includes(concept.id),
        )
        .map(({ id }) => id),
    })),
    relationships: conceptRelationships,
    readings,
    learningResources: learningResources.map((resource) => ({
      ...resource,
      url: absolute(resource.url),
      images: {
        ...resource.images,
        png: absolute(resource.images.png),
        ...(resource.images.svg ? { svg: absolute(resource.images.svg) } : {}),
      },
    })),
  };
}

type ExportedGraph = ReturnType<typeof exportConceptGraph>;

export function renderConceptAgentGuide(graph: ExportedGraph): string {
  const queue = graph.concepts.find(({ id }) => id === "queue")!;
  const latency = graph.concepts.find(({ id }) => id === "latency")!;
  const queueLab = graph.learningResources.find(
    ({ id }) => id === "demo-queue-balance-lab",
  )!;
  return `# Exploring ${graph.title} with your own agent

Choose your own question or start with one of the activities below. Use your agent to investigate through the book's knowledge graph. Connecting the data, inspecting retrieval, and evaluating the explanation are part of the learning.

## Connect

- [Structured graph (JSON)](${graph.resources.json}): definitions, assumptions, examples, usage notes, explained connections, reading locations, graphics, and demo experiments.
- [Text graph (Markdown)](${graph.resources.markdown}): the same authored content for agents that read text more readily than JSON.
- [Visual explorer](${graph.url}): follow concepts and connections yourself.

Use an agent with an HTTP retrieval tool, or download this guide and either graph file and give them to an agent that reads local files. File-only agents can inspect the graph but need the linked reading pages supplied separately to verify the full argument. A chat assistant with no retrieval or file access cannot query these resources simply by being given a URL.

These are public, read-only files. Fetch them directly with an HTTP GET or a file reader. The URLs are data resources; they are not an MCP server endpoint. You can build a retrieval tool around the JSON using the operations below.

## Your first reply to the student

When the student supplies this guide without a question, retrieve one graph format and help them choose a starting activity. Briefly acknowledge what you successfully accessed, then offer three concrete choices in plain language. Recommend the short experiment if they are unsure and end with one choice question. Keep this reply brief; leave the data contract, full graph, and resource catalog for when they are useful. Do not require the student to formulate a research question or answer a background survey before starting.

After successfully reading the graph, a first reply could be:

> I've read the book's concept graph. Here are three ways we can start:
>
> 1. **Follow your reading.** Tell me your chapter or paste a passage. We'll explore one idea and follow a connection into the book.
> 2. **Connect two ideas.** Try [${queue.title}](${queue.url}) and [${latency.title}](${latency.url}): make a guess about how they relate, then we'll check it against a diagram and a passage.
> 3. **Try a short experiment.** With arrivals held steady, predict what doubling the average time means for unfinished work, then check it in the [${queueLab.title}](${queueLab.url}).
>
> If you're unsure, I recommend the experiment. Which would you like to try, or do you have a question of your own?

Adapt the acknowledgement to the material you actually read. If retrieval fails, name the unavailable resource and explain the file-based alternative; do not claim a connection merely because you received a URL. If the student already supplied a question, chapter, or passage, start there and suggest one relevant next action instead of repeating the menu.

Once they choose, retrieve the relevant concept, teaching passage, and resource. Take one step at a time. Ask for their own explanation or prediction before revealing a connection label, model answer, or demo result. For the experiment, use the resource's exact \`experiment.predict\` prompt and assumptions, wait for their prediction, then guide the \`try\`, \`observe\`, and \`reflect\` steps. Finish by checking a cited passage and inviting them to revise their explanation.

## Data contract

The JSON has \`schemaVersion: ${graph.schemaVersion}\`. Its \`revision\` is a SHA-256 hash of the authored graph content. Record it when keeping a retrieval trace; URLs identify the current publication, not an archived copy of that revision. Version 2 adds an explicit relationship direction and reviews the endpoint order and linking phrases; version 1 treated every connection as undirected.

- \`concepts\`: stable \`id\`, \`title\`, \`group\`, \`definition\`, \`assumptions\`, \`example\`, \`misconception\`, and a \`url\` for citation. Optional \`usage\` notes explain vocabulary choices, with sources where available. \`contexts\` link to specific teaching passages. \`readings\` lists the broader reading locations.
- \`relationships\`: \`source\` and \`target\` concept IDs, \`direction\` (\`directed\` or \`undirected\`), a short \`label\`, and an authored \`explanation\`. Read a directed connection as source → label → target. Comparisons and associations remain undirected. Preserve qualifications such as “can” and the conditions in the explanation; an arrow alone does not establish causation or a prerequisite.
- \`readings\`: \`url\`, \`title\`, and \`concepts\` discussed there. Two concepts appearing in the same reading are not necessarily connected by an authored edge.
- \`resources\`: the guide and both graph formats. All resource and citation URLs are absolute, including on a local preview.
- \`concepts[].resourceIds\`: IDs to look up in \`learningResources\`. These are curated teaching aids, not additional concept relationships.
- \`learningResources\`: stable \`id\`, \`kind\` (\`graphic\` or \`demo\`), \`title\`, \`conceptIds\`, \`url\`, \`caption\`, \`assumptions\`, and \`images\`. Every image has a PNG URL and alt text; graphics also have a standalone SVG. Demos include \`controls\` and an \`experiment\` with \`predict\`, \`try\`, \`observe\`, and \`reflect\` prompts. These fields are additive to version 2.

Definitions and examples use the book's declared assumptions. Some vocabulary is still developing; preserve the usage notes when interpreting it. Example rates are illustrative unless the reading identifies them as measurements.

## Retrieve from the graph

1. Search concept titles, definitions, and usage notes for the student's terms. Report the matching IDs and why they seem relevant. If the question is ambiguous, clarify it with the student.
2. Inspect a concept's assumptions, common mistake, and teaching passages, rather than relying on its title alone.
3. Find incident relationships by checking both \`source\` and \`target\`. Follow the other endpoint to expand the neighborhood. Discovery works in either direction, but preserve the original source, linking phrase, target, and explanation when stating a directed relationship. Following an incoming edge does not reverse its claim.
4. Find relevant readings through \`contexts\`, \`concept.readings\`, or membership in \`readings[].concepts\`. Retrieve those pages to check the fuller argument and surrounding qualifications.
5. Return the concepts and connection path used, citations to the concept or exact teaching passage, and any uncertainties. Describe what was actually retrieved.

For a tool that exposes neighbors, the lookup is small:

\`\`\`js
function neighbors(graph, id) {
  return graph.relationships
    .filter((edge) => edge.source === id || edge.target === id)
    .map((edge) => ({
      id: edge.source === id ? edge.target : edge.source,
      source: edge.source,
      target: edge.target,
      direction: edge.direction,
      label: edge.label,
      explanation: edge.explanation,
    }));
}
\`\`\`

The same operations can be implemented as local file queries, HTTP-backed tools, or tools in the student's own MCP integration. The graph supplies the evidence; the student's agent supplies the question handling and explanation.

## Return a graphic or experiment

Look up a concept's \`resourceIds\` in \`learningResources\`. Each concept has a labelled image of its neighborhood; \`graph-complete\` provides the full map. Book diagrams and gallery demos are also mapped to the concepts they teach. Choose a relevant aid rather than returning every resource.

Return the image URL with its alt text, caption, assumptions, and source URL. For clients that support Markdown images, use \`![alt text](PNG URL)\`; otherwise return a descriptive link. SVGs are available for vector-capable clients and download. A text-only retrieval tool may fetch image bytes without being able to inspect or display them; describe your actual capabilities and do not claim to have visually checked an image you only linked.

For a demo, show the \`experiment.predict\` prompt first and let the student state a prediction. Then provide the demo URL, \`controls\`, and \`try\`, \`observe\`, and \`reflect\` prompts. The PNG is a static preview of the default view, not a recorded result of the student's experiment. Current UI and saved input state can differ. Open the actual demo to check behavior. These links are browser interfaces, not simulation API endpoints; an HTTP fetch does not run their JavaScript. With browser tools, an agent can operate the demo and report the chosen controls and observed output. Without browser tools, ask the student to operate it and bring back observations.

For example, retrieve \`little-law\` and \`demo-queue-balance-lab\`. Present its graph image and ask: “Arrival rate stays at 20 events/s. Average time doubles from 0.5 to 1 second. What average work in progress would make the measurements agree?” Let the student predict before opening the lab. Compare the result with the book's stable-average and shared-boundary assumptions. Do not treat an illustrative simulator result as a capacity measurement of a real system.

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
  const resourceLink = (id: string) => {
    const resource = graph.learningResources.find((item) => item.id === id)!;
    return `- [${resource.title}](#resource-${id})`;
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
  .join("\n")}

**Graphics and experiments:**

${concept.resourceIds.map(resourceLink).join("\n")}`,
  )
  .join("\n\n")}

## Connections

${graph.relationships.map((edge) => (edge.direction === "directed" ? `- ${link(edge.source)} **${edge.label}** → ${link(edge.target)} — ${edge.explanation}` : `- ${link(edge.source)} — ${link(edge.target)} — **${edge.label}:** ${edge.explanation}`)).join("\n")}

## Graphics and experiments

Demo images are static previews of default views, not live results. Predict before opening a demo, then compare the observations with its assumptions.

${graph.learningResources
  .map(
    (resource) => `<a id="resource-${resource.id}"></a>

### ${resource.title}

ID: \`${resource.id}\`. Kind: ${resource.kind}. Concepts: ${resource.conceptIds.map(link).join(", ")}.

[${resource.kind === "demo" ? "Open demo" : "Source and context"}](${resource.url}) · [${resource.kind === "demo" ? "Static preview (PNG)" : "Image (PNG)"}](${resource.images.png})${resource.images.svg ? ` · [Vector image (SVG)](${resource.images.svg})` : ""}

**Image description:** ${resource.images.alt}

${resource.caption}

**Assumptions:** ${resource.assumptions}
${
  resource.experiment
    ? `
**Controls:** ${resource.controls!.join("; ")}.

**Predict first:** ${resource.experiment.predict}

**Try:** ${resource.experiment.try}

**Observe:** ${resource.experiment.observe}

**Reflect:** ${resource.experiment.reflect}
`
    : ""
}`,
  )
  .join("\n")}
`;
}

export function renderConceptAgentIndex(graph: ExportedGraph): string {
  return `# ${graph.title}

> A book and course on architecture, measurement, scaling pressure, and agentic workflows.

The knowledge graph provides curated definitions, assumptions, examples, and explained teaching connections. Students choose their own questions and can retrieve the graph using their own agents. Directed connections read source → label → target; comparisons and associations are undirected. Each explanation establishes the relationship's meaning and assumptions. Arrows alone do not establish causation or a prerequisite. Reading membership is recorded separately.

## Knowledge graph

- [Agent guide](${graph.resources.guide}): first-conversation activities, access, data contract, retrieval operations, citations, and checking an explanation against the book.
- [Graph as Markdown](${graph.resources.markdown}): the complete authored reference, connections, graphics, and prediction-led demo experiments.
- [Graph as JSON](${graph.resources.json}): structured data for searching concepts, following edges, locating readings, and selecting visual resources.
- [Complete graph image](${graph.learningResources.find((resource) => resource.id === "graph-complete")!.images.png}): labelled overview; each concept also has its own neighborhood image in the graph data.
`;
}
