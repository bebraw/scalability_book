import { build } from "vite";
import { readFile, writeFile, chmod, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { companionRelease } from "../shared/learning-connection.ts";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "packages/learning-companion");
const manifest = JSON.parse(
  await readFile(path.join(directory, "package.json"), "utf8"),
);
if (
  manifest.name !== companionRelease.name ||
  manifest.version !== companionRelease.version
)
  throw new Error("Package and connection release metadata disagree.");
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
);
await build({
  configFile: false,
  logLevel: "warn",
  publicDir: false,
  define: {
    __LEARNING_SOURCE_REVISION__: JSON.stringify(
      sourceRevision + (dirty ? "+working-tree" : ""),
    ),
  },
  build: {
    ssr: path.join(root, "scripts/learning-companion-entry.ts"),
    outDir: path.join(directory, "dist"),
    emptyOutDir: true,
    minify: false,
    rolldownOptions: { output: { entryFileNames: "companion.js" } },
  },
});
await mkdir(path.join(directory, "dist"), { recursive: true });
await writeFile(
  path.join(directory, "dist/release.json"),
  JSON.stringify({ ...companionRelease, sourceRevision, dirty }, null, 2) +
    "\n",
);
await chmod(path.join(directory, "bin/companion.mjs"), 0o755);
console.log(
  `Built ${manifest.name}@${manifest.version} from ${sourceRevision}${dirty ? " (working tree)" : ""}. Pack with npm run companion:pack.`,
);
