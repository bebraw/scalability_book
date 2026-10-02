import { concepts } from "../../shared/concepts.ts";
import { exportExplorations } from "../../shared/explorations.ts";
import { escapeAttribute, escapeHtml } from "./text.ts";

type ExportedExploration = ReturnType<typeof exportExplorations>[number];
const conceptTitles = new Map(concepts.map(({ id, title }) => [id, title]));

export function renderExplorationIndex(siteUrl: string): string {
  const activities = exportExplorations(siteUrl);
  return `<main class="exploration-page" id="content">
  <header class="exploration-header"><p class="eyebrow">Start from your course task</p><h1>Choose a question to explore</h1><p>The chapters follow an argument. These optional activities help you investigate a decision in your own work, with your agent or on your own.</p></header>
  ${["Establish", "Challenge", "Compare"]
    .map(
      (phase) =>
        `<section class="exploration-phase" aria-labelledby="phase-${phase.toLowerCase()}"><h2 id="phase-${phase.toLowerCase()}">${phase}</h2><ul>${activities
          .filter((activity) => activity.phase === phase)
          .map(
            (activity) =>
              `<li><a href="${escapeAttribute(activity.url)}">${escapeHtml(activity.title)}</a><p>${escapeHtml(activity.summary)}</p><small>Use with: <a href="${escapeAttribute(activity.task.href)}">${escapeHtml(activity.task.title)}</a></small></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("")}
  <p class="exploration-return"><a href="/concepts/">Explore the concept graph →</a></p>
</main>`;
}

export function renderExplorationPage(
  activity: ExportedExploration,
  content: string,
  discussion: string,
): string {
  return `<main class="exploration-page" id="content">
  <a class="exploration-return" href="/explore/">All starting points</a>
  <header class="exploration-header"><p class="eyebrow">${escapeHtml(activity.phase)} · Optional exploration</p><h1>${escapeHtml(activity.title)}</h1><p>${escapeHtml(activity.summary)}</p></header>
  <section class="exploration-start" aria-labelledby="exploration-start-title">
    <div><h2 id="exploration-start-title">Think it through with your agent</h2><p>Give your agent this URL. It contains the scenario and guidance to ask one question at a time. Start with your own prediction or explanation, then check it against the book.</p></div>
    <div class="concept-agent-access"><label for="exploration-agent-url">Give your agent this starting point</label><div class="concept-agent-copy"><input id="exploration-agent-url" type="text" inputmode="url" value="${escapeAttribute(activity.agentUrl)}" readonly data-concept-agent-url><button type="button" data-concept-agent-copy hidden>Copy URL</button></div><p class="concept-agent-status" data-concept-agent-status role="status"></p><p class="concept-agent-files"><a href="${escapeAttribute(activity.agentUrl)}">Read the agent starting point</a></p></div>
  </section>
  <div class="exploration-context"><p><strong>Use with your task.</strong> <a href="${escapeAttribute(activity.task.href)}">${escapeHtml(activity.task.title)}</a>. Keep discoveries in your existing evidence or learning notes.</p><p><strong>Follow the argument.</strong> <a href="${escapeAttribute(activity.reading.href)}">${escapeHtml(activity.reading.title)}</a>.</p><nav aria-label="Concepts for this exploration"><ul>${activity.conceptIds.map((id) => `<li><a href="/concepts/#${id}">${escapeHtml(conceptTitles.get(id)!)}</a></li>`).join("")}</ul><a href="${escapeAttribute(activity.graphUrl)}">Explore the connections →</a></nav></div>
  <details class="exploration-reading" id="exercise"><summary>Read the exercise</summary><div class="exploration-body">${content}</div></details>
  <details class="exercise-discussion exploration-discussion"><summary>Show worked reasoning</summary><div class="exploration-body">${discussion}</div></details>
  <p class="exploration-note">This is optional, ungraded exploration. The course brief defines the required work.</p>
</main>`;
}

function absoluteMarkdownLinks(source: string, siteUrl: string): string {
  return source.replace(
    /\]\((\/[^\s)]+)\)/g,
    (_, href: string) => `](${new URL(href, siteUrl).href})`,
  );
}

export function renderExplorationAgentStart(
  activity: ExportedExploration,
  source: string,
  siteUrl: string,
): string {
  return `# ${activity.title}

This is an optional learning activity from Elements of Scalable Web Development.
Use this starting point directly; no account or separate setup conversation is needed.

## Guide the conversation

If the student supplied only this URL, briefly introduce the scenario below and ask the first investigation question. Then wait for their answer. Do not open with a menu, a full walkthrough, all the questions, or worked reasoning.
If they already supplied a question or an attempted answer, start there.

Ask one question at a time. Let the student explain or predict before you provide feedback. Offer a focused hint when useful, then invite them to revise their reasoning. Preserve the fixture's exact assumptions and quantities. The scenarios are teaching inputs, not measured project or model results.

Use the linked concepts, graph, and reading to check a claim. Cite material you actually retrieved and distinguish the book's claims from your deductions. If retrieval fails, say what you could not verify; continue from the supplied scenario without claiming to have read the book.

Keep worked reasoning separate from the opening conversation. Retrieve the [authored discussion](${activity.discussionUrl}) after the student has attempted the relevant question, or when they explicitly ask to see it. Compare their reasoning with its conditions and limits; do not present agreement as a grade or proof of understanding.

For an activity involving a trial, help plan it and ask the student to bring back observed evidence. Do not invent execution, measurements, permissions, or completion. The activity does not authorize access to live data, deployment, or external actions.

Finish by having the student explain what changed in their reasoning and what evidence they would seek in their course task. Suggest one changed-assumption question for a later unaided attempt. Do not make another exploration a prerequisite for finishing this one.

## Connect to the course and graph

- Course task: [${activity.task.title}](${activity.task.href}). This activity adds no required deliverable.
- Reading: [${activity.reading.title}](${activity.reading.href}).
- Concepts: ${activity.conceptIds.map((id) => `[${conceptTitles.get(id)}](${new URL(`/concepts/#${id}`, siteUrl).href})`).join(", ")}.
- [Explore their connections](${activity.graphUrl}). A graph path is a discovery route, not proof of a claim.
- [Graph as Markdown](${new URL("/concepts/graph.md", siteUrl).href}) or [JSON](${new URL("/concepts/graph.json", siteUrl).href}) for concept definitions, explained connections, and relevant graphics or demos. Select one useful aid rather than returning the full catalog.
- [Read the exercise without an agent](${activity.url}).

${absoluteMarkdownLinks(source, siteUrl).trim()}
`;
}

export function renderExplorationDiscussion(
  activity: ExportedExploration,
  discussion: string,
  siteUrl: string,
): string {
  return `# Worked reasoning: ${activity.title}

Use after attempting the [activity](${activity.agentUrl}). This is authored discussion under the fixture's assumptions, not a grade or a measured result from your project.

${absoluteMarkdownLinks(discussion, siteUrl).trim()}
`;
}
