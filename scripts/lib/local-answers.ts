import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  readAnswersSql,
  saveAnswerSql,
  saveBindings,
  type AnswerStore,
} from "../../worker/learning.ts";
import type { SavedAnswer } from "../../shared/exercises.ts";

export function localAnswerStore(directory: string): AnswerStore {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "learning.sqlite"));
  db.exec(
    readFileSync(
      new URL("../../migrations/0001_learning_answers.sql", import.meta.url),
      "utf8",
    ),
  );
  return {
    async list(user, exercise) {
      return db
        .prepare(readAnswersSql)
        .all(user, exercise)
        .map((row) => ({
          ...row,
          completed: Boolean(row.completed),
        })) as SavedAnswer[];
    },
    async save(user, exercise, answer, expected) {
      return Boolean(
        db
          .prepare(saveAnswerSql)
          .get(...saveBindings(user, exercise, answer, expected)),
      );
    },
  };
}
