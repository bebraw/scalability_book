import type { D1Database } from "@cloudflare/workers-types";
import {
  exercises,
  parseExerciseResponse,
  checkExercise,
  isExerciseId,
  type SavedAnswer,
} from "../shared/exercises.ts";

export interface AnswerStore {
  list(user: string, exercise: string): Promise<SavedAnswer[]>;
  save(
    user: string,
    exercise: string,
    answer: SavedAnswer,
    expected: string | null,
  ): Promise<boolean>;
}

export const readAnswersSql = `SELECT version, answer, completed, revision, updated_at AS updatedAt, prompt FROM learning_answers WHERE user_id = ? AND exercise_id = ? ORDER BY version DESC`;
export const saveAnswerSql = `INSERT INTO learning_answers (user_id, exercise_id, version, answer, completed, revision, updated_at, prompt)
  SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ? IS NULL OR EXISTS (
    SELECT 1 FROM learning_answers WHERE user_id = ? AND exercise_id = ? AND version = ?)
  ON CONFLICT(user_id, exercise_id, version) DO UPDATE SET
    answer = excluded.answer, completed = excluded.completed, revision = excluded.revision,
    updated_at = excluded.updated_at, prompt = excluded.prompt
  WHERE learning_answers.revision = ? RETURNING revision`;

export function saveBindings(
  user: string,
  exercise: string,
  a: SavedAnswer,
  expected: string | null,
) {
  return [
    user,
    exercise,
    a.version,
    a.answer,
    Number(a.completed),
    a.revision,
    a.updatedAt,
    a.prompt,
    expected,
    user,
    exercise,
    a.version,
    expected,
  ];
}

export function d1AnswerStore(db: D1Database): AnswerStore {
  return {
    async list(user, exercise) {
      const result = await db
        .prepare(readAnswersSql)
        .bind(user, exercise)
        .all<SavedAnswer>();
      return result.results.map((row) => ({
        ...row,
        completed: Boolean(row.completed),
      }));
    },
    async save(user, exercise, answer, expected) {
      return Boolean(
        await db
          .prepare(saveAnswerSql)
          .bind(...saveBindings(user, exercise, answer, expected))
          .first(),
      );
    },
  };
}

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });

// Identity comes from the verified session, never from a caller-supplied ID.
export async function handleLearning(
  request: Request,
  userId: string | null,
  store?: AnswerStore,
): Promise<Response> {
  if (!userId)
    return reply({ message: "Sign in again to save your answers." }, 401);
  const id = new URL(request.url).pathname.replace("/api/learning/", "");
  if (!isExerciseId(id)) return reply({ message: "Unknown exercise." }, 404);
  if (!store)
    return reply(
      {
        message:
          "Answer storage is not available yet. Your text has not been saved.",
      },
      503,
    );
  try {
    if (request.method === "GET")
      return reply({ answers: await store.list(userId, id) });
    if (request.method !== "PUT")
      return reply({ message: "Method not allowed." }, 405);
    if (request.headers.get("Origin") !== new URL(request.url).origin)
      return reply({ message: "Request origin rejected." }, 403);
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return reply({ message: "Expected JSON." }, 415);
    const reader = request.body?.getReader();
    let text = "",
      bytes = 0;
    const decoder = new TextDecoder();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 24000) {
          await reader.cancel();
          return reply({ message: "Answer is too large." }, 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return reply({ message: "Invalid JSON." }, 400);
    }
    const definition = exercises[id]!;
    if (
      !body ||
      typeof body.answer !== "string" ||
      body.answer.length > 4000 ||
      !(
        body.expected === null ||
        (typeof body.expected === "string" && body.expected.length <= 64)
      )
    )
      return reply(
        { message: "Use an answer of at most 4000 characters." },
        400,
      );
    if (body.version !== definition.version)
      return reply(
        {
          message:
            "This question has changed. Copy your draft, then reload to read the current version.",
        },
        409,
      );
    const response = parseExerciseResponse(id, body.answer);
    if (!response)
      return reply(
        {
          message:
            "Complete every numeric or selection field with a valid answer.",
        },
        400,
      );
    const result = checkExercise(id, response);
    const answer: SavedAnswer = {
      version: definition.version,
      answer: body.answer,
      completed: result.correct,
      revision: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      prompt: definition.prompt,
    };
    if (!(await store.save(userId, id, answer, body.expected)))
      return reply(
        {
          message:
            "A newer answer was saved elsewhere. Copy your draft, then reload to compare it before saving.",
        },
        409,
      );
    return reply({ answer, result });
  } catch {
    return reply(
      {
        message:
          "Could not reach answer storage. Keep your draft and try saving again.",
      },
      503,
    );
  }
}
