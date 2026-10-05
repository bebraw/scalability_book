// Authored synthetic evidence. Never read enrollment or submissions from live storage.
export const simulationSource = {
  "package.json": JSON.stringify(
    {
      name: "synthetic-tracker",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: { test: "node --test", demo: "node app.mjs" },
      engines: { node: ">=24" },
    },
    null,
    2,
  ),
  "package-lock.json": JSON.stringify(
    {
      name: "synthetic-tracker",
      version: "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: {
        "": {
          name: "synthetic-tracker",
          version: "1.0.0",
          engines: { node: ">=24" },
        },
      },
    },
    null,
    2,
  ),
  "app.mjs": `import { pathToFileURL } from "node:url";
export function advance(item) {
  const states = ["todo", "doing", "done"];
  const index = states.indexOf(item.state);
  if (index < 0 || index === 2) throw new Error("No next state");
  return { ...item, state: states[index + 1], events: [...item.events, states[index + 1]] };
}
export function summary(items) {
  return Object.fromEntries(["todo", "doing", "done"].map(state => [state, items.filter(item => item.state === state).length]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const item = advance({ id: "demo-1", state: "todo", events: ["todo"] });
  console.log(JSON.stringify({ item, summary: summary([item]) }));
}
`,
  "app.test.mjs": `import test from "node:test";
import assert from "node:assert/strict";
import { advance, summary } from "./app.mjs";
test("two transitions preserve history and cannot advance done", () => {
  const original = { id: "demo-1", state: "todo", events: ["todo"] };
  const done = advance(advance(original));
  assert.deepEqual(done.events, ["todo", "doing", "done"]);
  assert.equal(original.state, "todo");
  assert.throws(() => advance(done), /No next state/);
  assert.throws(() => advance({ ...original, state: "unknown" }), /No next state/);
});
test("summary includes empty states", () => {
  assert.deepEqual(summary([{ state: "doing" }]), { todo: 0, doing: 1, done: 0 });
});
`,
  "README.md": `# Synthetic tracker rehearsal source

Use Node 24 or later. Unpack this archive, run npm ci --ignore-scripts --offline,
then npm test and npm run demo. No third-party dependencies or secrets are needed.
The demo prints one item in doing with history [todo, doing] and counts 0/1/0.

This small controlled fixture exercises source download and audit reproduction.
It implements transitions and summary only: HTTP access, persistence, load tests,
deployment, fleet integration and complete project requirements are missing.
Simulation assessments are authored examples of grading outcomes, not a quality
assessment of this tiny archive. Timings in rehearsal reports are illustrative
scenario observations, not collected performance measurements.
The commit field is a synthetic source digest; no hosted Git repository is claimed.
`,
};

const names = [
  ["Ada", "Example"],
  ["Ben", "Example"],
  ["Cora", "Example"],
  ["Dara", "Example"],
  ["Eli", "Example"],
  ["Finn", "Example"],
  ["Gita", "Example"],
  ["Hugo", "Example"],
  ["Iris", "Example"],
  ["Jana", "Example"],
];
export function simulationRoster(size: "compact" | "larger") {
  const count = size === "compact" ? 10 : 31;
  return Array.from({ length: count }, (_, index) => {
    const [firstName, lastName] =
      index === count - 1
        ? ["Jules", "Late"]
        : (names[index] ?? [`Learner${index + 1}`, "Example"]);
    return {
      number: `SIM${String(index + 1).padStart(3, "0")}`,
      firstName: firstName!,
      lastName: lastName!,
      email: `learner${index + 1}@institution.example.invalid`,
    };
  });
}
export const rehearsalAudit = `Synthetic rehearsal observations, not measured benchmark results.
Prior inspection: README and package scripts only; no implementation inspection before the timer.
Tools: terminal, Node 24 and a text editor; no agent used in the cold-read exercise.
Setup: unpacked the supplied archive; offline npm ci completed without dependencies.
Validation: both transition/history and summary checks passed; demo counts were 0/1/0.
Illustrative timer log: setup 4 minutes; find transition owner 3; change probe 5; validate 2.
Change probe: identify the transition guard and propose a blocked state; no change was merged.
Finding: transition ownership is concentrated in advance(), but states are duplicated in summary().
Limit: no HTTP, restart persistence, concurrency or scalability evidence is present in this tiny fixture.
Suggested response: put state definitions in one place and collect a comparable load run in the actual project.`;
export const rehearsalEvidence = `Rehearsal evidence index: README.md owns setup and limits; app.test.mjs owns transition/history and summary checks; app.mjs owns the reproducible demo.
The authored audit identified duplicated state definitions. We agree and would centralize them before adding a blocked state; that change is not included in the frozen snapshot.
No timing, load or deployment claim is supported by this fixture. Simulation scores illustrate course outcomes and are not inferred from this small archive.`;
