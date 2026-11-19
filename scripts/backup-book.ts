import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  feedbackResolutionMetadata,
  feedbackResolutionPrefix,
} from "../shared/feedback-resolution.ts";
import { parseJsonc } from "./lib/text.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = path.join(root, ".local");
const stateDirectory =
  process.platform === "darwin"
    ? path.join(homedir(), "Library/Application Support")
    : path.join(homedir(), ".local/state");
const output = path.join(stateDirectory, "scalableweb-book", "backups");
const bucket = "scalability-book-backups";
const jurisdiction = "eu";
const day = 24 * 60 * 60 * 1000;
const wrangler = path.join(root, "node_modules/.bin/wrangler");
const exec = promisify(execFile);
const archiveExclusions = [
  ".git",
  "node_modules",
  ".venv",
  ".cache",
  "npm-pack-cache",
  "runtimes",
  ".env",
  ".env.*",
  ".dev.vars",
  ".dev.vars.*",
  "auth.json",
  "id_ed25519",
  "id_rsa",
  "*.pem",
  "*.p12",
  "*.key",
  "course-preparation/reference/.data",
];
const feedbackFile = "production-feedback.kv.json";
const learningFile = "production-learning.sql";
const artifactManifest = "manifest.json";
const longLivedPrefixes = ["comments:", feedbackResolutionPrefix];

type Binding = {
  name: string;
  type: string;
  namespace_id?: string;
  id?: string;
  database_id?: string;
};
type KvKey = { name: string; metadata?: object; expiration?: number };
type KvRecord = { key: string; value: string; metadata?: object };
type Artifacts = Record<string, { bytes: number; sha256: string }>;
const learningTables = {
  d1_migrations: ["id", "name", "applied_at"],
  learning_answers: [
    "user_id",
    "exercise_id",
    "version",
    "answer",
    "completed",
    "revision",
    "updated_at",
    "prompt",
  ],
  sqlite_sequence: ["name", "seq"],
} as const;

async function run(file: string, args: string[], logDirectory?: string) {
  try {
    const { stdout } = await exec(file, args, {
      cwd: root,
      maxBuffer: 32 * 1024 * 1024,
      ...(logDirectory
        ? {
            env: {
              ...process.env,
              WRANGLER_SEND_METRICS: "false",
              WRANGLER_LOG_PATH: path.join(logDirectory, "wrangler.log"),
            },
          }
        : {}),
    });
    return stdout;
  } catch {
    // A command may have read private records, so never echo its output here.
    const tool =
      file === wrangler
        ? `Wrangler ${args.slice(0, 3).join(" ")}`
        : path.basename(file);
    throw new Error(`${tool} failed during the backup.`);
  }
}

async function writeJson(file: string, data: unknown) {
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
}

function parseSnapshotJson<T>(body: string, label: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`The ${label} is not valid JSON.`);
  }
}

