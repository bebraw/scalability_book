import test from "node:test";
import assert from "node:assert/strict";
import { concepts } from "../shared/concepts.ts";
import {
  conceptRoleById,
  conceptSubgroups,
} from "../shared/concept-presentation.ts";

test("subgroups give every authored concept exactly one home within its topic", () => {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  const assigned = conceptSubgroups.flatMap((subgroup) => subgroup.conceptIds);
  assert.equal(assigned.length, new Set(assigned).size, "Duplicate membership");
  assert.deepEqual(new Set(assigned), new Set(byId.keys()));
  assert.equal(
    new Set(conceptSubgroups.map(({ id }) => id)).size,
    conceptSubgroups.length,
    "Subgroup navigation ids must be unique",
  );
  for (const subgroup of conceptSubgroups) {
    assert.match(subgroup.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(subgroup.conceptIds.length > 0, subgroup.id);
    for (const id of subgroup.conceptIds)
      assert.equal(
        byId.get(id)?.group,
        subgroup.group,
        `${id} must remain in its authored topic`,
      );
  }
});

test("reading homes preserve distinctions between effects, coordination and control", () => {
  const subgroupOf = (id: string) =>
    conceptSubgroups.find((subgroup) => subgroup.conceptIds.includes(id))!.id;
  assert.equal(subgroupOf("idempotency"), "behavior-correctness");
  assert.equal(subgroupOf("transaction"), "state-coordination");
  assert.equal(subgroupOf("authority"), "project-foundations");
  assert.equal(subgroupOf("state-authority"), "state-coordination");
  assert.equal(subgroupOf("retry"), "failure-recovery");
  assert.equal(subgroupOf("durable-workflow"), "failure-recovery");
  assert.equal(subgroupOf("queue"), "flow-control");
  assert.equal(subgroupOf("review-budget"), "parallel-work-review");
});

test("subgroups organize subject matter independently of editorial roles", () => {
  for (const [law, neighbor, subgroupId] of [
    ["amdahl-law", "agent-fleet", "parallel-work-review"],
    ["little-law", "latency", "measurement-flow"],
    ["lusser-law", "reliability", "reliability"],
    ["goodhart-law", "benchmark", "evaluation-proxies"],
  ] as const) {
    const subgroup = conceptSubgroups.find(({ id }) => id === subgroupId)!;
    assert.ok(subgroup.conceptIds.includes(law));
    assert.ok(subgroup.conceptIds.includes(neighbor));
    assert.equal(conceptRoleById[law], "model");
    assert.notEqual(conceptRoleById[neighbor], "model");
  }
  const pressure = conceptSubgroups.find(
    ({ id }) => id === "pressure-capacity",
  )!;
  assert.ok(pressure.conceptIds.includes("contention"));
  assert.equal(conceptRoleById["contention"], "property");
});
