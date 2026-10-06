import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { localCourseStores } from "../scripts/lib/local-courses.ts";
import { handleCourses, type CourseUser } from "../worker/courses.ts";
import { recordKey, type Course, type Envelope } from "../shared/course.ts";
import {
  publicInquiryMarkdown,
  type InquiryThread,
  type InquiryOffer,
} from "../shared/course-inquiry.ts";
const admin = { id: "github:1", login: "instructor" };
const alice = { id: "github:2", login: "alice" },
  bob = { id: "github:3", login: "bob" },
  carol = { id: "github:4", login: "carol" },
  dan = { id: "github:5", login: "dan" },
  outsider = { id: "github:6", login: "outside" };
const source = {
  url: "https://book.test/chapters/benchmarking/",
  anchor: "p-initial-check",
  title: "Observation intervals",
  excerpt: "Averages must describe a common boundary.",
  kind: "passage",
  revision: "initial-source",
  conceptIds: ["queue"],
};
async function fixture(t: test.TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "book-inquiry-test-"));
  const stores = localCourseStores(directory);
  t.after(() => {
    stores.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let courseId = "";
  const request = (
    route = "",
    method = "GET",
    body?: unknown,
    user: CourseUser | null = alice,
    id = courseId,
    origin = "https://book.test",
  ) =>
    handleCourses(
      new Request(
        `https://book.test/api/courses${id ? `/${id}/inquiry${route}` : ""}`,
        {
          method,
          headers: {
            Origin: origin,
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      ),
      {
        user,
        admins: [admin.login],
        now: "2026-10-06T12:00:00.000Z",
        ...stores,
      },
    );
  const good = async <T>(...args: Parameters<typeof request>) => {
    const response = await request(...args);
    const body = await response.json();
    assert.ok(response.ok, JSON.stringify(body));
    return body as T;
  };
  let config = await good<Envelope<Course>>(
    "",
    "POST",
    { name: "Synthetic inquiry course" },
    admin,
    "",
  );
  courseId = config.value.id;
  const update = async (fn: (course: Course) => void) => {
    const next = structuredClone(config);
    fn(next.value);
    next.revision = randomUUID();
    assert.equal(
      await stores.store.save(
        next,
        config.revision,
        "Synthetic membership change",
      ),
      true,
    );
    config = next;
  };
  await update((course) => {
    course.students = [alice, bob, carol, dan].map((user) => ({
      id: user.id,
      login: user.login,
      name: user.login,
      number: `synthetic-${user.login}`,
    }));
    course.phases.establish.groups = [
      { id: "group-a", members: [alice.id, bob.id] },
      { id: "group-b", members: [carol.id, dan.id] },
    ];
    course.phases.challenge.groups = [
      { id: "group-a", members: [carol.id, dan.id] },
      { id: "group-b", members: [alice.id, bob.id] },
    ];
  });
  const list = (captured = source, question = "reading") =>
    `?source=${encodeURIComponent(JSON.stringify(captured))}&question=${question}`;
  const attempt = (user = alice, captured = source, question = "reading") =>
    good(
      "/attempts",
      "POST",
      {
        source: captured,
        question,
        noteId: randomUUID(),
        noteRevision: randomUUID(),
      },
      user,
    );
  const share = (
    body = "Initial disagreement about the interval",
    audience: unknown = { kind: "group", phase: "establish", group: "group-a" },
    user = alice,
    captured = source,
    question = "reading",
  ) =>
    good<Envelope<InquiryThread>>(
      "",
      "POST",
      {
        source: captured,
        question,
        audience,
        kind: "question",
        body,
        provenance: "Student observation",
        links: [],
      },
      user,
    );
  return {
    stores,
    request,
    good,
    update,
    list,
    attempt,
    share,
    id: courseId,
    config: () => config,
  };
}
test("peer discovery and direct reads require own saved-work declaration, with no initial text upload or private record migration", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request(f.list())).status, 403);
  await f.attempt();
  const thread = await f.share();
  assert.equal(
    (await f.request(`/${thread.value.id}`, "GET", undefined, bob)).status,
    403,
  );
  await f.attempt(bob);
  assert.equal(
    (await f.request(`/${thread.value.id}`, "GET", undefined, bob)).status,
    200,
  );
  assert.equal(
    (await f.request(f.list(source, "evidence"), "GET", undefined, bob)).status,
    403,
  );
  assert.equal(
    (await f.request(f.list(), "GET", undefined, outsider)).status,
    403,
  );
  assert.equal((await f.request(f.list(), "GET", undefined, null)).status, 401);
  assert.equal(
    (
      await f.request(f.list(), "GET", undefined, {
        id: alice.id,
        login: "email",
        provider: "email",
        courseId: randomUUID(),
      })
    ).status,
    403,
  );
  const attempts = await f.stores.store.list(f.id, "inquiry-attempt");
  assert.ok(
    attempts.every(
      (record) =>
        !JSON.stringify(record).includes("body") &&
        !JSON.stringify(record).includes("noteId"),
    ),
  );
  const snapshot = await handleCourses(
    new Request(`https://book.test/api/courses/${f.id}`),
    { user: bob, admins: [], ...f.stores },
  );
  assert.equal(
    JSON.stringify(await snapshot.json()).includes(
      "Initial disagreement about the interval",
    ),
    false,
  );
  assert.equal(
    (
      await f.request(
        "/attempts",
        "POST",
        { source, noteId: randomUUID(), noteRevision: randomUUID() },
        alice,
        f.id,
        "https://evil.test",
      )
    ).status,
    403,
  );
});
test("group and phase isolation survives corrected allocation and withdrawal; wider sharing is a new explicit record", async (t) => {
  const f = await fixture(t);
  await f.attempt();
  await f.attempt(bob);
  await f.attempt(carol);
  await f.attempt(dan);
  const thread = await f.share("Original group question");
  assert.equal(
    (await f.request(`/${thread.value.id}`, "GET", undefined, carol)).status,
    404,
  );
  assert.equal(
    (
      await f.request("", "POST", {
        source,
        audience: { kind: "group", phase: "challenge", group: "group-a" },
        kind: "summary",
        body: "forged phase",
      })
    ).status,
    403,
  );
  await f.update((course) => {
    course.phases.establish.groups[0]!.members = [alice.id, carol.id];
    course.phases.establish.groups[1]!.members = [bob.id, dan.id];
  });
  assert.equal(
    (await f.request(`/${thread.value.id}`, "GET", undefined, carol)).status,
    404,
  );
  assert.equal(
    (await f.request(`/${thread.value.id}`, "GET", undefined, bob)).status,
    404,
  );
  assert.equal(
    (
      await f.request(
        `/${thread.value.id}/replies`,
        "POST",
        { expected: thread.revision, kind: "summary", body: "new member" },
        carol,
      )
    ).status,
    403,
  );
  const cohort = await f.share("Reviewed selected summary", { kind: "cohort" });
  assert.equal(
    (await f.request(`/${cohort.value.id}`, "GET", undefined, carol)).status,
    200,
  );
  assert.equal(
    (await f.good<Envelope<InquiryThread>>(`/${cohort.value.id}`)).value.posts
      .length,
    1,
  );
  await f.update((course) => {
    course.students.find((s) => s.id === alice.id)!.enrollment = {
      enrolledAt: null,
      lateAt: null,
      catchUp: "",
      reason: "",
      withdrawal: {
        at: "2026-10-06T12:00:00.000Z",
        reason: "Synthetic withdrawal",
        resolution: "",
        reviewedAt: null,
      },
    };
  });
  const retained = await f.good<
    Envelope<InquiryThread> & { readOnly: boolean }
  >(`/${thread.value.id}`);
  assert.equal(retained.readOnly, true);
  assert.ok(retained.value.posts.every((post) => post.author === alice.id));
  assert.equal(
    (
      await f.request(`/${cohort.value.id}/replies`, "POST", {
        expected: cohort.revision,
        kind: "question",
        body: "withdrawn write",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(`/${thread.value.id}`, "PUT", {
        expected: thread.revision,
        postId: thread.value.posts[0]!.id,
        remove: true,
        reason: "Author withdrew text",
      })
    ).status,
    200,
  );
});
test("concurrent replies and edits reject stale writes and source snapshots retain original text", async (t) => {
  const f = await fixture(t);
  await f.attempt();
  await f.attempt(bob);
  const thread = await f.share();
  const replies = await Promise.all([
    f.request(`/${thread.value.id}/replies`, "POST", {
      expected: thread.revision,
      kind: "observation",
      body: "Alice checked one window",
    }),
    f.request(
      `/${thread.value.id}/replies`,
      "POST",
      {
        expected: thread.revision,
        kind: "disagreement",
        body: "Bob questions the stable interval",
      },
      bob,
    ),
  ]);
  assert.deepEqual(replies.map((reply) => reply.status).sort(), [200, 409]);
  const current = await f.good<Envelope<InquiryThread>>(`/${thread.value.id}`);
  assert.equal(current.value.posts.length, 2);
  const sourceChanged = {
    ...source,
    excerpt: "An edited explanation",
    revision: "new-source",
  };
  const discovered = await f.good<{ threads: Envelope<InquiryThread>[] }>(
    f.list(sourceChanged),
  );
  assert.equal(discovered.threads[0]!.value.source.excerpt, source.excerpt);
  assert.equal(
    (
      await f.request(`/${thread.value.id}`, "PUT", {
        expected: current.revision,
        audience: { kind: "cohort" },
        postId: thread.value.posts[0]!.id,
        body: "Revised only my own claim",
        reason: "Clarify interval",
      })
    ).status,
    200,
  );
  const revised = await f.good<Envelope<InquiryThread>>(`/${thread.value.id}`);
  assert.equal(revised.value.audience.kind, "group");
  assert.equal((await f.stores.store.history(revised.key)).length, 3);
});
test("public offers contain only explicitly offered own text and require review before editorial export", async (t) => {
  const f = await fixture(t);
  await f.attempt();
  await f.attempt(bob);
  const thread = await f.share("Group-only text");
  const reply = await f.good<Envelope<InquiryThread>>(
    `/${thread.value.id}/replies`,
    "POST",
    {
      expected: thread.revision,
      kind: "disagreement",
      body: "Private group reply",
    },
    bob,
  );
  assert.equal(
    (
      await f.request("/offers", "POST", {
        threadId: thread.value.id,
        postId: reply.value.posts[1]!.id,
        body: "Someone else's reply",
        publicConsent: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/offers", "POST", {
        threadId: thread.value.id,
        postId: thread.value.posts[0]!.id,
        body: "Offered copy",
      })
    ).status,
    400,
  );
  const offer = await f.good<Envelope<InquiryOffer>>("/offers", "POST", {
    threadId: thread.value.id,
    postId: thread.value.posts[0]!.id,
    body: "Reviewed public explanation",
    publicConsent: true,
  });
  assert.equal(JSON.stringify(offer).includes("Private group reply"), false);
  assert.equal(JSON.stringify(offer).includes("Group-only text"), false);
  assert.throws(() => publicInquiryMarkdown(offer.value), /Review/);
  assert.equal(
    (await f.good<Envelope<InquiryOffer>[]>("/offers", "GET", undefined, bob))
      .length,
    0,
  );
  assert.equal(
    (
      await f.request(
        `/offers/${offer.value.id}`,
        "PUT",
        {
          expected: offer.revision,
          status: "reviewed",
          curatedText: offer.value.body,
          reason: "review",
        },
        bob,
      )
    ).status,
    403,
  );
  const reviewed = await f.good<Envelope<InquiryOffer>>(
    `/offers/${offer.value.id}`,
    "PUT",
    {
      expected: offer.revision,
      status: "reviewed",
      curatedText: "A common observation boundary is needed.",
      reason: "Editorial preparation",
    },
    admin,
  );
  const publicText = publicInquiryMarkdown(reviewed.value);
  assert.match(publicText, /Anonymous course reader/);
  assert.equal(publicText.includes(f.id), false);
  assert.equal(publicText.includes(thread.value.id), false);
  const withdrawn = await f.good<Envelope<InquiryOffer>>(
    `/offers/${offer.value.id}`,
    "PUT",
    {
      expected: reviewed.revision,
      status: "withdrawn",
      reason: "Changed my mind",
    },
  );
  assert.throws(() => publicInquiryMarkdown(withdrawn.value), /Review/);
});

test("inquiry pages stay bounded to the requested source and reject unrelated cursors", async (t) => {
  const f = await fixture(t);
  await f.attempt();
  const first = await f.share();
  for (let index = 0; index < 44; index++) {
    const id = randomUUID();
    const record = {
      ...first,
      key: recordKey(f.id, "inquiry-thread", "", id),
      revision: randomUUID(),
      value: { ...first.value, id },
    };
    assert.equal(
      await f.stores.store.save(record, null, "Synthetic pagination fixture"),
      true,
    );
    const otherId = randomUUID();
    assert.equal(
      await f.stores.store.save(
        {
          ...record,
          key: recordKey(f.id, "inquiry-thread", "", otherId),
          value: { ...record.value, id: otherId, sourceId: "other-source" },
        },
        null,
        "Other source fixture",
      ),
      true,
    );
  }
  const page = await f.good<{
    threads: Envelope<InquiryThread>[];
    next: string | null;
  }>(f.list());
  assert.equal(page.threads.length, 40);
  assert.ok(page.next);
  const last = await f.good<typeof page>(
    `${f.list()}&after=${encodeURIComponent(page.next)}`,
  );
  assert.equal(last.threads.length, 5);
  assert.equal(last.next, null);
  assert.equal(
    new Set([...page.threads, ...last.threads].map((record) => record.key))
      .size,
    45,
  );
  assert.ok(
    [...page.threads, ...last.threads].every(
      (record) => record.value.sourceId === first.value.sourceId,
    ),
  );
  assert.equal(
    (await f.request(`${f.list()}&after=another-course`)).status,
    400,
  );
});

test("a concurrent allocation change rejects an inquiry write before it can widen access", async (t) => {
  const f = await fixture(t);
  await f.attempt();
  const save = f.stores.store.save.bind(f.stores.store);
  f.stores.store.save = async (record, expected, reason, guard) => {
    if (record.kind === "inquiry-thread")
      await f.update((course) => {
        course.phases.establish.groups[0]!.members = [bob.id, carol.id];
      });
    return save(record, expected, reason, guard);
  };
  assert.equal(
    (
      await f.request("", "POST", {
        source,
        question: "reading",
        audience: { kind: "group", phase: "establish", group: "group-a" },
        kind: "question",
        body: "A stale allocation must not accept this",
      })
    ).status,
    409,
  );
  assert.equal((await f.stores.store.list(f.id, "inquiry-thread")).length, 0);
});
