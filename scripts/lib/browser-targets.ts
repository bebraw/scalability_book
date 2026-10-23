/** Convert the explicit support floors in package.json to Vite/Oxc targets.
 * Reject moving queries: updating browser data must not change our contract.
 */
export function getBrowserBuildTargets(queries: readonly string[]): string[] {
  if (!queries.length)
    throw new Error("Browser support needs explicit targets");

  return queries.map((query) => {
    const match =
      /^(chrome|edge|firefox|safari|ios_saf) >= (\d+(?:\.\d+)?)$/.exec(query);
    if (!match) {
      throw new Error(`Use an explicit supported browser minimum: ${query}`);
    }
    const [, browser, version] = match;
    return `${browser === "ios_saf" ? "ios" : browser}${version}`;
  });
}
