import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  queueInvestigation,
  parseInvestigationTurn,
} from "../shared/reading-investigation.ts";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import type { LearningProvider } from "../scripts/lib/learning-provider.ts";
import type { LearningSource } from "../shared/learning-workspace.ts";
import { exportConceptGraph } from "../scripts/lib/concept-export.ts";
import { getBookDemo } from "../shared/book-retrieval.ts";

const source: LearningSource = {
  kind: "demo",
  url: "https://scalableweb.dev/chapters/benchmarking/",
  anchor: queueInvestigation.demoId,
  title: "Queue investigation",
  excerpt: "L = λW",
  revision: null,
  conceptIds: [...queueInvestigation.conceptIds],
};
const observation = {
  kind: "browser-queue-snapshot",
  observedAt: "2026-10-09T10:00:00.000Z",
  arrival: 20,
  time: 1,
  observed: 10,
  expected: 20,
  gap: -10,
};
const turn = {
  activityId: queueInvestigation.id,
  version: 1,
  phase: "experiment",
  system: "Database requests",
  prediction: "Doubling time doubles unfinished work",
  observation,
};

test("inline turns reject unknown activities, unrelated sources, invalid phases and inconsistent observations", () => {
  assert.deepEqual(parseInvestigationTurn(turn, source), turn);
  for (const patch of [
    { version: 2 },
    { activityId: "arbitrary" },
    { phase: "mastered" },
    { system: "x".repeat(1001) },
    { observation: { ...observation, expected: 10 } },
    { observation: { ...observation, time: null } },
    { observation: { ...observation, observedAt: "invalid" } },
    { observation: { ...observation, arrival: 80 } },
  ])
    assert.throws(() => parseInvestigationTurn({ ...turn, ...patch }, source));
  assert.throws(() =>
    parseInvestigationTurn(turn, { ...source, anchor: "another-demo" }),
  );
  assert.equal(
    parseInvestigationTurn(
      { ...turn, prediction: "", observation: undefined },
      source,
    ).prediction,
    "",
  );
});

test("MCP publishes the same activity contract without learner state or execution", () => {
  const demo = getBookDemo(
    exportConceptGraph("https://scalableweb.dev", "Book"),
    queueInvestigation.demoId,
  );
  assert.deepEqual(demo.activity, queueInvestigation);
  assert.equal(demo.capabilities.liveState, false);
  assert.equal(demo.capabilities.execute, false);
  assert.equal("turn" in demo, false);
});

test("validated activity context reaches providers and survives restart without selecting notes or granting demo changes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-inline-contract-"));
  const notebook = openLearningNotebook(directory);
  notebook.saveEntry({
    source,
    kind: "scratch",
    title: "Unselected private note",
    body: "PRIVATE SENTINEL",
    relatedIds: [],
  });
  const contexts: any[] = [];
  const provider: LearningProvider = {
    name: "Synthetic",
    focusedContext: true,
    async run(_thread, text, tool, saveThread) {
      contexts.push(JSON.parse(text));
      saveThread("inline-thread");
      await assert.rejects(
        tool("change_demo", {
          demoId: source.anchor,
          controlId: "anything",
          value: 22,
        }),
        /Save and select/,
      );
      return "Synthetic adapted explanation";
    },
    async cancel() {},
    close() {},
  };
  let conversations = openLearningConversations(directory, notebook, provider);
  try {
    const conversation = conversations.start(
      { source },
      new URL(source.url).origin,
    );
    const input = {
      text: "Why did this change?",
      browserId: randomUUID(),
      mode: "explanation",
      noteIds: [],
      investigation: turn,
    };
    assert.throws(() =>
      conversations.send(
        conversation.id,
        { ...input, investigation: { ...turn, phase: "invalid" } },
        "session",
        new URL(source.url).origin,
      ),
    );
    assert.equal(conversations.get(conversation.id).messages.length, 0);
    conversations.send(
      conversation.id,
      input,
      "session",
      new URL(source.url).origin,
    );
    const deadline = Date.now() + 2000;
    while (conversations.get(conversation.id).state === "working") {
      assert.ok(Date.now() < deadline);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.deepEqual(contexts[0].readingActivity.turn, turn);
    assert.deepEqual(contexts[0].readingActivity.contract, queueInvestigation);
    assert.deepEqual(contexts[0].selectedNotes, []);
    assert.ok(!JSON.stringify(contexts).includes("PRIVATE SENTINEL"));
    conversations.close();
    conversations = openLearningConversations(directory, notebook, provider);
    assert.deepEqual(
      conversations.get(conversation.id).messages[0]!.investigation,
      turn,
    );
    assert.equal(notebook.entries().length, 1);
    assert.deepEqual(notebook.judgments(), []);
  } finally {
    conversations.close();
    notebook.close();
    await rm(directory, { recursive: true, force: true });
  }
});
