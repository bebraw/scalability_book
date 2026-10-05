import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  readdirSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { localCourseStores } from "./local-courses.ts";
import {
  assertSimulationMarker,
  simulationEnvironmentKey,
  type SimulationEnvironment,
  type SimulationMarker,
} from "../../worker/course-simulation-store.ts";
import type { FileStore } from "../../worker/course-store.ts";

export const localSimulationId = "local-teacher-v1";
export async function localCourseSimulation(
  dataDirectory: string,
): Promise<SimulationEnvironment & { close(): void }> {
  mkdirSync(dataDirectory, { recursive: true });
  const parent = realpathSync(dataDirectory);
  const directory = path.join(parent, "course-simulation");
  mkdirSync(directory, { recursive: true });
  const checkPaths = () => {
    if (realpathSync(directory) !== directory)
      throw new Error("Simulation directory cannot alias another directory");
    for (const entry of [
      "course.sqlite",
      "course.sqlite-wal",
      "course.sqlite-shm",
      "course-files",
    ])
      if (existsSync(path.join(directory, entry))) {
        const resource = lstatSync(path.join(directory, entry));
        if (resource.isSymbolicLink())
          throw new Error("Simulation resources cannot be symbolic links");
        if (resource.isFile() && resource.nlink > 1)
          throw new Error("Simulation resources cannot be hard links");
      }
  };
  checkPaths();
  // Inspect an existing file read-only before migrations or WAL configuration.
  // A misplaced live database must not be modified even during initialization.
  const existingFile = path.join(directory, "course.sqlite");
  if (existsSync(existingFile)) {
    const existing = new DatabaseSync(existingFile, { readOnly: true });
    try {
      const tables = existing
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((r) => String(r.name));
      const allowed = new Set([
        "course_records",
        "course_history",
        "course_login_links",
        "course_sessions",
        "course_auth_attempts",
        "course_access_activity",
        "course_mock_mail",
      ]);
      if (tables.some((name) => !allowed.has(name)))
        throw new Error(
          "Refusing to initialize an unrecognized simulation database",
        );
      const marker = tables.includes("course_records")
        ? existing
            .prepare("SELECT kind, body FROM course_records WHERE key = ?")
            .get(simulationEnvironmentKey)
        : null;
      if (marker) {
        const value = JSON.parse(String(marker.body));
        if (
          marker.kind !== "simulation-environment" ||
          value.mode !== "simulation" ||
          value.id !== localSimulationId
        )
          throw new Error(
            "Simulation storage identity does not match its configuration",
          );
      } else if (
        tables.some(
          (name) =>
            Number(
              existing.prepare(`SELECT count(*) AS count FROM ${name}`).get()
                ?.count,
            ) !== 0,
        ) ||
        (existsSync(path.join(directory, "course-files")) &&
          readdirSync(path.join(directory, "course-files")).length)
      )
        throw new Error("Refusing to mark existing records as a simulation");
    } finally {
      existing.close();
    }
  } else if (
    existsSync(path.join(directory, "course-files")) &&
    readdirSync(path.join(directory, "course-files")).length
  )
    throw new Error("Refusing to mark existing files as a simulation");
  const stores = localCourseStores(directory);
  try {
    const marker = await stores.store.get<SimulationMarker>(
      simulationEnvironmentKey,
    );
    if (!marker) {
      // Only an empty, dedicated local database can acquire a simulation marker.
      const row = await stores.database.first(
        "SELECT (SELECT count(*) FROM course_records) + (SELECT count(*) FROM course_history) + (SELECT count(*) FROM course_login_links) + (SELECT count(*) FROM course_sessions) + (SELECT count(*) FROM course_mock_mail) AS count",
        [],
      );
      if (Number(row?.count) !== 0)
        throw new Error("Refusing to mark existing records as a simulation");
      await stores.store.save(
        {
          key: simulationEnvironmentKey,
          courseId: simulationEnvironmentKey,
          kind: "simulation-environment",
          value: { mode: "simulation", id: localSimulationId },
          revision: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
          actor: "local-simulation-initializer",
        },
        null,
        "Initialize dedicated empty simulation storage",
      );
    }
    await assertSimulationMarker(stores.store, localSimulationId);
    // Hash namespace-qualified keys to local adapter UUID filenames. The mapping
    // includes owner and reset generation, so equal public file IDs remain isolated.
    const fileKey = (key: string) => {
      const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
      return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
    };
    const files: FileStore = {
      put: (key, body, length) => stores.files.put(fileKey(key), body, length),
      get: (key) => stores.files.get(fileKey(key)),
      delete: (key) => stores.files.delete(fileKey(key)),
    };
    return {
      id: localSimulationId,
      store: stores.store,
      database: stores.database,
      files,
      async assertIsolated() {
        checkPaths();
        await assertSimulationMarker(stores.store, localSimulationId);
      },
      close: stores.close,
    };
  } catch (error) {
    stores.close();
    throw error;
  }
}
