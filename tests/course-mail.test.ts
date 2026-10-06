import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses } from "../worker/courses.ts";
import { cloudflareCourseMail } from "../worker/course-mail.ts";
import worker from "../worker/index.ts";

const sender = "course-test@scalableweb.dev";
const token = "a".repeat(43);
const message = {
  course: "synthetic-course",
  courseName: 'Course <img src=x onerror="bad"> & learning',
  to: "instructor@example.edu",
  url: `https://scalableweb.dev/course/?course=synthetic-course#login=${token}`,
  expiresAt: "2026-10-05T12:15:00.000Z",
};
test("course mail uses the configured sender, plain text and escaped HTML; setup must explicitly enable it", async () => {
  const sent: Record<string, string>[] = [];
  const binding = {
    async send(value: Record<string, string>) {
      sent.push(value);
      return { messageId: "synthetic-message" };
    },
  };
  for (const enabled of [undefined, "false", "TRUE", "1"])
    assert.equal(cloudflareCourseMail(binding, enabled, sender), undefined);
  assert.equal(cloudflareCourseMail(undefined, "true", sender), undefined);
  for (const address of [
    undefined,
    "",
    "not-an-address",
    "teacher@example.invalid",
    "bad\r\n@scalableweb.dev",
  ])
    assert.equal(cloudflareCourseMail(binding, "true", address), undefined);
  await cloudflareCourseMail(binding, "true", sender)!.send(message);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0]!.from, {
    email: "course-test@scalableweb.dev",
    name: "Scalable Web course",
  });
  assert.equal(sent[0]!.to, message.to);
  assert.equal(sent[0]!.replyTo, "course-test@scalableweb.dev");
  assert.match(sent[0]!.text, /Confirm sign-in/);
  assert.match(sent[0]!.text, /2026-10-05T12:15:00.000Z/);
  assert.match(sent[0]!.html, /&lt;img/);
  assert.equal(sent[0]!.html.includes("<img"), false);
  assert.equal(sent[0]!.text.includes(message.url), true);
  for (const url of [
    message.url.replace("scalableweb.dev", "attacker.test"),
    message.url.replace("https:", "http:"),
    message.url.replace("/course/", "/other/"),
    message.url.replace("synthetic-course#", "other-course#"),
    message.url.replace("#login=", "?token="),
  ])
    await assert.rejects(
      cloudflareCourseMail(binding, "true", sender)!.send({ ...message, url }),
      /Invalid course sign-in destination/,
    );
  assert.equal(sent.length, 1);
});

