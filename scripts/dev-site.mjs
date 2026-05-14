import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const buildDir = path.join(root, "build");
const dataDir = path.join(root, ".local");
const commentsPath = path.join(dataDir, "comments.json");
const config = parseJsonc(
  await readFile(path.join(root, "site.config.jsonc"), "utf8"),
);
const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);
const feedbackCategories = new Set([
  "unclear-concept",
  "missing-example",
  "too-fast",
  "typo-language",
  "disagreement",
  "broken-link-code",
]);
const resolutionReasons = new Set([
  "fixed",
  "answered",
  "duplicate",
  "not-actionable",
  "planned",
]);

let chapters = await loadChapters();
await rebuildSite();

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (url.pathname === "/api/editor/status") {
      return sendJson(response, { editable: true });
    }

    if (url.pathname === "/api/auth/status") {
      return sendJson(response, {
        available: true,
        authenticated: true,
        admin: true,
        local: true,
        user: { login: "local-editor", avatarUrl: null, url: null },
        loginUrl: null,
      });
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return sendJson(response, { ok: true });
    }

    if (url.pathname === "/api/comments") {
      return handleCommentsRequest(request, response, url);
    }

    const resolveMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/resolve$/,
    );

    if (resolveMatch) {
      return handleResolveRequest(request, response, resolveMatch[1]);
    }

    const hideMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/hide$/);

    if (hideMatch) {
      return handleHideRequest(request, response, hideMatch[1]);
    }

    const replyMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/replies$/,
    );

    if (replyMatch) {
      return handleReplyRequest(request, response, replyMatch[1]);
    }

    const featureMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/feature$/,
    );

    if (featureMatch) {
      return handleFeatureRequest(request, response, featureMatch[1]);
    }

    const unfeatureMatch = url.pathname.match(
      /^\/api\/comments\/([^/]+)\/unfeature$/,
    );

    if (unfeatureMatch) {
      return handleUnfeatureRequest(request, response, unfeatureMatch[1]);
    }

    if (url.pathname.startsWith("/api/chapters/")) {
      return handleChapterRequest(request, response, url);
    }

    return serveStatic(response, url);
  } catch (error) {
    console.error(error);
    return sendJson(response, { message: "Internal server error" }, 500);
  }
}).listen(port, host, () => {
  console.log(`Serving editable book site at http://${host}:${port}`);
});

async function handleCommentsRequest(request, response, url) {
  if (request.method === "GET") {
    const chapter = url.searchParams.get("chapter");

    if (!isValidSlug(chapter)) {
      return sendJson(
        response,
        { message: "Expected chapter query parameter" },
        400,
      );
    }

    const comments = await loadComments();

    return sendJson(response, comments[chapter] || []);
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);

    if (
      !isValidSlug(body.chapter) ||
      !isValidParagraphId(body.paragraphId) ||
      !feedbackCategories.has(body.category)
    ) {
      return sendJson(response, { message: "Invalid comment target" }, 400);
    }

    const text = body.body?.trim();

    if (!text || text.length > 4000) {
      return sendJson(
        response,
        { message: "Comment must be 1-4000 characters" },
        400,
      );
    }

    const comments = await loadComments();
    const chapterComments = comments[body.chapter] || [];
    const comment = {
      id: crypto.randomUUID(),
      chapter: body.chapter,
      paragraphId: body.paragraphId,
      category: body.category,
      body: text,
      author: { login: "local-editor", avatarUrl: null, url: null },
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

    chapterComments.push(comment);
    comments[body.chapter] = chapterComments;
    await saveComments(comments);

    return sendJson(response, comment, 201);
  }

  response.writeHead(405, { Allow: "GET, POST" });
  return response.end("Method not allowed");
}

async function handleResolveRequest(request, response, encodedId) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    return response.end("Method not allowed");
  }

  const id = decodeURIComponent(encodedId);
  const body = await readJsonBody(request);

  if (!resolutionReasons.has(body.reason)) {
    return sendJson(response, { message: "Invalid resolution reason" }, 400);
  }

  const comments = await loadComments();

  for (const chapterComments of Object.values(comments)) {
    const comment = chapterComments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    comment.resolvedAt = new Date().toISOString();
    comment.resolvedBy = "local-editor";
    comment.resolutionReason = body.reason;
    await saveComments(comments);

    return sendJson(response, comment);
  }

  return sendJson(response, { message: "Unknown comment" }, 404);
}

async function handleHideRequest(request, response, encodedId) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    return response.end("Method not allowed");
  }

  const id = decodeURIComponent(encodedId);
  const comments = await loadComments();

  for (const chapterComments of Object.values(comments)) {
    const comment = chapterComments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    comment.hiddenAt = new Date().toISOString();
    comment.hiddenBy = "local-editor";
    await saveComments(comments);

    return sendJson(response, comment);
  }

  return sendJson(response, { message: "Unknown comment" }, 404);
}

