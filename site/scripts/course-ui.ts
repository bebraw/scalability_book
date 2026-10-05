export const e = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const option = (value: string, label: string, current: string) =>
  `<option value="${e(value)}" ${value === current ? "selected" : ""}>${e(label)}</option>`;
export const field = (
  name: string,
  label: string,
  value: string,
  max = 8000,
  required = false,
) =>
  `<label class="course-field">${e(label)}<textarea name="${e(name)}" maxlength="${max}" rows="4" ${required ? "required" : ""}>${e(value)}</textarea></label>`;
export const input = (
  name: string,
  label: string,
  value: string,
  required = true,
  type = "text",
) =>
  `<label class="course-field">${e(label)}<input name="${e(name)}" type="${type}" value="${e(value)}" ${required ? "required" : ""}></label>`;
export function localDate(date: string) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
