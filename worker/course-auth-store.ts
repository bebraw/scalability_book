export interface AuthGrant {
  course: string;
  student: string;
  email: string;
  expiresAt: string;
}
import type { AccessActivity } from "../shared/course-administration.ts";
export interface CourseAuthStore {
  issue(hash: string, grant: AuthGrant): Promise<void>;
  ready(hash: string): Promise<void>;
  discard(hash: string): Promise<void>;
  consume(hash: string, now: string): Promise<AuthGrant | null>;
  session(hash: string, now: string): Promise<AuthGrant | null>;
  saveSession(hash: string, grant: AuthGrant): Promise<void>;
  deleteSession(hash: string): Promise<void>;
  quota(key: string, maximum: number, expiresAt: string): Promise<boolean>;
  recordAccess(course: string, student: string, now: string): Promise<void>;
  activity(course: string): Promise<AccessActivity[]>;
  cleanup(now: string): Promise<void>;
}
export type SqlValue = string | number | null;
export interface AuthDatabase {
  first(
    sql: string,
    values: SqlValue[],
  ): Promise<Record<string, unknown> | null>;
  all(sql: string, values: SqlValue[]): Promise<Record<string, unknown>[]>;
  run(sql: string, values: SqlValue[]): Promise<void>;
}
const grant = (row: Record<string, unknown> | null): AuthGrant | null =>
  row
    ? {
        course: String(row.course_id),
        student: String(row.student_id),
        email: String(row.email),
        expiresAt: String(row.expires_at),
      }
    : null;

// Every token consume and quota increment is one atomic SQL statement in both adapters.
export function courseAuthStore(db: AuthDatabase): CourseAuthStore {
  return {
    issue(hash, value) {
      return db.run(
        "INSERT INTO course_login_links(token_hash, course_id, student_id, email, expires_at) VALUES(?, ?, ?, ?, ?)",
        [hash, value.course, value.student, value.email, value.expiresAt],
      );
    },
    ready(hash) {
      return db.run(
        "UPDATE course_login_links SET ready = 1 WHERE token_hash = ?",
        [hash],
      );
    },
    discard(hash) {
      return db.run("DELETE FROM course_login_links WHERE token_hash = ?", [
        hash,
      ]);
    },
    async consume(hash, now) {
      return grant(
        await db.first(
          "DELETE FROM course_login_links WHERE token_hash = ? AND expires_at > ? AND ready = 1 RETURNING course_id, student_id, email, expires_at",
          [hash, now],
        ),
      );
    },
    async session(hash, now) {
      return grant(
        await db.first(
          "SELECT course_id, student_id, email, expires_at FROM course_sessions WHERE token_hash = ? AND expires_at > ?",
          [hash, now],
        ),
      );
    },
    saveSession(hash, value) {
      return db.run(
        "INSERT INTO course_sessions(token_hash, course_id, student_id, email, expires_at) VALUES(?, ?, ?, ?, ?)",
        [hash, value.course, value.student, value.email, value.expiresAt],
      );
    },
    deleteSession(hash) {
      return db.run("DELETE FROM course_sessions WHERE token_hash = ?", [hash]);
    },
    async quota(key, maximum, expiresAt) {
      return Boolean(
        await db.first(
          "INSERT INTO course_auth_attempts(key, count, expires_at) VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count",
          [key, expiresAt, maximum],
        ),
      );
    },
    recordAccess(course, student, now) {
      return db.run(
        "INSERT INTO course_access_activity(course_id, student_id, first_sign_in, last_sign_in) VALUES(?, ?, ?, ?) ON CONFLICT(course_id, student_id) DO UPDATE SET last_sign_in = excluded.last_sign_in",
        [course, student, now, now],
      );
    },
    async activity(course) {
      return (
        await db.all(
          "SELECT student_id, first_sign_in, last_sign_in FROM course_access_activity WHERE course_id = ? ORDER BY student_id",
          [course],
        )
      ).map((row) => ({
        student: String(row.student_id),
        firstSignIn: String(row.first_sign_in),
        lastSignIn: String(row.last_sign_in),
      }));
    },
    async cleanup(now) {
      await db.run("DELETE FROM course_login_links WHERE expires_at <= ?", [
        now,
      ]);
      await db.run("DELETE FROM course_sessions WHERE expires_at <= ?", [now]);
      await db.run("DELETE FROM course_auth_attempts WHERE expires_at <= ?", [
        now,
      ]);
    },
  };
}
export function d1CourseAuthStore(db: CourseBindings["COURSE_DB"]) {
  return courseAuthStore({
    first: (sql, values) =>
      db
        .prepare(sql)
        .bind(...values)
        .first<Record<string, unknown>>(),
    async all(sql, values) {
      return (
        await db
          .prepare(sql)
          .bind(...values)
          .all<Record<string, unknown>>()
      ).results;
    },
    async run(sql, values) {
      await db
        .prepare(sql)
        .bind(...values)
        .run();
    },
  });
}
