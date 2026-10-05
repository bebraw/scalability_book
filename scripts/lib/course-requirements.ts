import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  requirementEditions,
  requirementVersion,
  requirementUrl,
  type RequirementDocument,
} from "../../shared/course-requirements.ts";

export const requirementDocuments: {
  document: RequirementDocument;
  file: string;
}[] = [
  { document: "introduction", file: "specifications/00_introduction.md" },
  { document: "common", file: "specifications/00_common_project.md" },
  { document: "establish", file: "specifications/01_establish.md" },
  { document: "challenge", file: "specifications/02_challenge.md" },
  { document: "compare", file: "specifications/03_compare.md" },
  { document: "grading", file: "specifications/grading.md" },
];
export const requirementDigest = (source: string) =>
  createHash("sha256").update(source).digest("hex");
interface RequirementManifest {
  version: string;
  rubric: string;
  checklistSha256: string;
  documents: { document: RequirementDocument; file: string; sha256: string }[];
}
export async function readRequirementEditions(root: string) {
  const editions = [];
  for (const [version, checklist] of Object.entries(requirementEditions)) {
    const directory = path.join(root, "requirements", version);
    const manifest: RequirementManifest = JSON.parse(
      await readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    if (
      manifest.version !== version ||
      manifest.rubric !== checklist.rubric ||
      manifest.checklistSha256 !== requirementDigest(JSON.stringify(checklist))
    )
      throw new Error(
        `Requirement checklist ${version} changed. Retain historical editions and create a new edition; see requirements/README.md.`,
      );
    if (
      manifest.documents.length !== requirementDocuments.length ||
      new Set(manifest.documents.map((d) => d.document)).size !==
        requirementDocuments.length
    )
      throw new Error(`Incomplete requirement snapshots: ${version}`);
    const documents = [];
    for (const definition of requirementDocuments) {
      const document = manifest.documents.find(
        (d) => d.document === definition.document,
      );
      if (!document || document.file !== definition.file)
        throw new Error(
          `Missing requirement document: ${version}/${definition.document}`,
        );
      const source = await readFile(
        path.join(directory, path.basename(document.file)),
        "utf8",
      );
      if (requirementDigest(source) !== document.sha256)
        throw new Error(
          `Archived requirement changed: ${version}/${definition.document}`,
        );
      if (
        version === requirementVersion &&
        requirementDigest(
          await readFile(path.join(root, definition.file), "utf8"),
        ) !== document.sha256
      )
        throw new Error(
          `Published requirements changed: ${definition.file}. Review the checklist and publish a new edition; see requirements/README.md.`,
        );
      documents.push({
        ...definition,
        source,
        url: requirementUrl(version, definition.document),
      });
    }
    editions.push({ version, documents });
  }
  return editions;
}

export function rewriteRequirementLinks(source: string, version: string) {
  const filenames = new Map(
    requirementDocuments.map((d) => [path.basename(d.file), d.document]),
  );
  return source
    .replace(
      /\]\(([^()/#]+\.md)(#[^)]*)?\)/g,
      (match, filename: string, anchor = "") =>
        filenames.has(filename)
          ? `](${requirementUrl(version, filenames.get(filename)!)}${anchor})`
          : match,
    )
    .replace(
      /\]\(\/project\/(introduction|establish|challenge|compare|grading)?\/?(#[^)]*)?\)/g,
      (_match, document: RequirementDocument | undefined, anchor = "") =>
        `](${requirementUrl(version, document ?? "common")}${anchor})`,
    );
}