async function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "course-mail-"));
  const stores = localCourseStores(directory);
  const db = new DatabaseSync(path.join(directory, "course.sqlite"));
  t.after(() => {
    db.close();
    stores.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const request = (route: string, body: unknown) =>
    new Request(`https://scalableweb.dev${route}`, {
      method: "POST",
      headers: {
        Origin: "https://scalableweb.dev",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: JSON.stringify(body),
    });
  const create = await handleCourses(
    request("/api/courses", { name: "Synthetic email run" }),
    {
      ...stores,
      user: { id: "github:1", login: "instructor" },
      admins: ["instructor"],
    },
  );
  const record = await create.json();
  const id = record.value.id;
  const view = await handleCourses(
    new Request(`https://scalableweb.dev/api/courses/${id}`),
    {
      ...stores,
      user: { id: "github:1", login: "instructor" },
      admins: ["instructor"],
    },
  );
  const data = await view.json();
  const importResponse = await handleCourses(
    new Request(`https://scalableweb.dev/api/courses/${id}/students`, {
      method: "PUT",
      headers: {
        Origin: "https://scalableweb.dev",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expected: data.administration.students,
        format: "institutional",
        reason: "Synthetic enrollment for mail boundary check",
        students: [
          {
            number: "TEST001",
            firstName: "Synthetic",
            lastName: "Instructor",
            email: message.to,
          },
        ],
      }),
    }),
    {
      ...stores,
      user: { id: "github:1", login: "instructor" },
      admins: ["instructor"],
    },
  );
  assert.equal(importResponse.status, 200);
  // SQLite implements the documented D1 statement port for the runtime test.
  const env = {
    COURSE_EMAIL_FROM: sender,
    ASSETS: { fetch: async () => new Response("not an API") },
    COURSE_DB: {
      prepare(sql: string) {
        const statement = db.prepare(sql);
        return {
          bind(...values: (string | number | null)[]) {
            return {
              first: async () => statement.get(...values) ?? null,
              all: async () => ({ results: statement.all(...values) }),
              run: async () => statement.run(...values),
            };
          },
        };
      },
    },
  };
  const deferred: Promise<void>[] = [];
  const ctx = { waitUntil: (task: Promise<void>) => deferred.push(task) };
  return { request, env, ctx, deferred, id, stores };
}
const mailToken = (text: string) =>
  new URLSearchParams(
    new URL(
      text.match(/https:\/\/scalableweb\.dev\/course\/\?[^\s]+/)![0],
    ).hash.slice(1),
  ).get("login")!;

test("Worker mail runs in waitUntil; links stay unusable until sending succeeds and no mock inbox is exposed", async (t) => {
  const f = await fixture(t);
  let sent = "";
  let accept!: () => void;
  const pending = new Promise<void>((resolve) => {
    accept = resolve;
  });
  const binding = {
    async send(value: { text: string }) {
      sent = value.text;
      await pending;
      return { messageId: "synthetic-accepted" };
    },
  };
  const request = f.request("/api/course-auth/request", {
    course: f.id,
    email: message.to,
  });
  assert.equal(
    (
      await worker.fetch(
        request.clone(),
        { ...f.env, COURSE_MAIL: binding },
        f.ctx,
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await worker.fetch(
        request.clone(),
        { ...f.env, COURSE_EMAIL_ENABLED: "true" },
        f.ctx,
      )
    ).status,
    503,
  );
  assert.equal(sent, "");
  const env = { ...f.env, COURSE_MAIL: binding, COURSE_EMAIL_ENABLED: "true" };
  const response = await worker.fetch(request, env, f.ctx);
  assert.equal(response.status, 202);
  assert.equal(f.deferred.length, 1);
  const credential = mailToken(sent);
  const verify = () =>
    worker.fetch(
      f.request("/api/course-auth/verify", { token: credential }),
      env,
      f.ctx,
    );
  assert.equal((await verify()).status, 400);
  accept();
  await Promise.all(f.deferred);
  const signed = await verify();
  assert.equal(signed.status, 200);
  assert.match(
    signed.headers.get("set-cookie")!,
    /HttpOnly; Secure; SameSite=Lax/,
  );
  assert.equal((await verify()).status, 400);
  const unknown = await worker.fetch(
    f.request("/api/course-auth/request", {
      course: f.id,
      email: "unknown@example.edu",
    }),
    env,
    f.ctx,
  );
  assert.deepEqual(await unknown.json(), await response.json());
  assert.equal(f.deferred.length, 1);
  const inbox = await worker.fetch(
    new Request(
      `https://scalableweb.dev/api/course-auth/mock-inbox?course=${f.id}`,
    ),
    env,
    f.ctx,
  );
  assert.equal(inbox.status, 404);
});

test("Cloudflare failures invalidate the link and provider errors cannot put credentials in logs or responses", async (t) => {
  const f = await fixture(t);
  let sent = "";
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(String(value));
  };
  t.after(() => {
    console.error = original;
  });
  const env = {
    ...f.env,
    COURSE_EMAIL_ENABLED: "true",
    COURSE_MAIL: {
      async send(value: { text: string }) {
        sent = value.text;
        throw new Error(`Synthetic provider failure containing ${value.text}`);
      },
    },
  };
  const response = await worker.fetch(
    f.request("/api/course-auth/request", { course: f.id, email: message.to }),
    env,
    f.ctx,
  );
  assert.equal(response.status, 202);
  await Promise.all(f.deferred);
  const credential = mailToken(sent);
  assert.equal(
    (
      await worker.fetch(
        f.request("/api/course-auth/verify", { token: credential }),
        env,
        f.ctx,
      )
    ).status,
    400,
  );
  const log = JSON.parse(logs[0]!);
  assert.deepEqual(log, {
    event: "course_login_delivery_failed",
    course: f.id,
  });
  assert.equal(JSON.stringify(logs).includes(credential), false);
  assert.equal(JSON.stringify(logs).includes(message.to), false);
  assert.equal((await response.text()).includes(credential), false);
  assert.equal((await f.stores.store.list(f.id, "course")).length, 1);
});
