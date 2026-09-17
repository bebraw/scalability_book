import path from "node:path";
import { buildStudy } from "./lib/study-build.ts";

const [output, ...extra] = process.argv.slice(2);
if (!output || extra.length) {
  throw new Error("Usage: npm run study:export -- <new-output-directory>");
}
await buildStudy(process.cwd(), path.resolve(output));