async function existing(source: string, kind: "file" | "directory") {
  try {
    const entry = await lstat(source);
    if (kind === "file" ? !entry.isFile() : !entry.isDirectory()) {
      throw new Error(`Expected a regular ${kind} at ${source}.`);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function captureProduction(destination: string, scratch: string) {
  const cloud = (args: string[]) => run(wrangler, args, scratch);
  const deployment = JSON.parse(
    await cloud(["deployments", "status", "--json"]),
  ) as {
    id: string;
    versions: { version_id: string }[];
  };
  const [active] = deployment.versions;
  if (!active || deployment.versions.length !== 1) {
    throw new Error(
      "Confirm the active production storage when traffic is split across Worker versions.",
    );
  }
  const version = JSON.parse(
    await cloud(["versions", "view", active.version_id, "--json"]),
  ) as {
    resources: { bindings: Binding[] };
  };
  const bindings = version.resources.bindings;
  const stores = bindings.filter(({ type }) =>
    ["d1", "kv_namespace", "r2_bucket", "durable_object_namespace"].includes(
      type,
    ),
  );
  if (
    stores
      .map(({ name }) => name)
      .sort()
      .join(",") !== "COMMENTS_KV,LEARNING_DB"
  ) {
    throw new Error(
      "The deployed data bindings changed. Update the backup coverage before taking a new snapshot.",
    );
  }
  const feedback = stores.find(({ name }) => name === "COMMENTS_KV");
  const learning = stores.find(({ name }) => name === "LEARNING_DB");
  const learningId = learning?.database_id ?? learning?.id;
  if (!feedback?.namespace_id || !learningId) {
    throw new Error(
      "Could not identify the active feedback namespace and exercise database.",
    );
  }
  const config = parseJsonc(
    await readFile(path.join(root, "wrangler.jsonc"), "utf8"),
  ) as {
    d1_databases?: { binding: string; database_id: string }[];
  };
  if (
    !config.d1_databases?.some(
      ({ binding, database_id }) =>
        binding === "LEARNING_DB" && database_id === learningId,
    )
  ) {
    throw new Error(
      "The local exercise binding points to a different database than the live Worker.",
    );
  }

  const keys = (
    await Promise.all(
      longLivedPrefixes.map(
        async (prefix) =>
          JSON.parse(
            await cloud([
              "kv",
              "key",
              "list",
              "--namespace-id",
              feedback.namespace_id!,
              "--prefix",
              prefix,
              "--remote",
            ]),
          ) as KvKey[],
      ),
    )
  ).flat();
  const records: KvRecord[] = [];
  for (const key of keys) {
    if (key.expiration !== undefined) {
      throw new Error(
        "A persistent feedback key unexpectedly has an expiration.",
      );
    }
    const value = await cloud([
      "kv",
      "key",
      "get",
      key.name,
      "--namespace-id",
      feedback.namespace_id,
      "--remote",
    ]);
    records.push({
      key: key.name,
      value,
      ...(key.metadata ? { metadata: key.metadata } : {}),
    });
  }
  await writeJson(path.join(destination, feedbackFile), records);
  await captureLearningAnswers(cloud, path.join(destination, learningFile));
  const recovery = JSON.parse(
    await cloud(["d1", "time-travel", "info", "LEARNING_DB", "--json"]),
  ) as { bookmark?: string };
  if (!recovery.bookmark)
    throw new Error("D1 did not provide a recovery bookmark.");

  return {
    deployment: deployment.id,
    version: active.version_id,
    feedbackNamespace: feedback.namespace_id,
    learningDatabase: learningId,
    learningBookmark: recovery.bookmark,
    secretNames: bindings
      .filter(({ type }) => type === "secret_text")
      .map(({ name }) => name)
      .sort(),
  };
}

async function captureLearningAnswers(
  cloud: (args: string[]) => Promise<string>,
  target: string,
) {
  // Wrangler's full export may interrupt live queries. These rows and their
  // schema come from one SQLite read statement instead.
  const query = [
    "SELECT 'schema' AS kind, name AS subject, sql AS content FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT IN ('_cf_KV', 'sqlite_sequence')",
    ...Object.entries(learningTables).map(
      ([name, fields]) =>
        `SELECT 'row', '${name}', json_array(${fields.join(", ")}) FROM ${name}${
          name === "sqlite_sequence" ? " WHERE name = 'd1_migrations'" : ""
        }`,
    ),
  ].join(" UNION ALL ");
  const [result] = parseSnapshotJson<
    {
      success: boolean;
      results: { kind: "schema" | "row"; subject: string; content: string }[];
    }[]
  >(
    await cloud([
      "d1",
      "execute",
      "LEARNING_DB",
      "--remote",
      "--json",
      "--command",
      query,
    ]),
    "exercise snapshot response",
  );
  const schema = result?.results.filter(({ kind }) => kind === "schema");
  if (
    !result?.success ||
    schema
      ?.map(({ subject }) => subject)
      .sort()
      .join(",") !== "d1_migrations,learning_answers"
  ) {
    throw new Error(
      "The live exercise database schema changed. Update the backup coverage before continuing.",
    );
  }
  const statements = schema.map(({ content }) => content + ";");
  for (const [table, fields] of Object.entries(learningTables)) {
    if (table === "sqlite_sequence")
      statements.push("DELETE FROM sqlite_sequence;");
    for (const row of result.results.filter(
      ({ kind, subject }) => kind === "row" && subject === table,
    )) {
      const values = parseSnapshotJson<unknown[]>(row.content, "exercise row");
      if (!Array.isArray(values) || values.length !== fields.length) {
        throw new Error("An exercise row has an unexpected shape.");
      }
      statements.push(
        `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${values.map(sqliteLiteral).join(", ")});`,
      );
    }
  }
  await writeFile(target, statements.join("\n") + "\n", { flag: "wx" });
}

function sqliteLiteral(value: unknown) {
  if (typeof value === "string")
    return `CAST(X'${Buffer.from(value).toString("hex")}' AS TEXT)`;
  if (typeof value === "number" && Number.isSafeInteger(value))
    return String(value);
  if (value === null) return "NULL";
  throw new Error("An exercise row contains an unsupported value.");
}

async function saveSQLite(source: string, target: string) {
  const database = new DatabaseSync(source, {
    readOnly: true,
    timeout: 10_000,
  });
  try {
    await backup(database, target);
  } finally {
    database.close();
  }
  const copy = new DatabaseSync(target);
  try {
    copy.exec("PRAGMA journal_mode = DELETE");
  } finally {
    copy.close();
  }
}

async function archive(
  source: string,
  target: string,
  exclusions = archiveExclusions,
) {
  if (!(await existing(source, "directory"))) return;
  await run("tar", [
    ...exclusions.map((pattern) => `--exclude=${pattern}`),
    "-czf",
    target,
    "-C",
    path.dirname(source),
    path.basename(source),
  ]);
}

async function captureLocal(destination: string) {
  await run("git", [
    "bundle",
    "create",
    path.join(destination, "book-source.bundle"),
    "--all",
    "HEAD",
  ]);
  const preparation = path.join(local, "course-preparation");
  const reference = path.join(preparation, "reference");
  if (await existing(reference, "directory")) {
    await run("git", [
      "-C",
      reference,
      "bundle",
      "create",
      path.join(destination, "reference-source.bundle"),
      "--all",
      "HEAD",
    ]);
  }
  for (const [parent, name, label] of [
    [local, "course-files", "local-course-files"],
    [
      path.join(local, "course-simulation"),
      "course-files",
      "simulation-course-files",
    ],
    [local, "course-preparation", "private-course-preparation"],
  ] as const) {
    await archive(
      path.join(parent, name),
      path.join(destination, `${label}.tar.gz`),
    );
  }

  const companionLocations = [
    [path.join(local, "learning-companion"), "repository-companion"],
    [
      path.join(homedir(), "Library/Application Support/scalableweb-companion"),
      "mac-companion",
    ],
  ] as const;
  for (const [parent, label] of [
    [local, "local"],
    [path.join(local, "course-simulation"), "simulation"],
    [path.join(reference, ".data"), "reference"],
    ...companionLocations,
  ] as const) {
    if (!(await existing(parent, "directory"))) continue;
    for (const file of (await readdir(parent)).filter((name) =>
      name.endsWith(".sqlite"),
    )) {
      const source = path.join(parent, file);
      if (await existing(source, "file")) {
        await saveSQLite(source, path.join(destination, `${label}-${file}`));
      }
    }
  }
  for (const [parent, label] of companionLocations) {
    for (const file of [
      "companion-settings.json",
      "credential-identity.json",
    ]) {
      const source = path.join(parent, file);
      if (await existing(source, "file")) {
        await copyFile(source, path.join(destination, `${label}-${file}`));
      }
    }
    for (const dir of ["sessions", "archived_sessions"]) {
      await archive(
        path.join(parent, "codex", dir),
        path.join(destination, `${label}-codex-${dir}.tar.gz`),
      );
    }
    const provider = path.join(parent, "codex");
    if (!(await existing(provider, "directory"))) continue;
    for (const file of (await readdir(provider)).filter((name) =>
      /^(state|thread_history)_\d+\.sqlite$/.test(name),
    )) {
      const source = path.join(provider, file);
      if (await existing(source, "file")) {
        await saveSQLite(
          source,
          path.join(destination, `${label}-codex-${file}`),
        );
      }
    }
  }
  const localFeedback = path.join(local, "comments.json");
  if (await existing(localFeedback, "file")) {
    await copyFile(
      localFeedback,
      path.join(destination, "local-feedback.json"),
    );
  }
}

async function catalog(directory: string): Promise<Artifacts> {
  const entries: Artifacts = {};
  for (const name of (await readdir(directory)).sort()) {
    if (name === artifactManifest) continue;
    const file = path.join(directory, name);
    const stat = await lstat(file);
    if (!stat.isFile())
      throw new Error(
        "The backup directory contains an unexpected non-file entry.",
      );
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    entries[name] = { bytes: stat.size, sha256: hash.digest("hex") };
  }
  return entries;
}

async function checkedCatalog(source: string) {
  const manifest = parseSnapshotJson<{ artifacts: Artifacts }>(
    await readFile(path.join(source, artifactManifest), "utf8"),
    "backup manifest",
  );
  const actual = await catalog(source);
  if (JSON.stringify(manifest.artifacts) !== JSON.stringify(actual)) {
    throw new Error("The snapshot does not match its checksum manifest.");
  }
  return actual;
}

async function daysSinceUpload(kind: "full" | "hosted") {
  try {
    const recorded = parseSnapshotJson<{ verifiedAt: string }>(
      await readFile(path.join(output, `.last-r2-${kind}.json`), "utf8"),
      "R2 receipt",
    );
    const age = (Date.now() - Date.parse(recorded.verifiedAt)) / day;
    if (Number.isFinite(age) && age >= 0) return age;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return Infinity;
}

async function publishSnapshot(source: string, scratch: string) {
  const files = await checkedCatalog(source);
  const kind = Object.hasOwn(files, "book-source.bundle") ? "full" : "hosted";
  const objectPrefix = `automated-backups/${kind}/${path.basename(source)}`;
  const downloaded = path.join(scratch, "r2-download");
  await mkdir(downloaded);
  const cloud = (args: string[]) => run(wrangler, args, scratch);
  const [devUrl, domains] = await Promise.all([
    cloud([
      "r2",
      "bucket",
      "dev-url",
      "get",
      bucket,
      "--jurisdiction",
      jurisdiction,
    ]),
    cloud([
      "r2",
      "bucket",
      "domain",
      "list",
      bucket,
      "--jurisdiction",
      jurisdiction,
    ]),
  ]);
  if (
    !devUrl.includes("Public access via the r2.dev URL is disabled.") ||
    !domains.includes("There are no custom domains connected")
  ) {
    throw new Error("The R2 bucket's private access could not be verified.");
  }
  const upload = (name: string) =>
    cloud([
      "r2",
      "object",
      "put",
      `${bucket}/${objectPrefix}/${name}`,
      "--remote",
      "--jurisdiction",
      jurisdiction,
      "--cache-control",
      "no-store",
      "--file",
      path.join(source, name),
    ]);
  const download = (name: string) =>
    cloud([
      "r2",
      "object",
      "get",
      `${bucket}/${objectPrefix}/${name}`,
      "--remote",
      "--jurisdiction",
      jurisdiction,
      "--file",
      path.join(downloaded, name),
    ]);
  for (const name of Object.keys(files)) {
    await upload(name);
    await download(name);
  }
  if (JSON.stringify(await catalog(downloaded)) !== JSON.stringify(files)) {
    throw new Error("The R2 copy did not match the local snapshot.");
  }
  await upload(artifactManifest);
  await download(artifactManifest);
  const [original, remote] = await Promise.all([
    readFile(path.join(source, artifactManifest)),
    readFile(path.join(downloaded, artifactManifest)),
  ]);
  if (!original.equals(remote))
    throw new Error("The R2 manifest did not match the local snapshot.");
  const receipt = {
    verifiedAt: new Date().toISOString(),
    bucket,
    objectPrefix,
    artifacts: Object.keys(files).length,
  };
  const kinds = kind === "full" ? ["full", "hosted"] : ["hosted"];
  for (const marker of kinds) {
    const name = `.last-r2-${marker}.json`;
    const staging = path.join(scratch, name);
    await writeJson(staging, receipt);
    await rename(staging, path.join(output, name));
  }
  console.log(JSON.stringify(receipt));
}

async function verify(
  directory: string,
  scratch: string,
  artifacts: Artifacts,
) {
  const feedback = parseSnapshotJson<KvRecord[]>(
    await readFile(path.join(directory, feedbackFile), "utf8"),
    "feedback export",
  );
  const byKey = new Map<string, Set<string>>();
  let comments = 0;
  let resolutions = 0;
  for (const record of feedback) {
    if (record.key.startsWith("comments:")) {
      const rows = parseSnapshotJson<unknown>(record.value, "feedback chapter");
      if (
        !Array.isArray(rows) ||
        rows.some((row) => typeof row?.id !== "string")
      ) {
        throw new Error("The feedback export contains a malformed chapter.");
      }
      byKey.set(record.key, new Set(rows.map(({ id }) => id)));
      comments += rows.length;
    } else if (
      record.key.startsWith(feedbackResolutionPrefix) &&
      feedbackResolutionMetadata(record.metadata)
    ) {
      resolutions++;
    } else {
      throw new Error(
        "The feedback export contains an invalid persistent key.",
      );
    }
  }
  if (new Set(feedback.map(({ key }) => key)).size !== feedback.length) {
    throw new Error("The feedback export contains duplicate keys.");
  }
  let orphanedResolutions = 0;
  for (const record of feedback) {
    if (!record.key.startsWith(feedbackResolutionPrefix)) continue;
    const identity = record.key.slice(feedbackResolutionPrefix.length);
    const separator = identity.indexOf(":");
    if (
      !byKey
        .get(`comments:${identity.slice(0, separator)}`)
        ?.has(identity.slice(separator + 1))
    )
      orphanedResolutions++;
  }

  const database = new DatabaseSync(":memory:");
  let learningAnswers: number;
  try {
    try {
      database.exec(await readFile(path.join(directory, learningFile), "utf8"));
    } catch {
      throw new Error(
        "The exercise SQL export could not be restored into SQLite.",
      );
    }
    checkIntegrity(database);
    learningAnswers = Number(
      database.prepare("SELECT count(*) AS total FROM learning_answers").get()
        ?.total,
    );
  } finally {
    database.close();
  }

  for (const name of Object.keys(artifacts)) {
    const file = path.join(directory, name);
    if (name.endsWith(".sqlite")) {
      const snapshot = new DatabaseSync(file, { readOnly: true });
      try {
        checkIntegrity(snapshot);
      } finally {
        snapshot.close();
      }
    } else if (name.endsWith(".bundle")) {
      const mirror = path.join(scratch, `${name}.git`);
      await run("git", ["clone", "--quiet", "--mirror", file, mirror]);
      await run("git", ["-C", mirror, "fsck", "--connectivity-only"]);
    } else if (name.endsWith(".tar.gz")) {
      await run("tar", ["-tzf", file]);
    }
  }
  return {
    feedbackKeys: feedback.length,
    comments,
    resolutions,
    orphanedResolutions,
    learningAnswers,
  };
}

function checkIntegrity(database: DatabaseSync) {
  const result = database.prepare("PRAGMA integrity_check").all();
  if (result.length !== 1 || result[0]?.integrity_check !== "ok") {
    throw new Error("A restored SQLite snapshot failed its integrity check.");
  }
}

async function main() {
  process.umask(0o077);
  await mkdir(output, { recursive: true, mode: 0o700 });
  const storage = await lstat(output);
  if (
    !storage.isDirectory() ||
    (storage.mode & 0o077) !== 0 ||
    (await realpath(output)) !== path.resolve(output)
  ) {
    throw new Error(
      "Keep the backup directory private and on the encrypted local volume.",
    );
  }
  const args = process.argv.slice(2);
  const verifyPath =
    args.length === 2 && args[0] === "--verify" ? args[1] : undefined;
  const publishPath =
    args.length === 2 && args[0] === "--publish" ? args[1] : undefined;
  const scheduled = args.length === 1 && args[0] === "--scheduled";
  const hosted = args.length === 1 && args[0] === "--hosted";
  if (args.length && !verifyPath && !publishPath && !scheduled && !hosted)
    throw new Error(
      "Usage: npm run backup:book -- [--verify <snapshot-directory> | --publish <snapshot-directory> | --hosted | --scheduled]",
    );
  const scratch = await mkdtemp(path.join(output, ".check-"));
  let staging: string | undefined;
  try {
    if (verifyPath) {
      const source = path.resolve(verifyPath);
      const actual = await checkedCatalog(source);
      console.log(JSON.stringify(await verify(source, scratch, actual)));
      return;
    }
    if (publishPath) {
      const source = path.resolve(publishPath);
      await verify(source, scratch, await checkedCatalog(source));
      await publishSnapshot(source, scratch);
      return;
    }
    if (scheduled && (await daysSinceUpload("hosted")) < 0.9) {
      console.log("A verified R2 copy already covers this interval.");
      return;
    }
    const full =
      !hosted && (!scheduled || (await daysSinceUpload("full")) >= 6.9);
    staging = await mkdtemp(path.join(output, ".snapshot-"));
    const startedAt = new Date().toISOString();
    const production = await captureProduction(staging, scratch);
    if (full) await captureLocal(staging);
    const artifacts = await catalog(staging);
    const verified = await verify(staging, scratch, artifacts);
    await writeJson(path.join(staging, artifactManifest), {
      formatVersion: 1,
      startedAt,
      completedAt: new Date().toISOString(),
      production,
      verified,
      artifacts,
    });
    const destination = path.join(
      output,
      `${startedAt.replace(/[:.]/g, "-")}-${path.basename(staging).slice(".snapshot-".length)}`,
    );
    await chmod(staging, 0o700);
    await rename(staging, destination);
    staging = undefined;
    if (scheduled || hosted) await publishSnapshot(destination, scratch);
    console.log(
      JSON.stringify({
        snapshot: destination,
        ...verified,
        artifacts: Object.keys(artifacts).length,
      }),
    );
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Book backup failed.");
  process.exitCode = 1;
}
