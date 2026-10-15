/** HTTP compatibility for published agent text, shared by both servers. */
export function agentResourceHeaders(pathname: string): Record<string, string> {
  if (
    !/^\/concepts\/(?:agent-guide|graph)\.md$/.test(pathname) &&
    !/^\/explore\/[^/]+\/(?:agent|discussion)\.md$/.test(pathname)
  )
    return {};
  // Some URL readers reject text/markdown before reading the guide or images.
  // Keep the Markdown bytes and URLs; plain text is the compatible HTTP format.
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
}
