import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

/** Owns the mapping from compiled asset names to their published URLs. */
export function createSiteAssets(
  buildDir: string,
  { fingerprint }: { fingerprint: boolean },
) {
  const urls = new Map<string, string>();

  return { publish, url };

  async function publish(relativePath: string): Promise<void> {
    const originalUrl = `/${relativePath}`;
    let publishedUrl = originalUrl;
    if (fingerprint) {
      const file = path.join(buildDir, relativePath);
      const digest = createHash("sha256")
        .update(await readFile(file))
        .digest("hex")
        .slice(0, 16);
      const extension = path.extname(relativePath);
      const publishedPath = `${relativePath.slice(0, -extension.length)}.${digest}${extension}`;
      // Keep the original name for HTML and direct links from earlier releases.
      await copyFile(file, path.join(buildDir, publishedPath));
      publishedUrl = `/${publishedPath}`;
    }
    urls.set(originalUrl, publishedUrl);
  }

  function url(originalUrl: string): string {
    const publishedUrl = urls.get(originalUrl);
    if (!publishedUrl) {
      throw new Error(`Site asset has not been compiled: ${originalUrl}`);
    }
    return publishedUrl;
  }
}
