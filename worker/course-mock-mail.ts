import type { AuthDatabase } from "./course-auth-store.ts";
import type { CourseMailTransport, LoginMail } from "./course-auth.ts";
export const mockMailSchema = `CREATE TABLE IF NOT EXISTS course_mock_mail (id INTEGER PRIMARY KEY, course_id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)))`;
export interface MockMailStore extends CourseMailTransport {
  list(course: string): Promise<LoginMail[]>;
}
export function mockMailStore(db: AuthDatabase, namespace = ""): MockMailStore {
  return {
    async send(message) {
      await db.run(
        "INSERT INTO course_mock_mail(course_id, body) VALUES(?, ?)",
        [namespace + message.course, JSON.stringify(message)],
      );
      await db.run(
        namespace
          ? "DELETE FROM course_mock_mail WHERE substr(course_id, 1, ?) = ? AND id NOT IN (SELECT id FROM course_mock_mail WHERE substr(course_id, 1, ?) = ? ORDER BY id DESC LIMIT 1000)"
          : "DELETE FROM course_mock_mail WHERE id NOT IN (SELECT id FROM course_mock_mail ORDER BY id DESC LIMIT 1000)",
        namespace
          ? [namespace.length, namespace, namespace.length, namespace]
          : [],
      );
    },
    async list(course) {
      return (
        await db.all(
          "SELECT body FROM course_mock_mail WHERE course_id = ? ORDER BY id DESC LIMIT 50",
          [namespace + course],
        )
      ).map((row) => JSON.parse(String(row.body)) as LoginMail);
    },
  };
}
