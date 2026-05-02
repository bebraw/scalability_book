import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const buildDir = path.join(root, "build");
const outputPath = path.join(root, "worker/generated/asset-manifest.ts");

const assets = [];

for (const file of await walk(buildDir)) {
  const content = await readFile(file);
  const info = await stat(file);

  assets.push({
    path: "/" + toPosix(path.relative(buildDir, file)),
    size: info.size,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}

assets.sort((a, b) => a.path.localeCompare(b.path, "en"));

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  [
    "export const assetManifest = " +
      JSON.stringify(assets, null, 2) +
      " as const;",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Generated ${toPosix(path.relative(root, outputPath))}`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walk(entryPath);
      }

      return entry.isFile() ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
