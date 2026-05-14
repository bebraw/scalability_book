import { assetManifest } from "./generated/asset-manifest";

type Env = {
  ASSETS: Fetcher;
  COMMENTS_KV?: KVNamespace;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_GITHUB_LOGINS?: string;
};

const immutableAssetPattern =
  /\.(?:css|js|mjs|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$/i;
const sessionCookie = "scalableweb_session";
const oauthStateCookie = "scalableweb_oauth_state";
const feedbackCategories = new Set([
  "unclear-concept",
  "missing-example",
  "too-fast",
  "typo-language",
  "disagreement",
  "broken-link-code",
  "stuck",
  "reflection",
]);
const resolutionReasons = new Set([
  "fixed",
  "answered",
  "duplicate",
  "not-actionable",
  "planned",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__worker/health") {
      return Response.json({
        ok: true,
        assets: assetManifest.length,
      });
    }

    if (url.pathname.startsWith("/api/auth/")) {
      return handleAuthRequest(request, env, url);
    }

    if (url.pathname === "/api/comments") {
      return handleCommentsRequest(request, env, url);
    }

    if (url.pathname === "/api/stuck") {
      return handleStuckRequest(request, env);
    }

    const resolveMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/resolve$/,
    );

    if (resolveMatch) {
      return handleResolveRequest(request, env, resolveMatch[1]);
    }

    const hideMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/hide$/);

    if (hideMatch) {
      return handleHideRequest(request, env, hideMatch[1]);
    }

    const replyMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/replies$/,
    );

    if (replyMatch) {
      return handleReplyRequest(request, env, replyMatch[1]);
    }

    const featureMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/feature$/,
    );

    if (featureMatch) {
      return handleFeatureRequest(request, env, featureMatch[1]);
    }

    const unfeatureMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/unfeature$/,
    );

    if (unfeatureMatch) {
      return handleUnfeatureRequest(request, env, unfeatureMatch[1]);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    if (response.ok && immutableAssetPattern.test(url.pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (
      response.ok &&
      response.headers.get("content-type")?.includes("text/html")
    ) {
      headers.set("Cache-Control", "public, max-age=300");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

async function handleAuthRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (url.pathname === "/api/auth/status") {
    const user = await getSessionUser(request, env);
    const available = oauthConfigured(env);

    return json({
      available,
      authenticated: Boolean(user),
      admin: Boolean(user && isAdmin(user.login, env)),
      local: false,
      user,
      loginUrl: available ? "/api/auth/github/start" : null,
    });
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": expireCookie(sessionCookie),
        },
      },
    );
  }

  if (url.pathname === "/api/auth/github/start") {
    if (!oauthConfigured(env)) {
      return json(
        { message: "GitHub OAuth is not configured" },
        { status: 503 },
      );
    }

    const state = crypto.randomUUID();
    const redirect = new URL("https://github.com/login/oauth/authorize");
    redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID || "");
    redirect.searchParams.set(
      "redirect_uri",
      `${url.origin}/api/auth/github/callback`,
    );
    redirect.searchParams.set("scope", "read:user");
    redirect.searchParams.set("state", state);

    return redirectResponse(redirect.toString(), {
      "Set-Cookie": buildCookie(oauthStateCookie, state, { maxAge: 600 }),
    });
  }

  if (url.pathname === "/api/auth/github/callback") {
    if (!oauthConfigured(env)) {
      return json(
        { message: "GitHub OAuth is not configured" },
        { status: 503 },
      );
    }

    const expectedState = getCookie(request, oauthStateCookie);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");

    if (!state || !code || state !== expectedState) {
      return json({ message: "Invalid OAuth state" }, { status: 400 });
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "scalability-book",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/api/auth/github/callback`,
        }),
      },
    );
    const tokenData = (await tokenResponse.json()) as { access_token?: string };

    if (!tokenData.access_token) {
      return json(
        { message: "GitHub OAuth token exchange failed" },
        { status: 400 },
      );
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "scalability-book",
      },
    });
    const githubUser = (await userResponse.json()) as {
      login?: string;
      avatar_url?: string;
      html_url?: string;
    };

    if (!githubUser.login) {
      return json({ message: "Unable to read GitHub user" }, { status: 400 });
    }

    const user = {
      login: githubUser.login,
      avatarUrl: githubUser.avatar_url || null,
      url: githubUser.html_url || null,
    };
    const session = await signSession(user, env);

    const headers = new Headers({ Location: "/" });
    headers.append(
      "Set-Cookie",
      buildCookie(sessionCookie, session, { maxAge: 60 * 60 * 24 * 30 }),
    );
    headers.append("Set-Cookie", expireCookie(oauthStateCookie));

    return new Response(null, { status: 302, headers });
  }

  return json({ message: "Not found" }, { status: 404 });
}

async function handleCommentsRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  if (request.method === "GET") {
    const user = await getSessionUser(request, env);
    const chapter = url.searchParams.get("chapter");

    if (!isValidSlug(chapter)) {
      return json(
        { message: "Expected chapter query parameter" },
        { status: 400 },
      );
    }

    return json(
      visibleCommentsForUser(
        await getChapterComments(env, chapter),
        user,
        Boolean(user && isAdmin(user.login, env)),
      ),
    );
  }

  if (request.method === "POST") {
    const user = await getSessionUser(request, env);

    if (!user) {
      return json(
        { message: "Sign in with GitHub to comment" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      chapter?: string;
      paragraphId?: string;
      category?: string;
      anonymous?: boolean;
      body?: string;
    };

    if (
      !isValidSlug(body.chapter) ||
      !isValidParagraphId(body.paragraphId) ||
      !isValidFeedbackCategory(body.category)
    ) {
      return json({ message: "Invalid comment target" }, { status: 400 });
    }

    const text = body.body?.trim();

    if (!text || text.length > 4000) {
      return json(
        { message: "Comment must be 1-4000 characters" },
        { status: 400 },
      );
    }

    const comments = await getChapterComments(env, body.chapter);
    const comment = {
      id: crypto.randomUUID(),
      chapter: body.chapter,
      paragraphId: body.paragraphId,
      category: body.category,
      anonymous: body.anonymous === true,
      body: text,
      author: user,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionReason: null,
      hiddenAt: null,
      hiddenBy: null,
      featuredAt: null,
      featuredBy: null,
      featuredText: null,
      replies: [],
    };

    comments.push(comment);
    await putChapterComments(env, body.chapter, comments);

    return json(comment, { status: 201 });
  }

  return methodNotAllowed("GET, POST");
}

async function handleStuckRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user) {
    return json(
      { message: "Sign in with GitHub to mark confusion" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    chapter?: string;
    paragraphId?: string;
  };

  if (!isValidSlug(body.chapter) || !isValidParagraphId(body.paragraphId)) {
    return json({ message: "Invalid feedback target" }, { status: 400 });
  }

  const comments = await getChapterComments(env, body.chapter);
  const marker = {
    id: crypto.randomUUID(),
    type: "stuck",
    chapter: body.chapter,
    paragraphId: body.paragraphId,
    category: "stuck",
    body: "I'm stuck here.",
    author: user,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionReason: null,
    hiddenAt: null,
    hiddenBy: null,
    featuredAt: null,
    featuredBy: null,
    featuredText: null,
    replies: [],
  };

  comments.push(marker);
  await putChapterComments(env, body.chapter, comments);

  return json(marker, { status: 201 });
}

async function handleResolveRequest(
  request: Request,
  env: Env,
  encodedId: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user || !isAdmin(user.login, env)) {
    return json(
      { message: "Only the book owner can resolve comments" },
      { status: 403 },
    );
  }

  const id = decodeURIComponent(encodedId);
  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  if (!isValidResolutionReason(body.reason)) {
    return json({ message: "Invalid resolution reason" }, { status: 400 });
  }

  const chapterKeys = await env.COMMENTS_KV.list({ prefix: "comments:" });

  for (const key of chapterKeys.keys) {
    const chapter = key.name.replace(/^comments:/, "");
    const comments = await getChapterComments(env, chapter);
    const comment = comments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    comment.resolvedAt = new Date().toISOString();
    comment.resolvedBy = user.login;
    comment.resolutionReason = body.reason;
    await putChapterComments(env, chapter, comments);

    return json(comment);
  }

  return json({ message: "Unknown comment" }, { status: 404 });
}

async function handleHideRequest(
  request: Request,
  env: Env,
  encodedId: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user || !isAdmin(user.login, env)) {
    return json(
      { message: "Only the book owner can hide comments" },
      { status: 403 },
    );
  }

  const id = decodeURIComponent(encodedId);
  const chapterKeys = await env.COMMENTS_KV.list({ prefix: "comments:" });

  for (const key of chapterKeys.keys) {
    const chapter = key.name.replace(/^comments:/, "");
    const comments = await getChapterComments(env, chapter);
    const comment = comments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    comment.hiddenAt = new Date().toISOString();
    comment.hiddenBy = user.login;
    await putChapterComments(env, chapter, comments);

    return json(comment);
  }

  return json({ message: "Unknown comment" }, { status: 404 });
}

async function handleReplyRequest(
  request: Request,
  env: Env,
  encodedId: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user || !isAdmin(user.login, env)) {
    return json(
      { message: "Only the book owner can reply to comments" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = body.body?.trim();

  if (!text || text.length > 4000) {
    return json(
      { message: "Reply must be 1-4000 characters" },
      { status: 400 },
    );
  }

  const updated = await mutateComment(env, encodedId, (comment) => {
    comment.replies = Array.isArray(comment.replies) ? comment.replies : [];
    comment.replies.push({
      id: crypto.randomUUID(),
      body: text,
      author: user,
      createdAt: new Date().toISOString(),
    });
  });

  return updated || json({ message: "Unknown comment" }, { status: 404 });
}

async function handleFeatureRequest(
  request: Request,
  env: Env,
  encodedId: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user || !isAdmin(user.login, env)) {
    return json(
      { message: "Only the book owner can feature comments" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    featuredText?: string;
  };
  const text = body.featuredText?.trim();

  if (!text || text.length > 4000) {
    return json(
      { message: "Featured note must be 1-4000 characters" },
      { status: 400 },
    );
  }

  const updated = await mutateComment(env, encodedId, (comment) => {
    comment.featuredAt = new Date().toISOString();
    comment.featuredBy = user.login;
    comment.featuredText = text;
  });

  return updated || json({ message: "Unknown comment" }, { status: 404 });
}

async function handleUnfeatureRequest(
  request: Request,
  env: Env,
  encodedId: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!env.COMMENTS_KV) {
    return json(
      { message: "Comments storage is not configured" },
      { status: 503 },
    );
  }

  const user = await getSessionUser(request, env);

  if (!user || !isAdmin(user.login, env)) {
    return json(
      { message: "Only the book owner can unfeature comments" },
      { status: 403 },
    );
  }

  const updated = await mutateComment(env, encodedId, (comment) => {
    comment.featuredAt = null;
    comment.featuredBy = null;
    comment.featuredText = null;
  });

  return updated || json({ message: "Unknown comment" }, { status: 404 });
}

async function getChapterComments(env: Env, chapter: string) {
  const stored = await env.COMMENTS_KV?.get(`comments:${chapter}`, "json");

  return Array.isArray(stored) ? stored : [];
}

async function mutateComment(
  env: Env,
  encodedId: string,
  update: (comment: any) => void,
) {
  const id = decodeURIComponent(encodedId);
  const chapterKeys = await env.COMMENTS_KV?.list({ prefix: "comments:" });

  for (const key of chapterKeys?.keys || []) {
    const chapter = key.name.replace(/^comments:/, "");
    const comments = await getChapterComments(env, chapter);
    const comment = comments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    update(comment);
    await putChapterComments(env, chapter, comments);

    return json(comment);
  }

  return null;
}

function visibleCommentsForUser(
  comments: any[],
  user: { login: string } | null,
  admin: boolean,
) {
  if (admin) {
    return comments;
  }

  const featured = comments
    .filter((comment) => comment.featuredAt && !comment.hiddenAt)
    .map((comment) => ({
      id: `featured-${comment.id}`,
      sourceId: comment.id,
      chapter: comment.chapter,
      paragraphId: comment.paragraphId,
      body: comment.featuredText,
      author: { login: "Reader note", avatarUrl: null, url: null },
      createdAt: comment.featuredAt,
      featuredAt: comment.featuredAt,
      publicNote: true,
      replies: [],
    }));

  if (!user) {
    return featured;
  }

  const own = comments.filter(
    (comment) => !comment.hiddenAt && comment.author?.login === user.login,
  );

  const ownIds = new Set(own.map((comment) => comment.id));

  return [
    ...own,
    ...featured.filter((comment) => !ownIds.has(comment.sourceId)),
  ];
}

async function putChapterComments(
  env: Env,
  chapter: string,
  comments: unknown[],
) {
  await env.COMMENTS_KV?.put(`comments:${chapter}`, JSON.stringify(comments));
}

async function getSessionUser(request: Request, env: Env) {
  const session = getCookie(request, sessionCookie);

  if (!session || !env.SESSION_SECRET) {
    return null;
  }

  const [payload, signature] = session.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = await hmac(payload, env.SESSION_SECRET);

  if (signature !== expected) {
    return null;
  }

  let data: {
    exp: number;
    user: { login: string; avatarUrl: string | null; url: string | null };
  };

  try {
    data = JSON.parse(atobUrl(payload));
  } catch {
    return null;
  }

  if (data.exp < Date.now()) {
    return null;
  }

  return data.user;
}

async function signSession(user: unknown, env: Env) {
  const payload = btoaUrl(
    JSON.stringify({
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
      user,
    }),
  );

  return `${payload}.${await hmac(payload, env.SESSION_SECRET || "")}`;
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return btoaUrl(String.fromCharCode(...new Uint8Array(signature)));
}

function oauthConfigured(env: Env) {
  return Boolean(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET,
  );
}

function isAdmin(login: string, env: Env) {
  return (env.ADMIN_GITHUB_LOGINS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(login.toLowerCase());
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}

function isValidParagraphId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^p-[a-z0-9-]+$/.test(value) || value === "p-chapter-reflection")
  );
}

function isValidFeedbackCategory(value: unknown): value is string {
  return typeof value === "string" && feedbackCategories.has(value);
}

function isValidResolutionReason(value: unknown): value is string {
  return typeof value === "string" && resolutionReasons.has(value);
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|; )${name}=([^;]+)`));

  return match ? decodeURIComponent(match[1]) : null;
}

function buildCookie(
  name: string,
  value: string,
  { maxAge }: { maxAge: number },
) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function expireCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function redirectResponse(location: string, headers: HeadersInit = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      ...headers,
    },
  });
}

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function methodNotAllowed(allow: string) {
  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: allow },
  });
}

function btoaUrl(value: string) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function atobUrl(value: string) {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );

  return atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
}
