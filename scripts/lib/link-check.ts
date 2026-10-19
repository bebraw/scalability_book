import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";
import type { RootContent } from "hast";

export interface LinkIssue {
  url: string;
  sources: string[];
  detail: string;
}

export interface LinkInventory {
  pages: number;
  localLinks: number;
  errors: LinkIssue[];
  external: Map<string, Set<string>>;
}

export async function inspectPublishedLinks(
  directory: string,
  origin: string,
): Promise<LinkInventory> {
  const files = new Set<string>();
  async function walk(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const location = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(location);
      else if (entry.isFile())
        files.add(path.relative(directory, location).split(path.sep).join("/"));
    }
  }
  await walk(directory);
  const pages = new Map<string, { ids: Set<string>; links: string[] }>();
  for (const file of [...files].filter((file) => file.endsWith(".html"))) {
    const page = { ids: new Set<string>(), links: [] as string[] };
    function visit(node: RootContent): void {
      if (node.type !== "element") return;
      if (typeof node.properties.id === "string")
        page.ids.add(node.properties.id);
      if (typeof node.properties.href === "string")
        page.links.push(node.properties.href);
      node.children.forEach(visit);
    }
    fromHtml(
      await readFile(path.join(directory, file), "utf8"),
    ).children.forEach(visit);
    pages.set(file, page);
  }
  if (!pages.size)
    throw new Error(`No published HTML found in ${directory}; build first.`);
  const result: LinkInventory = {
    pages: pages.size,
    localLinks: 0,
    errors: [],
    external: new Map(),
  };
  for (const [source, page] of pages) {
    const pageUrl = new URL(source.replace(/index\.html$/, ""), origin);
    for (const href of page.links) {
      let url: URL;
      try {
        url = new URL(href, pageUrl);
      } catch {
        result.errors.push({
          url: href,
          sources: [source],
          detail: "Invalid URL",
        });
        continue;
      }
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (url.origin !== new URL(origin).origin) {
        url.hash = "";
        const sources = result.external.get(url.href) ?? new Set<string>();
        sources.add(source);
        result.external.set(url.href, sources);
        continue;
      }
      result.localLinks++;
      let target: string;
      let fragment: string;
      try {
        target = decodeURIComponent(url.pathname).replace(/^\//, "");
        fragment = decodeURIComponent(url.hash.slice(1).split(":~:text=")[0]!);
      } catch {
        result.errors.push({
          url: href,
          sources: [source],
          detail: "Invalid URL encoding",
        });
        continue;
      }
      if (!files.has(target)) target = path.posix.join(target, "index.html");
      const detail = !files.has(target)
        ? "Missing local file"
        : fragment && pages.has(target) && !pages.get(target)!.ids.has(fragment)
          ? `Missing anchor #${fragment}`
          : undefined;
      if (detail) result.errors.push({ url: href, sources: [source], detail });
    }
  }
  return result;
}

export interface ExternalLinkResult {
  url: string;
  sources: string[];
  outcome: "ok" | "missing" | "inconclusive";
  status?: number;
  finalUrl?: string;
  detail?: string;
  attempts: number;
}

export async function checkExternalLinks(
  links: Map<string, Set<string>>,
  options: {
    fetch?: typeof fetch;
    timeoutMs?: number;
    concurrency?: number;
  } = {},
): Promise<ExternalLinkResult[]> {
  const entries = [...links];
  const results: ExternalLinkResult[] = [];
  let next = 0;
  async function worker(): Promise<void> {
    while (next < entries.length) {
      const [url, sources] = entries[next++]!;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await (options.fetch ?? fetch)(url, {
            method: "GET",
            credentials: "omit",
            redirect: "follow",
            signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
            headers: {
              "User-Agent":
                "ScalabilityBook-LinkCheck/1.0 (+https://scalableweb.dev/)",
            },
          });
          await response.body?.cancel();
          if (
            attempt === 1 &&
            (response.status === 429 || response.status >= 500)
          )
            continue;
          results.push({
            url,
            sources: [...sources].sort(),
            status: response.status,
            finalUrl: response.url || url,
            outcome: [404, 410].includes(response.status)
              ? "missing"
              : response.ok
                ? "ok"
                : "inconclusive",
            attempts: attempt,
          });
          break;
        } catch (error) {
          if (attempt === 1) continue;
          results.push({
            url,
            sources: [...sources].sort(),
            outcome: "inconclusive",
            detail: error instanceof Error ? error.message : String(error),
            attempts: attempt,
          });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: options.concurrency ?? 6 }, worker));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}
