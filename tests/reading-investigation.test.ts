import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  queueInvestigation,
  parseInvestigationTurn,
  readingActivities,
  learningLoop,
  activityForSource,
} from "../shared/reading-investigation.ts";
import { openLearningNotebook } from "../scripts/lib/learning-notebook.ts";
import { openLearningConversations } from "../scripts/lib/learning-conversations.ts";
import type { LearningProvider } from "../scripts/lib/learning-provider.ts";
import type { LearningSource } from "../shared/learning-workspace.ts";
import { exportConceptGraph } from "../scripts/lib/concept-export.ts";
import { getBookDemo } from "../shared/book-retrieval.ts";
import { demoResources } from "../shared/learning-resources.ts";
import { buildLearningProviderContext } from "../scripts/lib/learning-provider-context.ts";
import {
  readInvestigationDraft,
  saveInvestigationDraft,
  investigationKey,
  cockpitBookmark,
} from "../site/scripts/learning-investigation-session.ts";

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
  version: queueInvestigation.version,
  phase: "experiment",
  system: "Database requests",
  prediction: "Doubling time doubles unfinished work",
  observation,
};

test("inline turns reject unknown activities, unrelated sources, invalid phases and inconsistent observations", () => {
  assert.deepEqual(parseInvestigationTurn(turn, source), turn);
  for (const patch of [
    { version: queueInvestigation.version + 1 },
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

test("every authored demo shares its prompts, assumptions and bounded snapshot with the cockpit and public retrieval", () => {
  const graph = exportConceptGraph("https://scalableweb.dev", "Book");
  assert.equal(
    new Set(readingActivities.map(({ id }) => id)).size,
    demoResources.length + 1,
  );
  for (const demo of demoResources) {
    const selected = {
      ...source,
      anchor: demo.id,
      title: demo.title,
      conceptIds: demo.conceptIds,
    };
    const activity = activityForSource(selected);
    assert.equal(activity.demoId, demo.id);
    assert.deepEqual(getBookDemo(graph, demo.id).activity, activity);
    if (demo.id === queueInvestigation.demoId) continue;
    assert.equal(activity.phases[0]!.prompt, demo.experiment!.predict);
    assert.ok(activity.guidance.includes(demo.assumptions));
    const input = {
      activityId: activity.id,
      version: activity.version,
      phase: "experiment",
      observation: {
        kind: "browser-demo-snapshot",
        demoId: demo.id,
        observedAt: observation.observedAt,
        controls: [{ label: "A visible control", type: "range", value: "10" }],
        visibleText: "Actual displayed result",
      },
    };
    const parsed = parseInvestigationTurn(input, selected);
    assert.deepEqual(parsed.observation, input.observation);
    for (const patch of [
      { demoId: "demo-other" },
      { visibleText: "x".repeat(8001) },
      {
        controls: [{ label: "Control", type: "text", value: "x".repeat(1025) }],
      },
    ])
      assert.throws(() =>
        parseInvestigationTurn(
          { ...input, observation: { ...input.observation, ...patch } },
          selected,
        ),
      );
    assert.throws(() =>
      parseInvestigationTurn(input, { ...selected, anchor: "unrelated" }),
    );
  }
});

test("non-demo loops preserve reported evidence and next checks without inventing browser execution", () => {
  const selected = {
    ...source,
    kind: "passage" as const,
    anchor: "a-public-passage",
  };
  const input = {
    activityId: learningLoop.id,
    version: 1,
    phase: "reflect",
    system: "My project",
    prediction: "I expected fewer retries",
    evidence: "I reread the invariant; I have not run a test",
    nextCheck: "Test one duplicate request",
  };
  const parsed = parseInvestigationTurn(input, selected);
  assert.deepEqual(parsed, input);
  assert.throws(() =>
    parseInvestigationTurn({ ...input, observation }, selected),
  );
  assert.throws(() =>
    parseInvestigationTurn({ ...input, evidence: "x".repeat(4001) }, selected),
  );
  const context = JSON.parse(
    buildLearningProviderContext({
      source: selected,
      selected: [],
      text: "My own takeaway",
      goal: "",
      mode: "reflect",
      need: "unspecified",
      origin: "https://scalableweb.dev",
      focused: true,
      investigation: parsed,
    }),
  );
  assert.deepEqual(context.readingActivity, {
    contract: learningLoop,
    turn: input,
  });
  assert.deepEqual(context.selectedNotes, []);
});

test("changed demo activities reject stale turns while keeping their current evidence contract", () => {
  for (const id of [
    "demo-constraint-feedback-loop",
    "demo-agent-fleet-delegation",
    "demo-scaling-pressure-planner",
    "demo-boundary-trace",
    "demo-cache-decision-lab",
    "demo-api-contract-lens",
    "demo-queue-balance-lab",
    "demo-model-evaluation-lab",
  ]) {
    const activity = readingActivities.find((item) => item.demoId === id)!;
    const selected = {
      ...source,
      anchor: id,
      conceptIds: [...activity.conceptIds],
    };
    assert.equal(activity.version, 2);
    assert.throws(() =>
      parseInvestigationTurn(
        { activityId: activity.id, version: 1, phase: "predict" },
        selected,
      ),
    );
    assert.equal(
      parseInvestigationTurn(
        { activityId: activity.id, version: 2, phase: "predict" },
        selected,
      ).version,
      2,
    );
  }
});

test("queue observations preserve fractional averages and the full entered range", () => {
  for (const snapshot of [
    { arrival: 2, time: 0.1, observed: 0.2, expected: 0.2, gap: 0 },
    { arrival: 40, time: 2, observed: 0, expected: 80, gap: -80 },
    { arrival: 2, time: 0.1, observed: 80, expected: 0.2, gap: 79.8 },
  ]) {
    const supplied = { ...observation, ...snapshot };
    assert.deepEqual(
      parseInvestigationTurn({ ...turn, observation: supplied }, source)
        .observation,
      supplied,
    );
  }
  assert.throws(() =>
    parseInvestigationTurn(
      { ...turn, observation: { ...observation, observed: 80.1 } },
      source,
    ),
  );
});

test("retired demo notes survive restart and fall back to the general learning loop", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "book-retired-demo-"));
  let notebook = openLearningNotebook(directory);
  const ids = [
    "demo-workflow-loop",
    "demo-observability-signal-picker",
    "demo-final-reflection-package",
    "demo-scalability-dimensions-lab",
  ];
  try {
    for (const id of ids)
      notebook.saveEntry({
        source: { ...source, anchor: id },
        kind: "reflection",
        title: id,
        body: "Earlier reasoning remains mine.",
        relatedIds: [],
      });
    notebook.close();
    notebook = openLearningNotebook(directory);
    assert.equal(notebook.entries().length, ids.length);
    for (const note of notebook.entries()) {
      assert.ok(ids.includes(note.source.anchor));
      assert.equal(note.body, "Earlier reasoning remains mine.");
      assert.equal(activityForSource(note.source).id, learningLoop.id);
      assert.equal(
        demoResources.some((demo) => demo.id === note.source.anchor),
        false,
      );
    }
  } finally {
    notebook.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("large valid demo snapshots never discard a learner's tab reflection", (t) => {
  const records = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  });
  const activity = readingActivities.find(
    ({ demoId }) => demoId && demoId !== queueInvestigation.demoId,
  )!;
  const selected = {
    ...source,
    anchor: activity.demoId!,
    conceptIds: [...activity.conceptIds],
  };
  for (const value of ["x", "\u0001"]) {
    const snapshot = parseInvestigationTurn(
      {
        activityId: activity.id,
        version: activity.version,
        phase: "reflect",
        observation: {
          kind: "browser-demo-snapshot",
          demoId: activity.demoId,
          observedAt: observation.observedAt,
          controls: Array.from({ length: 60 }, (_, index) => ({
            label: `Control ${index}`,
            type: "text",
            value: value.repeat(1024),
          })),
          visibleText: "Actual displayed text",
        },
      },
      selected,
    ).observation!;
    const draft = readInvestigationDraft(selected, activity);
    Object.assign(draft, {
      phase: "reflect",
      takeaway: "I need a second observation before generalizing.",
      nextCheck: "Repeat with a different input.",
      current: snapshot,
      lastSent: snapshot,
    });
    assert.ok(JSON.stringify(draft).length > 80_000);
    saveInvestigationDraft(draft, activity);
    assert.ok(
      records.get(investigationKey(selected, activity))!.length <= 256_000,
    );
    const restored = readInvestigationDraft(selected, activity);
    assert.equal(restored.phase, "reflect");
    assert.equal(restored.takeaway, draft.takeaway);
    assert.equal(restored.nextCheck, draft.nextCheck);
    if (value === "x") assert.deepEqual(restored.current, snapshot);
    else assert.equal(restored.current, undefined);
  }
  const activeBookmark = records.get(cockpitBookmark);
  const inactive = readInvestigationDraft(
    { ...selected, kind: "page", anchor: "another-reading" },
    learningLoop,
  );
  inactive.takeaway = "A reply completed after I changed focus.";
  saveInvestigationDraft(inactive, learningLoop, false);
  assert.equal(records.get(cockpitBookmark), activeBookmark);
  assert.equal(
    readInvestigationDraft(inactive.source, learningLoop).takeaway,
    inactive.takeaway,
  );
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
