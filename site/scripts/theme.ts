const root = document.documentElement;
const picker = document.querySelector<HTMLSelectElement>("[data-theme-picker]");
const storedTheme = localStorage.getItem("theme");
const fallbackTheme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
const activeTheme = storedTheme || fallbackTheme;

root.dataset.theme = activeTheme;
if (picker) {
  picker.value = activeTheme;
  picker.addEventListener("change", () => {
    root.dataset.theme = picker.value;
    localStorage.setItem("theme", picker.value);
  });
}
