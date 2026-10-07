// Opt-in, synthetic teaching scenarios. Review replies; do not auto-score learners.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCodexProvider } from "./lib/learning-codex.ts";
import { concepts } from "../shared/concepts.ts";
import { demoResources } from "../shared/learning-resources.ts";
import type { HelpMode, SupportNeed } from "../shared/learning-agent.ts";

if (process.env.LEARNING_CODEX_LIVE !== "1") {
  throw new Error(
    "Set LEARNING_CODEX_LIVE=1 to run synthetic scenarios with the dedicated authenticated profile. No student records are used.",
  );
}
const cases: {
  id: string;
  mode: HelpMode;
  need: SupportNeed;
  text: string;
  review: string;
}[] = [
  {
    id: "novice",
    mode: "hint",
    need: "getting-started",
    text: "I am new to queues. I do not know how to start distinguishing arrivals from completed work. Give me a small hint, at most four sentences.",
    review:
      "A manageable first step about arrivals versus completions, grounded in the authored source; no assumed prior expertise or invented browser result.",
  },
  {
    id: "misconception",
    mode: "check",
    need: "unexpected-result",
    text: "I think increasing the buffer always increases processing throughput because more requests fit in the system. Check my reasoning in at most five sentences. I have not run the demo.",
    review:
      "Distinguishes buffering from processing capacity and qualifies assumptions; proposes a check without claiming it was executed.",
  },
  {
    id: "progress",
    mode: "question",
    need: "next-step",
    text: "I can now distinguish waiting space from processing capacity: more buffering can hold a burst, but with fixed workers it does not increase their completion rate. I want to try the next step myself. Ask me one short question in a changed situation without solving it.",
    review:
      "Hands responsibility back with one meaningful changed case rather than repeating the explanation or giving its answer.",
  },
  {
    id: "unclear-task",
    mode: "question",
    need: "unspecified",
    text: "The result looks wrong and I am confused. I have not told you which inputs or result I used. Ask me one useful question to get started.",
    review:
      "Asks one focused question about missing evidence and avoids diagnosing a misconception without evidence.",
  },
  {
    id: "direct-explanation",
    mode: "explanation",
    need: "prerequisite",
    text: "I cannot start because I do not understand the common observation window in Little's Law. Explain it directly in at most five sentences, then invite a small independent check. Please do not quiz me before explaining.",
    review:
      "Explains immediately, includes compatible averages/window assumptions, then offers application; no saved-note or hint-sequence gate.",
  },
];
const provider = await createCodexProvider({
  home: path.resolve(
    process.env.LEARNING_CODEX_HOME ?? ".local/learning-companion/codex",
  ),
});
const report: { at: string; provider: string; scenarios: unknown[] } = {
  at: new Date().toISOString(),
  provider: "Codex app-server; dedicated profile; configured provider default",
  scenarios: [],
};
const directory = path.resolve(".local/learning-evaluation");
await mkdir(directory, { recursive: true });
const filename = path.join(
  directory,
  `task-support-${report.at.replaceAll(":", "-")}.json`,
);
try {
  for (const scenario of cases) {
    console.log(`Reviewing synthetic scenario: ${scenario.id}`);
    const toolRequests: string[] = [];
    const prompt = JSON.stringify({
      helpMode: scenario.mode,
      supportNeed: scenario.need,
      goal: "Understand queue behavior and become able to reason independently",
      question: scenario.text,
      selectedNotes: [],
      source: {
        url: "https://scalableweb.dev/demos/",
        anchor: "demo-queue-balance-lab",
        title: "Queue balance lab",
        kind: "demo",
        excerpt: "Authored model; no live browser observation supplied",
        revision: null,
        conceptIds: ["queue", "throughput", "latency"],
      },
      supportResources: concepts
        .filter((item) => ["queue", "throughput", "latency"].includes(item.id))
        .map((item) => ({
          ...item,
          url: `https://scalableweb.dev/concepts/#${item.id}`,
        })),
      availableDemos: demoResources.filter(
        (item) => item.id === "demo-queue-balance-lab",
      ),
      bookResources: [],
    });
    const reply = await provider.run(
      null,
      prompt,
      async (name) => {
        toolRequests.push(name);
        throw new Error(
          "This synthetic review has no live browser. Use supplied authored material and do not claim execution.",
        );
      },
      () => {},
    );
    report.scenarios.push({ ...scenario, reply, toolRequests });
    await writeFile(filename, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
    console.log(`Saved ${scenario.id} for human review.`);
  }
  console.log(`Review the actual replies and limits in ${filename}`);
} finally {
  provider.close();
}
