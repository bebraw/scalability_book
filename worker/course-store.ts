import type { Envelope } from "../shared/course.ts";
export interface CourseStore {
  get<T>(key: string): Promise<Envelope<T> | null>;
  list<T>(course: string, kind?: string): Promise<Envelope<T>[]>;
  courses(): Promise<Envelope[]>;
  save(
    record: Envelope,
    expected: string | null,
    reason: string,
    guard?: { key: string; revision: string },
  ): Promise<boolean>;
  history(
    key: string,
    revision?: string,
  ): Promise<(Envelope & { reason: string })[]>;
}
export interface FileStore {
  put(
    key: string,
    body: ReadableStream<Uint8Array>,
    length: number,
  ): Promise<void>;
  get(key: string): Promise<ReadableStream<Uint8Array> | null>;
  delete(key: string): Promise<void>;
}
export const readRecordSql =
  "SELECT key, course_id AS courseId, kind, body, revision, updated_at AS updatedAt, actor FROM course_records";
export const saveRecordSql = `INSERT INTO course_records (key, course_id, kind, body, revision, updated_at, actor)
 SELECT ?, ?, ?, ?, ?, ?, ? WHERE (? IS NULL OR EXISTS(SELECT 1 FROM course_records WHERE key = ?))
 AND (? IS NULL OR EXISTS(SELECT 1 FROM course_records WHERE key = ? AND revision = ?))
 ON CONFLICT(key) DO UPDATE SET body = excluded.body, revision = excluded.revision, updated_at = excluded.updated_at, actor = excluded.actor
 WHERE course_records.revision = ? RETURNING revision`;
export const historySql = `INSERT INTO course_history (key, revision, body, updated_at, actor, reason)
 SELECT key, revision, body, updated_at, actor, ? FROM course_records WHERE key = ? AND revision = ?`;
export const readHistorySql = `SELECT key, body, revision, updated_at AS updatedAt, actor, reason FROM course_history WHERE key = ? AND revision = ?`;
export const readHistoryMetadataSql = `SELECT key, 'null' AS body, revision, updated_at AS updatedAt, actor, reason FROM course_history WHERE key = ? ORDER BY updated_at DESC, rowid DESC LIMIT 1000`;
export function recordBindings(
  record: Envelope,
  expected: string | null,
  guard?: { key: string; revision: string },
) {
  return [
    record.key,
    record.courseId,
    record.kind,
    JSON.stringify(record.value),
    record.revision,
    record.updatedAt,
    record.actor,
    expected,
    record.key,
    guard?.key ?? null,
    guard?.key ?? null,
    guard?.revision ?? null,
    expected,
  ];
}
export function decodeRecord<T>(row: unknown): Envelope<T> {
  const { body, ...rest } = row as Envelope & { body: string };
  return { ...rest, value: JSON.parse(body) } as Envelope<T>;
}
export function d1CourseStore(db: CourseBindings["COURSE_DB"]): CourseStore {
  async function list<T>(clause: string, bindings: string[]) {
    const rows: Envelope<T>[] = [];
    let cursor = "";
    for (;;) {
      const result = await db
        .prepare(
          `${readRecordSql} WHERE ${clause} AND key > ? ORDER BY key LIMIT 20`,
        )
        .bind(...bindings, cursor)
        .all();
      rows.push(...result.results.map((row) => decodeRecord<T>(row)));
      if (result.results.length < 20) return rows;
      cursor = rows.at(-1)!.key;
    }
  }
  return {
    async get<T>(key: string) {
      const row = await db
        .prepare(`${readRecordSql} WHERE key = ?`)
        .bind(key)
        .first();
      return row ? decodeRecord<T>(row) : null;
    },
    list<T>(course: string, kind?: string) {
      return list<T>(
        `course_id = ?${kind ? " AND kind = ?" : ""}`,
        kind ? [course, kind] : [course],
      );
    },
    courses() {
      return list("kind = ?", ["course"]);
    },
    async save(record, expected, reason, guard) {
      const result = await db.batch([
        db
          .prepare(saveRecordSql)
          .bind(...recordBindings(record, expected, guard)),
        db.prepare(historySql).bind(reason, record.key, record.revision),
      ]);
      return Boolean(result[0]?.meta.changes);
    },
    async history(key, revision) {
      const result = await db
        .prepare(revision ? readHistorySql : readHistoryMetadataSql)
        .bind(...(revision ? [key, revision] : [key]))
        .all();
      const history = result.results.map(
        (row) => decodeRecord(row) as Envelope & { reason: string },
      );
      return revision ? history : history.reverse();
    },
  };
}
export function r2FileStore(bucket: CourseBindings["COURSE_FILES"]): FileStore {
  return {
    async put(key, body, length) {
      // R2 requires a known-length stream. Both promises are awaited; no detached writes.
      const fixed = new FixedLengthStream(length);
      const abort = new AbortController();
      const upload = bucket.put(key, fixed.readable).catch((error) => {
        abort.abort(error);
        throw error;
      });
      const results = await Promise.allSettled([
        body.pipeTo(fixed.writable, { signal: abort.signal }),
        upload,
      ]);
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) return null;
      const reader = object.body.getReader();
      // Adapt platform stream typings at the boundary; bytes remain streamed.
      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            reader.releaseLock();
            controller.close();
          } else if (value instanceof Uint8Array) controller.enqueue(value);
          else throw new Error("Expected archive bytes");
        },
        async cancel(reason) {
          await reader.cancel(reason);
          reader.releaseLock();
        },
      });
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
