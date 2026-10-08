export type Exploration = {
  id: string;
  title: string;
  phase: "Establish" | "Challenge" | "Compare";
  summary: string;
  conceptIds: string[];
  task: { title: string; href: string };
  reading: { title: string; href: string };
};

export const explorations: Exploration[] = [
  {
    id: "prototype-to-shared-use",
    title: "Move a prototype into shared use",
    phase: "Establish",
    summary:
      "A working CSV exporter is ready for a demo. What would make it ready for a team's weekly report?",
    conceptIds: ["authority", "acceptance-criteria", "decision-reversibility"],
    task: {
      title: "Establish the evidence baseline",
      href: "/project/establish/#3-2-establish-the-evidence-baseline",
    },
    reading: {
      title: "Assign authority and ownership",
      href: "/chapters/scalable-development/#assign-authority-and-ownership",
    },
  },
  {
    id: "challenge-an-explanation",
    title: "Challenge an explanation",
    phase: "Establish",
    summary:
      "An agent says a recorder prevents duplicate events after restart. Predict the behavior and test its claim.",
    conceptIds: ["idempotency", "state-authority", "acceptance-criteria"],
    task: {
      title: "Establish the evidence baseline",
      href: "/project/establish/#3-2-establish-the-evidence-baseline",
    },
    reading: {
      title: "Test an explanation against behavior",
      href: "/chapters/scalable-development/#test-an-explanation-against-behavior",
    },
  },
  {
    id: "verify-remediation",
    title: "Follow a fix into running systems",
    phase: "Challenge",
    summary:
      "A release succeeds and every health check passes. Decide what the runtime inventory still requires you to investigate.",
    conceptIds: ["recovery", "observability", "acceptance-criteria"],
    task: {
      title: "Apply runtime pressure and examine recovery",
      href: "/project/challenge/#4-4-apply-runtime-pressure",
    },
    reading: {
      title: "Follow a fix through affected deployments",
      href: "/chapters/reality/#follow-a-fix-through-affected-deployments",
    },
  },
  {
    id: "temporary-api-consumers",
    title: "Probe an API with temporary clients",
    phase: "Challenge",
    summary:
      "A generated CSV client reports success but exports two rows. Design independent checks for a fixed paginated event feed.",
    conceptIds: ["contract", "acceptance-criteria", "eval", "authority"],
    task: {
      title: "Repeat the evidence collection",
      href: "/project/challenge/#4-2-repeat-the-evidence-collection",
    },
    reading: {
      title: "Probe an API with temporary clients",
      href: "/appendices/evaluating-agentic-workflows/#probe-an-api-with-temporary-clients",
    },
  },
  {
    id: "human-work-in-progress",
    title: "Vary human work in progress",
    phase: "Compare",
    summary:
      "Keep the same worker limit while changing how many unfinished changes enter the workflow. Plan a bounded comparison.",
    conceptIds: ["review-budget", "agent-fleet", "throughput", "queue"],
    task: {
      title: "Compare one agent with the fleet",
      href: "/project/compare/#5-4-compare-one-agent-with-the-fleet",
    },
    reading: {
      title: "Agent concurrency and human work in progress",
      href: "/chapters/agent-fleets/#separate-agent-concurrency-from-human-work-in-progress",
    },
  },
  {
    id: "confidence-before-routing",
    title: "Examine a confident classification",
    phase: "Compare",
    summary:
      "Twenty valid classifications report 90% confidence. Examine the evidence before using that score to route work.",
    conceptIds: ["eval", "authority", "acceptance-criteria"],
    task: {
      title: "Compare one agent with the fleet",
      href: "/project/compare/#5-4-compare-one-agent-with-the-fleet",
    },
    reading: {
      title: "Check confidence before routing",
      href: "/appendices/evaluating-agentic-workflows/#check-confidence-before-routing",
    },
  },
];

export function explorationUrl(id: string): string {
  return `/explore/${id}/`;
}

export function exportExplorations(siteUrl: string) {
  const absolute = (href: string) => new URL(href, siteUrl).href;
  return explorations.map((activity) => ({
    ...activity,
    task: { ...activity.task, href: absolute(activity.task.href) },
    reading: { ...activity.reading, href: absolute(activity.reading.href) },
    url: absolute(explorationUrl(activity.id)),
    agentUrl: absolute(`${explorationUrl(activity.id)}agent.md`),
    discussionUrl: absolute(`${explorationUrl(activity.id)}discussion.md`),
    graphUrl: absolute(`/concepts/?topic=${activity.conceptIds[0]}`),
  }));
}
