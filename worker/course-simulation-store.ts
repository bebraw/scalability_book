import { createHash } from "node:crypto";
import type { Envelope } from "../shared/course.ts";
import type { SimulationState } from "../shared/course-simulation.ts";
export type { SimulationState } from "../shared/course-simulation.ts";
import { courseAuthStore, type AuthDatabase } from "./course-auth-store.ts";
import { mockMailStore } from "./course-mock-mail.ts";
import type {
  CourseStore,
  FileStore,
  CourseRecordFilter,
} from "./course-store.ts";
import { requireThat } from "./course-validation.ts";

export const simulationEnvironmentKey = "simulation:environment";
export const simulationFileMarker = "simulation/environment.json";
export const simulationInitialTime = "2026-10-05T08:00:00.000Z";
export const simulationCookie = "scalableweb_simulation_session";
export interface SimulationMarker {
  mode: "simulation";
  id: string;
}
export interface SimulationEnvironment {
  id: string;
  store: CourseStore;
  files: FileStore;
  database: AuthDatabase;
  assertIsolated(): Promise<void>;
}
export const simulationOwner = (teacher: string) =>
  createHash("sha256").update(teacher).digest("hex");
export const simulationStateKey = (teacher: string) =>
  `simulation:teacher:${simulationOwner(teacher)}`;

export async function assertSimulationMarker(store: CourseStore, id: string) {
  const marker = await store.get<SimulationMarker>(simulationEnvironmentKey);
  requireThat(
    /^[a-z0-9][a-z0-9-]{2,63}$/.test(id) &&
      marker?.kind === "simulation-environment" &&
      marker.value.mode === "simulation" &&
      marker.value.id === id,
    "Simulation storage identity does not match its configuration.",
    503,
  );
}

export function scopedCourseStore(
  root: CourseStore,
  namespace: string,
): CourseStore {
  const decode = <T>(record: Envelope<T>): Envelope<T> => {
    requireThat(
      record.key.startsWith(namespace) && record.courseId.startsWith(namespace),
      "Simulation record escaped its scope.",
      503,
    );
    return {
      ...record,
      key: record.key.slice(namespace.length),
      courseId: record.courseId.slice(namespace.length),
    };
  };
  return {
    async get<T>(key: string) {
      const record = await root.get<T>(namespace + key);
      return record ? decode(record) : null;
    },
    async list<T>(course: string, kind?: string, filter?: CourseRecordFilter) {
      return (
        await root.list<T>(
          namespace + course,
          kind,
          filter?.after
            ? { ...filter, after: namespace + filter.after }
            : filter,
        )
      ).map(decode);
    },
    async courses() {
      return (await root.courses(namespace))
        .filter((r) => r.courseId.startsWith(namespace))
        .map(decode);
    },
    save(record, expected, reason, guard) {
      return root.save(
        {
          ...record,
          key: namespace + record.key,
          courseId: namespace + record.courseId,
        },
        expected,
        reason,
        guard ? { ...guard, key: namespace + guard.key } : undefined,
      );
    },
    async history(key, revision) {
      return (await root.history(namespace + key, revision)).map((record) => {
        requireThat(
          record.key.startsWith(namespace),
          "Simulation history escaped its scope.",
          503,
        );
        return { ...record, key: record.key.slice(namespace.length) };
      });
    },
  };
}

export function simulationStores(
  environment: SimulationEnvironment,
  teacher: string,
  state: SimulationState,
) {
  const namespace = `sim:${simulationOwner(teacher)}:${state.generation}:`;
  const fileKey = (key: string) => {
    requireThat(
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(key),
      "Invalid simulation file identifier.",
      400,
    );
    return namespace + key;
  };
  const files: FileStore = {
    put: (key, body, length) =>
      environment.files.put(fileKey(key), body, length),
    get: (key) => environment.files.get(fileKey(key)),
    delete: (key) => environment.files.delete(fileKey(key)),
  };
  return {
    store: scopedCourseStore(environment.store, namespace),
    files,
    auth: courseAuthStore(environment.database, namespace),
    mail: mockMailStore(environment.database, namespace),
    now: state.now,
  };
}
