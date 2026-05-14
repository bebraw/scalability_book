import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const dataDir = path.join(root, ".local");
const commentsPath = path.join(dataDir, "comments.json");
const wranglerBin = path.join(root, "node_modules", ".bin", "wrangler");
const command = process.argv[2];
const namespaceId =
  readOption("--namespace-id") || process.env.COMMENTS_KV_NAMESPACE_ID;
const binding =
  readOption("--binding") || process.env.COMMENTS_KV_BINDING || "COMMENTS_KV";

if (!["pull", "push", "sync"].includes(command)) {
  console.error(
    "Usage: npm run comments:pull|comments:push|comments:sync -- --namespace-id <kv namespace id>",
  );
  process.exit(1);
}

if (command === "pull") {
  await pullComments();
} else if (command === "push") {
  await pushModerationState();
} else {
  await pushModerationState();
  await pullComments();
}

async function pullComments() {
  const remote = await readRemoteComments();

  await saveLocalComments(remote);
  console.log(
    `Pulled ${countComments(remote)} comments into ${toPosix(path.relative(root, commentsPath))}.`,
  );
}

async function pushModerationState() {
  const local = await loadLocalComments();
  const remote = await readRemoteComments();
  let updated = 0;

  for (const [chapter, localComments] of Object.entries(local)) {
    const remoteComments = remote[chapter] || [];
    const localById = new Map(
      localComments.map((comment) => [comment.id, comment]),
    );
    let chapterChanged = false;

    for (const remoteComment of remoteComments) {
      const localComment = localById.get(remoteComment.id);

      if (!localComment) {
        continue;
      }

      const fields = [
        "type",
        "resolvedAt",
        "resolvedBy",
        "resolutionReason",
        "category",
        "hiddenAt",
        "hiddenBy",
        "featuredAt",
        "featuredBy",
        "featuredText",
        "replies",
      ];

      for (const field of fields) {
        if (
          JSON.stringify(remoteComment[field] ?? null) ===
          JSON.stringify(localComment[field] ?? null)
        ) {
          continue;
        }

        remoteComment[field] = localComment[field] ?? null;
        chapterChanged = true;
        updated++;
      }
    }

    if (chapterChanged) {
      await writeRemoteChapter(chapter, remoteComments);
    }
  }

  console.log(
    `Pushed ${updated} moderation update${updated === 1 ? "" : "s"} to KV.`,
  );
}

async function readRemoteComments() {
  const keys = await listRemoteKeys();
  const comments = {};

  for (const key of keys) {
    const chapter = key.name.replace(/^comments:/, "");
    const value = await wrangler(["kv", "key", "get", key.name, "--text"]);
    const chapterComments = JSON.parse(value || "[]");

    if (Array.isArray(chapterComments)) {
      comments[chapter] = chapterComments;
    }
  }

  return comments;
}

async function listRemoteKeys() {
  const output = await wrangler(["kv", "key", "list", "--prefix", "comments:"]);
  const keys = JSON.parse(output || "[]");

  return Array.isArray(keys) ? keys : [];
}

async function writeRemoteChapter(chapter, comments) {
  const tempPath = path.join(dataDir, `comments-${chapter}.json`);

  await mkdir(dataDir, { recursive: true });
  await writeFile(tempPath, JSON.stringify(comments), "utf8");
  await wrangler([
    "kv",
    "key",
    "put",
    `comments:${chapter}`,
    "--path",
    tempPath,
  ]);
}

async function loadLocalComments() {
  try {
    return JSON.parse(await readFile(commentsPath, "utf8"));
  } catch {
    return {};
  }
}

async function saveLocalComments(comments) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(commentsPath, JSON.stringify(comments, null, 2), "utf8");
}

async function wrangler(args) {
  const namespaceArgs = namespaceId
    ? ["--namespace-id", namespaceId]
    : ["--binding", binding];
  const { stdout } = await execFileAsync(
    wranglerBin,
    [...args, ...namespaceArgs, "--remote"],
    {
      cwd: root,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return stdout.trim();
}

function readOption(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
}

function countComments(comments) {
  return Object.values(comments).reduce(
    (total, chapter) => total + chapter.length,
    0,
  );
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
