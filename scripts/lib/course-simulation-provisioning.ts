import {
  simulationEnvironmentKey,
  simulationInitialTime,
} from "../../worker/course-simulation-store.ts";

export function simulationProvisioningFiles(id: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id))
    throw new Error(
      "Use a simulation identifier of 3–64 lowercase letters, digits and hyphens.",
    );
  const marker = { mode: "simulation", id };
  // All values here are constants or the constrained identifier. This statement
  // cannot overwrite a marker or label an existing academic dataset synthetic.
  const sql = `INSERT INTO course_records(key, course_id, kind, body, revision, updated_at, actor)
SELECT '${simulationEnvironmentKey}', '${simulationEnvironmentKey}', 'simulation-environment', '${JSON.stringify(marker)}', 'simulation-marker-v1', '${simulationInitialTime}', 'simulation-provisioning'
WHERE NOT EXISTS(SELECT 1 FROM course_records)
  AND NOT EXISTS(SELECT 1 FROM course_history)
  AND NOT EXISTS(SELECT 1 FROM course_login_links)
  AND NOT EXISTS(SELECT 1 FROM course_sessions)
  AND NOT EXISTS(SELECT 1 FROM course_auth_attempts)
  AND NOT EXISTS(SELECT 1 FROM course_access_activity)
  AND NOT EXISTS(SELECT 1 FROM course_mock_mail);
SELECT kind, json_extract(body, '$.mode') AS mode, json_extract(body, '$.id') AS id FROM course_records WHERE key = '${simulationEnvironmentKey}';
`;
  return { sql, marker: JSON.stringify(marker, null, 2) + "\n" };
}
