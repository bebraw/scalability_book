/** Shared by the production Worker and local preview server. */
export function studyHeaders(pathname: string): Record<string, string> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return {};
  }
  if (!decoded.startsWith("/learn/pilot/")) return {};
  // Also cover Cloudflare's extensionless HTML routes and direct navigation.
  const demo = /^\/learn\/pilot\/[^/]+\/demos\/[^/]+\/?$/.test(decoded);
  return {
    // Stable runtime filenames change between exports; never cache them as
    // immutable assets or mix an old runtime with a new module schema.
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": demo
      ? "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    ...(decoded.endsWith(".mjs")
      ? { "Content-Type": "text/javascript; charset=utf-8" }
      : {}),
  };
}
