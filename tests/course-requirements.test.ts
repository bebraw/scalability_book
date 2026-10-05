import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  readRequirementEditions,
  rewriteRequirementLinks,
} from "../scripts/lib/course-requirements.ts";
import {
  checklistEntries,
  requirementsFor,
} from "../shared/course-requirements.ts";
import { renderMarkdown } from "../scripts/lib/markdown.ts";

test("run checklists link every entry to its archived owner; legacy runs retain a fixed edition", async () => {
  const editions = await readRequirementEditions(process.cwd());
  const bibliography = await readFile("bibliography.bib", "utf8");
  for (const edition of editions) {
    const rendered = new Map(
      edition.documents.map((d) => [
        d.document,
        renderMarkdown(
          rewriteRequirementLinks(d.source, edition.version),
          { number: "" },
          bibliography,
        ).content,
      ]),
    );
    for (const phase of ["establish", "challenge", "compare"] as const) {
      const entries = checklistEntries(
        { requirements: edition.version },
        phase,
      );
      assert.equal(new Set(entries.map((r) => r.id)).size, entries.length);
      for (const entry of entries)
        assert.ok(
          rendered.get(entry.document)!.includes(`id="${entry.anchor}"`),
          `${phase}: ${entry.id} must link its owning requirement`,
        );
    }
  }
  assert.equal(requirementsFor({}).version, "2026-10-v1");
  assert.throws(
    () => requirementsFor({ requirements: "unavailable-edition" }),
    /Unsupported/,
  );
  assert.equal(
    rewriteRequirementLinks(
      "[Common](00_common_project.md#6-minimum-project-harness) [Compare](/project/compare/#6-deliverables)",
      "2026-10-v1",
    ),
    "[Common](/project/requirements/2026-10-v1/common/#6-minimum-project-harness) [Compare](/project/requirements/2026-10-v1/compare/#6-deliverables)",
  );
});
test("build rejects changed live owners, archived briefs and checklist digests rather than drifting a run", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "requirements-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp("requirements", path.join(directory, "requirements"), {
    recursive: true,
  });
  await cp("specifications", path.join(directory, "specifications"), {
    recursive: true,
  });
  const owner = path.join(directory, "specifications/03_compare.md");
  const original = await readFile(owner, "utf8");
  await writeFile(owner, original + "\nChanged deployment obligation.\n");
  await assert.rejects(
    readRequirementEditions(directory),
    /Published requirements changed/,
  );
  await writeFile(owner, original);
  const archived = path.join(
    directory,
    "requirements/2026-10-v1/03_compare.md",
  );
  await writeFile(archived, original + "\nAltered historical requirement.\n");
  await assert.rejects(
    readRequirementEditions(directory),
    /Archived requirement changed/,
  );
  await writeFile(archived, original);
  const manifestFile = path.join(
    directory,
    "requirements/2026-10-v1/manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.checklistSha256 = "0".repeat(64);
  await writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(
    readRequirementEditions(directory),
    /Requirement checklist .* changed/,
  );
});
