import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requirementEditions } from "../shared/course-requirements.ts";
import {
  requirementDigest,
  requirementDocuments,
} from "./lib/course-requirements.ts";

const version = process.argv[2];
if (
  !version ||
  !/^[a-z0-9-]+$/.test(version) ||
  !(version in requirementEditions)
)
  throw new Error(
    "Supply an authored requirement edition: node scripts/snapshot-course-requirements.ts <new-edition>",
  );
const edition =
  requirementEditions[version as keyof typeof requirementEditions];
const documents = await Promise.all(
  requirementDocuments.map(async (document) => ({
    ...document,
    source: await readFile(document.file, "utf8"),
  })),
);
const directory = path.join("requirements", version);
// No recursive mkdir: an existing edition must never be overwritten.
await mkdir(directory);
for (const document of documents)
  await writeFile(
    path.join(directory, path.basename(document.file)),
    document.source,
  );
await writeFile(
  path.join(directory, "manifest.json"),
  JSON.stringify(
    {
      version,
      rubric: edition.rubric,
      checklistSha256: requirementDigest(JSON.stringify(edition)),
      documents: documents.map(({ source, ...document }) => ({
        ...document,
        sha256: requirementDigest(source),
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Created requirements/${version}; review and commit the snapshots with the authored checklist.`,
);
