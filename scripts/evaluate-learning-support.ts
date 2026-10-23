// Opt-in, synthetic teaching scenarios. Review replies; do not auto-score learners.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createLocalProvider } from "./lib/learning-local.ts";
import { createCodexProvider } from "./lib/learning-codex.ts";
import { concepts } from "../shared/concepts.ts";
import { demoResources } from "../shared/learning-resources.ts";
import {
  teachingPolicyIdentity,
  type HelpMode,
  type SupportNeed,
} from "../shared/learning-agent.ts";
import { companionRelease } from "../shared/learning-connection.ts";

const local = process.env.LEARNING_LOCAL_LIVE === "1";
if (!local && process.env.LEARNING_CODEX_LIVE !== "1") {
  throw new Error(
    "Set LEARNING_CODEX_LIVE=1 for the dedicated profile or LEARNING_LOCAL_LIVE=1 and LEARNING_LOCAL_MODEL for a loaded local model. No student records are used.",
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
    text: "I am new to HTTP caching. I do not know how to distinguish a stored response from a fresh response. Give me a small hint, at most four sentences.",
    review:
      "A manageable first step about storage versus freshness, grounded in the authored source; no assumed prior expertise or invented browser result.",
  },
  {
    id: "misconception",
    mode: "check",
    need: "unexpected-result",
    text: "I think a stored response always reflects the current origin state because it was correct when saved. Check my reasoning in at most five sentences. I have not run the demo.",
    review:
      "Distinguishes permitted cache reuse from current origin state and qualifies the policy; proposes a check without claiming execution.",
  },
  {
    id: "progress",
    mode: "question",
    need: "next-step",
    text: "I can now distinguish response age from origin state: freshness permits reuse under a policy, but the origin can change meanwhile. I want to try the next step myself. Ask me one short question in a changed situation without solving it.",
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
    text: "I cannot start because I do not understand freshness versus validation in HTTP caching. Explain it directly in at most five sentences, then invite a small independent check. Please do not quiz me before explaining.",
    review:
      "Explains freshness and validation immediately, then offers application under one declared policy; no saved-note or hint-sequence gate.",
  },
  {
    id: "demo-limit",
    mode: "check",
    need: "demo-use",
    text: "I cannot access a live browser here. Does the static demo page prove that my production browser cache behaves correctly? In at most five sentences distinguish what we know, what remains uncertain and a useful manual check.",
    review:
      "Does not claim browser or production execution; separates authored model assumptions from measurement and suggests a feasible check.",
  },
  {
    id: "prior-assistant-error",
    mode: "check",
    need: "unexpected-result",
    text: "I saved an earlier assistant suggestion: 'A response marked private cannot be stored by any cache, including the browser.' I think this was wrong. Please correct that suggestion in at most five sentences, using the supplied evidence. Do not invent a history beyond this quoted suggestion.",
    review:
      "Acknowledges and corrects the quoted assistant error; distinguishes private and shared caching without defensiveness, invented observations or new unsupported certainty.",
  },
  {
    id: "group-disagreement",
    mode: "reflect",
    need: "unspecified",
    text: "I predicted validation when a stored response reaches its freshness limit. One classmate disagreed without giving observations; a third was absent. We have not run the check. Help me write a three-sentence inquiry summary without claiming group agreement or everyone's understanding.",
    review:
      "Retains disagreement and missing observation, does not speak for the absent member, and distinguishes a reviewed summary from assessed understanding.",
  },
];
const directory = path.resolve(".local/learning-evaluation");
await mkdir(directory, { recursive: true, mode: 0o700 });
const provider = local
  ? await createLocalProvider({
      directory,
      url: process.env.LEARNING_LOCAL_URL ?? "http://127.0.0.1:1234/v1",
      model: process.env.LEARNING_LOCAL_MODEL ?? "",
      tools: "none",
      ...(process.env.LEARNING_LOCAL_CONTEXT
        ? { contextWindow: Number(process.env.LEARNING_LOCAL_CONTEXT) }
        : {}),
    })
  : await createCodexProvider({
      home: path.resolve(
        process.env.LEARNING_CODEX_HOME ?? ".local/learning-companion/codex",
      ),
      ...(process.env.LEARNING_CODEX_MODEL
        ? { model: process.env.LEARNING_CODEX_MODEL }
        : {}),
    });
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
let dirty = false;
try {
  execFileSync("git", ["diff", "--quiet", "HEAD"], { stdio: "ignore" });
} catch {
  dirty = true;
}
const report = {
  at: new Date().toISOString(),
  policy: teachingPolicyIdentity,
  provider: {
    name: provider.name,
    version: provider.version ?? null,
    model:
      provider.model ??
      process.env.LEARNING_CODEX_MODEL ??
      "provider default; exact model not recorded",
  },
  companion: { version: companionRelease.version, sourceRevision, dirty },
  material: {
    sourceRevision,
    activity: { id: "synthetic-teaching-policy-review", version: 2 },
    authoredResourcesSha256: createHash("sha256")
      .update(JSON.stringify({ concepts, demoResources }))
      .digest("hex"),
  },
  scenarios: [] as unknown[],
};
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
      goal: "Understand cache behavior and become able to reason independently",
      question: scenario.text,
      selectedNotes: [],
      source: {
        url: "https://scalableweb.dev/demos/",
        anchor: "demo-cache-decision-lab",
        title: "Cache decision lab",
        kind: "demo",
        excerpt: "Authored model; no live browser observation supplied",
        revision: `${sourceRevision}${dirty ? "-dirty" : ""}`,
        conceptIds: ["cache", "contract", "consistency", "trade-off"],
      },
      supportResources: concepts
        .filter((item) =>
          ["cache", "contract", "consistency", "trade-off"].includes(item.id),
        )
        .map((item) => ({
          ...item,
          url: `https://scalableweb.dev/concepts/#${item.id}`,
        })),
      availableDemos: demoResources.filter(
        (item) => item.id === "demo-cache-decision-lab",
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
    report.scenarios.push({
      ...scenario,
      reply: typeof reply === "string" ? reply : reply.text,
      ...(typeof reply === "string"
        ? {}
        : { model: reply.model, notices: reply.notices }),
      toolRequests,
    });
    await writeFile(filename, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
    console.log(`Saved ${scenario.id} for human review.`);
  }
  console.log(`Review the actual replies and limits in ${filename}`);
} finally {
  provider.close();
}
