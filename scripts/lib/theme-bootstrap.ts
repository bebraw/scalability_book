// Run before stylesheets so the first frame uses the reader's chosen palette.
export function renderThemeBootstrap(
  themes: readonly { id: string }[],
): string {
  const themeIds = JSON.stringify(themes.map(({ id }) => id)).replaceAll(
    "<",
    "\\u003c",
  );

  return `<script>(function () {
  var root = document.documentElement;
  var theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    var stored = localStorage.getItem("theme");
    if (${themeIds}.includes(stored)) theme = stored;
  } catch (_) {
    // Storage can be unavailable; the system preference still applies.
  }
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "dark" || theme === "contrast" ? "dark" : "light";
})();</script>`;
}
