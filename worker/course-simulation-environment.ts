import {
  d1CourseStore,
  r2FileStore,
  type CourseStore,
} from "./course-store.ts";
import {
  assertSimulationMarker,
  simulationEnvironmentKey,
  simulationFileMarker,
  type SimulationEnvironment,
} from "./course-simulation-store.ts";
import { requireThat } from "./course-validation.ts";

export async function assertLiveCourseStorage(
  store?: CourseStore,
  bucket?: CourseBindings["COURSE_FILES"],
) {
  requireThat(
    !store || !(await store.get(simulationEnvironmentKey)),
    "A simulation database cannot be used for live courses.",
    503,
  );
  requireThat(
    !bucket || !(await bucket.head(simulationFileMarker)),
    "A simulation bucket cannot be used for live course files.",
    503,
  );
}

export function d1SimulationEnvironment(
  id: string,
  db: CourseBindings["COURSE_DB"],
  bucket: CourseBindings["COURSE_FILES"],
  liveStore?: CourseStore,
  liveBucket?: CourseBindings["COURSE_FILES"],
): SimulationEnvironment {
  const store = d1CourseStore(db);
  return {
    id,
    store,
    files: r2FileStore(bucket),
    database: {
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
    },
    async assertIsolated() {
      await assertSimulationMarker(store, id);
      const marker = await bucket.get(simulationFileMarker);
      requireThat(
        marker && marker.size <= 1024,
        "Simulation file storage is not marked for this environment.",
        503,
      );
      const value: unknown = JSON.parse(await marker.text());
      requireThat(
        value !== null &&
          typeof value === "object" &&
          "mode" in value &&
          value.mode === "simulation" &&
          "id" in value &&
          value.id === id,
        "Simulation file storage identity does not match its configuration.",
        503,
      );
      // Independent reads reject aliases even when the platform supplied different
      // binding objects for the same backing database or bucket.
      await assertLiveCourseStorage(liveStore, liveBucket);
    },
  };
}
