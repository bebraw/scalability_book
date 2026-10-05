import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  readFileSync,
  createWriteStream,
  createReadStream,
} from "node:fs";
import { unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import {
  decodeRecord,
  decodeHistory,
  readRecordSql,
  saveRecordSql,
  historySql,
  readHistorySql,
  readHistoryMetadataSql,
  recordBindings,
  type CourseStore,
  type FileStore,
} from "../../worker/course-store.ts";
import {
  courseAuthStore,
  type CourseAuthStore,
  type AuthDatabase,
} from "../../worker/course-auth-store.ts";
import {
  mockMailStore,
  mockMailSchema,
  type MockMailStore,
} from "../../worker/course-mock-mail.ts";
export function localCourseStores(directory: string): {
  store: CourseStore;
  files: FileStore;
  auth: CourseAuthStore;
  mail: MockMailStore;
  database: AuthDatabase;
  close(): void;
} {
  const filesDirectory = path.join(directory, "course-files");
  mkdirSync(filesDirectory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "course.sqlite"));
  db.exec(
    readFileSync(
      new URL(
        "../../course-migrations/0001_course_records.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(
    readFileSync(
      new URL("../../course-migrations/0002_course_auth.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(mockMailSchema);
  const authDatabase: AuthDatabase = {
    async first(sql, values) {
      return db.prepare(sql).get(...values) ?? null;
    },
    async all(sql, values) {
      return db.prepare(sql).all(...values);
    },
    async run(sql, values) {
      db.prepare(sql).run(...values);
    },
  };
  const auth = courseAuthStore(authDatabase),
    mail = mockMailStore(authDatabase);
  const store: CourseStore = {
    async get<T>(key: string) {
      const row = db.prepare(`${readRecordSql} WHERE key = ?`).get(key);
      return row ? decodeRecord<T>(row) : null;
    },
    async list<T>(course: string, kind?: string) {
      return db
        .prepare(
          `${readRecordSql} WHERE course_id = ?${kind ? " AND kind = ?" : ""} ORDER BY key`,
        )
        .all(...(kind ? [course, kind] : [course]))
        .map((row) => decodeRecord<T>(row));
    },
    async courses(prefix) {
      return db
        .prepare(
          `${readRecordSql} WHERE kind = 'course'${prefix ? " AND substr(course_id, 1, ?) = ?" : ""} ORDER BY key`,
        )
        .all(...(prefix ? [prefix.length, prefix] : []))
        .map((row) => decodeRecord(row));
    },
    async save(record, expected, reason, guard) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const written = Boolean(
          db
            .prepare(saveRecordSql)
            .get(...recordBindings(record, expected, guard)),
        );
        if (written)
          db.prepare(historySql).run(reason, record.key, record.revision);
        db.exec("COMMIT");
        return written;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async history(key, revision) {
      const history = db
        .prepare(revision ? readHistorySql : readHistoryMetadataSql)
        .all(...(revision ? [key, revision] : [key]))
        .map(decodeHistory);
      return revision ? history : history.reverse();
    },
  };
  // Keys are generated UUIDs, never paths supplied by an uploader.
  const filePath = (key: string) => {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error("Invalid file key");
    return path.join(filesDirectory, key);
  };
  const files: FileStore = {
    async put(key, body) {
      async function* chunks() {
        const reader = body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally {
          await reader.cancel();
          reader.releaseLock();
        }
      }
      await pipeline(
        Readable.from(chunks()),
        createWriteStream(filePath(key), { flags: "wx" }),
      );
    },
    async get(key) {
      try {
        const stream = createReadStream(filePath(key));
        await new Promise<void>((resolve, reject) => {
          stream.once("open", () => resolve());
          stream.once("error", reject);
        });
        return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      await unlink(filePath(key)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    },
  };
  return {
    store,
    files,
    auth,
    mail,
    database: authDatabase,
    close: () => db.close(),
  };
}