async function handleReplyRequest(request, response, encodedId) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    return response.end("Method not allowed");
  }

  const body = await readJsonBody(request);
  const text = body.body?.trim();

  if (!text || text.length > 4000) {
    return sendJson(
      response,
      { message: "Reply must be 1-4000 characters" },
      400,
    );
  }

  return mutateComment(response, encodedId, (comment) => {
    comment.replies = Array.isArray(comment.replies) ? comment.replies : [];
    comment.replies.push({
      id: crypto.randomUUID(),
      body: text,
      author: { login: "local-editor", avatarUrl: null, url: null },
      createdAt: new Date().toISOString(),
    });
  });
}

async function handleFeatureRequest(request, response, encodedId) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    return response.end("Method not allowed");
  }

  const body = await readJsonBody(request);
  const text = body.featuredText?.trim();

  if (!text || text.length > 4000) {
    return sendJson(
      response,
      { message: "Featured note must be 1-4000 characters" },
      400,
    );
  }

  return mutateComment(response, encodedId, (comment) => {
    comment.featuredAt = new Date().toISOString();
    comment.featuredBy = "local-editor";
    comment.featuredText = text;
  });
}

async function handleUnfeatureRequest(request, response, encodedId) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    return response.end("Method not allowed");
  }

  return mutateComment(response, encodedId, (comment) => {
    comment.featuredAt = null;
    comment.featuredBy = null;
    comment.featuredText = null;
  });
}

async function mutateComment(response, encodedId, update) {
  const id = decodeURIComponent(encodedId);
  const comments = await loadComments();

  for (const chapterComments of Object.values(comments)) {
    const comment = chapterComments.find((item) => item.id === id);

    if (!comment) {
      continue;
    }

    update(comment);
    await saveComments(comments);

    return sendJson(response, comment);
  }

  return sendJson(response, { message: "Unknown comment" }, 404);
}

async function handleChapterRequest(request, response, url) {
  const slug = decodeURIComponent(url.pathname.replace("/api/chapters/", ""));
  const chapter = chapters.find((item) => item.slug === slug);

  if (!chapter) {
    return sendJson(response, { message: "Unknown chapter" }, 404);
  }

  if (request.method === "GET") {
    const content = await readFile(chapter.absolutePath, "utf8");

    return sendJson(response, { file: chapter.file, content });
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);

    if (typeof body.content !== "string") {
      return sendJson(response, { message: "Expected content string" }, 400);
    }

    await writeFile(chapter.absolutePath, body.content, "utf8");
    chapters = await loadChapters();
    await rebuildSite();

    return sendJson(response, { ok: true, file: chapter.file });
  }

  response.writeHead(405, { Allow: "GET, POST" });
  return response.end("Method not allowed");
}

async function serveStatic(response, url) {
  const pathname = decodeURIComponent(url.pathname);
  const resolved = path.normalize(path.join(buildDir, pathname));

  if (!resolved.startsWith(buildDir)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  const file = await findFile(resolved);

  if (!file) {
    response.writeHead(404);
    return response.end("Not found");
  }

  response.writeHead(200, {
    "Content-Type":
      contentTypes.get(path.extname(file)) || "application/octet-stream",
  });
  return createReadStream(file).pipe(response);
}

async function findFile(resolved) {
  try {
    const info = await stat(resolved);

    if (info.isDirectory()) {
      return findFile(path.join(resolved, "index.html"));
    }

    return resolved;
  } catch {
    return null;
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 2_000_000) {
      throw new Error("Request body too large");
    }
  }

  return JSON.parse(body || "{}");
}

async function loadComments() {
  try {
    return JSON.parse(await readFile(commentsPath, "utf8"));
  } catch {
    return {};
  }
}

async function saveComments(comments) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(commentsPath, JSON.stringify(comments, null, 2), "utf8");
}

async function loadChapters() {
  const chapterFiles = getAllConfiguredContentFiles(config);

  return chapterFiles.map((file, index) => {
    const absolutePath = path.resolve(root, file);

    if (!absolutePath.startsWith(root)) {
      throw new Error(`Chapter path escapes project root: ${file}`);
    }

    return {
      file,
      absolutePath,
      slug: getSlug(file, index),
    };
  });
}

async function rebuildSite() {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/build-site.mjs", "--all-chapters"],
      {
        cwd: root,
        stdio: "inherit",
      },
    );

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code}`));
    });
  });
}

function getAllConfiguredContentFiles(config) {
  const files = [...(config.chapters || [])];

  for (const part of config.parts || []) {
    if (part.file) {
      files.push(part.file);
    }

    files.push(...(part.chapters || []));
  }

  return [...new Set(files)];
}

function getSlug(file, index) {
  const chapterNumber = path.basename(file).match(/^(\d+)_/)?.[1];

  if (chapterNumber === "00" && index === 0) {
    return "introduction";
  }

  return path.basename(file, ".md").replace(/^\d+_/, "").replaceAll("_", "-");
}

function parseJsonc(source) {
  return JSON.parse(stripTrailingCommas(stripJsonComments(source)));
}

function stripJsonComments(source) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        index++;
      }
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;

      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index++;
      }

      index++;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(source) {
  return source.replace(/,\s*([}\]])/g, "$1");
}

function isValidSlug(value) {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}

function isValidParagraphId(value) {
  return typeof value === "string" && /^p-[a-z0-9-]+$/.test(value);
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}
