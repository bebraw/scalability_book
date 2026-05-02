import { createReadStream } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const buildDir = path.join(root, "build");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

let chapters = await loadChapters();
await rebuildSite();

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (url.pathname === "/api/editor/status") {
      return sendJson(response, { editable: true });
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

async function loadChapters() {
  const chapterFiles = await getAllChapterFiles();

  return chapterFiles.map((file, index) => {
    const absolutePath = path.resolve(root, file);

    if (!absolutePath.startsWith(root)) {
      throw new Error(`Chapter path escapes project root: ${file}`);
    }

    return {
      file,
      absolutePath,
      slug:
        index === 0
          ? "introduction"
          : path
              .basename(file, ".md")
              .replace(/^\d+_/, "")
              .replaceAll("_", "-"),
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

async function getAllChapterFiles() {
  const entries = await readdir(path.join(root, "chapters"));

  return entries
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((entry) => `chapters/${entry}`);
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}
