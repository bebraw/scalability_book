export class Problem extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireThat(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new Problem(message, status);
}
export function obj(value: unknown): Record<string, unknown> {
  requireThat(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected an object.",
  );
  return value as Record<string, unknown>;
}
export function text(
  value: unknown,
  label: string,
  max = 8000,
  required = false,
) {
  requireThat(
    typeof value === "string" &&
      value.length <= max &&
      (!required || value.trim()),
    `${label} is required or too long (maximum ${max} characters).`,
  );
  return value.trim();
}
export function integer(value: unknown, min: number, max: number) {
  requireThat(
    typeof value === "number" &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max,
    `Expected an integer from ${min} to ${max}.`,
  );
  return value;
}
export function array(value: unknown, max: number) {
  requireThat(
    Array.isArray(value) && value.length <= max,
    `Expected a list with at most ${max} items.`,
  );
  return value as unknown[];
}
export function slug(value: unknown) {
  const s = text(value, "Identifier", 48, true);
  requireThat(
    /^[a-z0-9][a-z0-9-]*$/.test(s),
    "Identifiers use lowercase letters, numbers and hyphens.",
  );
  return s;
}
export function studentId(value: unknown) {
  const s = text(value, "GitHub numeric ID", 40, true);
  requireThat(
    /^github:[1-9][0-9]{0,19}$/.test(s),
    "Use a stable numeric GitHub ID, prefixed with github:.",
  );
  return s;
}
export function date(value: unknown) {
  const s = text(value, "Deadline", 40, true);
  requireThat(Number.isFinite(Date.parse(s)), "Enter a valid deadline.");
  return new Date(s).toISOString();
}
export function scores(value: unknown, maxima: number[]) {
  const items = array(value, maxima.length);
  requireThat(items.length === maxima.length, "Every criterion needs a score.");
  return items.map((s, i) => integer(s, 0, maxima[i]!));
}
export const unique = (items: string[]) => new Set(items).size === items.length;
