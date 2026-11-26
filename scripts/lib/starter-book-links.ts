import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

export const canonicalBookOrigin = "https://scalableweb.dev";

export function localizeBookLinks(markdown: Buffer, bookOrigin: string) {
  if (bookOrigin === canonicalBookOrigin) return markdown;
  return Buffer.from(
    markdown
      .toString("utf8")
      .replace(
        /(\]\(|<)https:\/\/scalableweb\.dev(?=[/?#)>])/g,
        (_match, opening: string) => opening + bookOrigin,
      ),
  );
}

export function branchPreviewOrigin(root: string) {
  const branch =
    process.env.WORKERS_CI_BRANCH ||
    process.env.GITHUB_HEAD_REF ||
    spawnSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
    }).stdout?.trim();
  if (!branch || branch === "main") return "";
  // Match the alias assigned by Wrangler's versions upload on this project.
  const worker = "scalability-book";
  let alias = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z]/.test(alias)) return "";
  const limit = 63 - worker.length - 1;
  if (alias.length > limit) {
    const hash = createHash("sha256").update(branch).digest("hex").slice(0, 4);
    alias = alias.slice(0, limit - 5) + "-" + hash;
  }
  return `https://${alias}-${worker}.survivejs.workers.dev`;
}
