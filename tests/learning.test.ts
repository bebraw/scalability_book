import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { localAnswerStore } from "../scripts/lib/local-answers.ts";
import { handleLearning } from "../worker/learning.ts";
import {
  safeReturnTo,
  parseExerciseResponse,
  checkExercise,
} from "../shared/exercises.ts";

const url = "https://book.test/api/learning/measurement-boundary";
function put(body: unknown, origin = "https://book.test") {
  return new Request(url, {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const draft = {
  version: 2,
  answer: JSON.stringify({ expected: "10", conclusion: "check" }),
  completed: true,
  expected: null,
};

test("private answers persist across store connections and are isolated by identity", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-answers-"));
  try {
    const store = localAnswerStore(dir);
    assert.equal((await handleLearning(put(draft), null, store)).status, 401);
    assert.equal(
      (await handleLearning(put(draft), "github:1", store)).status,
      200,
    );
    const reload = await handleLearning(
      new Request(url),
      "github:1",
      localAnswerStore(dir),
    );
    assert.equal(reload.headers.get("Cache-Control"), "private, no-store");
    const { answers } = await reload.json();
    assert.equal(answers[0].answer, draft.answer);
    assert.equal(answers[0].completed, true);
    assert.deepEqual(
      (await (await handleLearning(new Request(url), "github:2", store)).json())
        .answers,
      [],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("stale saves cannot overwrite another tab and question versions retain previous answers", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-answers-"));
  try {
    const store = localAnswerStore(dir);
    const first = await (
      await handleLearning(put(draft), "github:1", store)
    ).json();
    assert.equal(
      (await handleLearning(put(draft), "github:1", store)).status,
      409,
    );
    assert.equal(
      (
        await handleLearning(
          put({
            ...draft,
            expected: first.answer.revision,
            answer: JSON.stringify({ expected: "25", conclusion: "database" }),
          }),
          "github:1",
          store,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleLearning(
          put({
            ...draft,
            expected: first.answer.revision,
            answer: draft.answer,
          }),
          "github:1",
          store,
        )
      ).status,
      409,
    );
    await store.save(
      "github:1",
      "measurement-boundary",
      {
        ...first.answer,
        version: 0,
        answer: "Earlier question",
        revision: "older",
      },
      null,
    );
    const { answers } = await (
      await handleLearning(new Request(url), "github:1", store)
    ).json();
    assert.equal(answers.length, 2);
    assert.equal(JSON.parse(answers[0].answer).expected, "25");
    assert.equal(answers[0].completed, false); // Ignores the client-supplied completed:true.
    assert.equal(answers[1].answer, "Earlier question");
    assert.equal(
      (await handleLearning(put({ ...draft, version: 0 }), "github:1", store))
        .status,
      409,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("answer API rejects cross-origin writes, invalid bodies, unknown IDs, and unavailable storage", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "book-answers-"));
  try {
    const store = localAnswerStore(dir);
    assert.equal(
      (await handleLearning(put(draft, "https://evil.test"), "github:1", store))
        .status,
      403,
    );
    assert.equal(
      (
        await handleLearning(
          put({ ...draft, answer: "x".repeat(4001) }),
          "github:1",
          store,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await handleLearning(
          put({ ...draft, answer: "x".repeat(25000) }),
          "github:1",
          store,
        )
      ).status,
      413,
    );
    assert.equal(
      (await handleLearning(put(null), "github:1", store)).status,
      400,
    );
    assert.equal(
      (await handleLearning(new Request(url + "-unknown"), "github:1", store))
        .status,
      404,
    );
    assert.equal(
      (await handleLearning(new Request(url), "github:1")).status,
      503,
    );
    const broken = {
      list: async () => {
        throw Error("private database detail");
      },
      save: store.save,
    };
    const result = await handleLearning(new Request(url), "github:1", broken);
    assert.equal(result.status, 503);
    assert.doesNotMatch(await result.text(), /private database detail/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sign-in return destination stays on the book origin", () => {
  assert.equal(
    safeReturnTo("/chapters/benchmarking/#exercise-measurement-boundary"),
    "/chapters/benchmarking/#exercise-measurement-boundary",
  );
  for (const target of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\nLocation: bad",
    null,
  ])
    assert.equal(safeReturnTo(target), "/");
});

test("checks reject incomplete and invalid input and evaluate each objective format", () => {
  for (const response of [
    "",
    "null",
    "[]",
    "{}",
    '{"expected":"","conclusion":"check"}',
    '{"expected":"NaN","conclusion":"check"}',
    '{"expected":"10","conclusion":"invented"}',
    '{"expected":"10","conclusion":"check","extra":"x"}',
  ]) {
    assert.equal(parseExerciseResponse("measurement-boundary", response), null);
  }
  assert.equal(
    checkExercise("measurement-boundary", {
      expected: "1e1",
      conclusion: "check",
    }).correct,
    true,
  );
  assert.equal(
    checkExercise("measurement-boundary", {
      expected: "10",
      conclusion: "database",
    }).correct,
    false,
  );
  assert.equal(
    checkExercise("measurement-prediction", {
      mean: "60",
      p95: "240",
      objective: "mean-only",
    }).correct,
    true,
  );
  assert.equal(
    checkExercise("measurement-prediction", {
      mean: "60",
      p95: "40",
      objective: "both",
    }).correct,
    false,
  );
  assert.equal(
    checkExercise("measurement-experiment", {
      comparison: "controlled",
      verdict: "reject",
    }).correct,
    true,
  );
  assert.equal(
    checkExercise("measurement-experiment", {
      comparison: "hardware",
      verdict: "reject",
    }).correct,
    false,
  );
});
