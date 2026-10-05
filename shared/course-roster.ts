export const rosterColumns = [
  "student_id",
  "first_name",
  "last_name",
  "email",
] as const;
export type RosterColumn = (typeof rosterColumns)[number];
export function csvRows(source: string): string[][] {
  if (source.length > 64000)
    throw new Error("The roster CSV is too large (maximum 64,000 characters).");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  source = source.replace(/^\uFEFF/, "");
  const endCell = () => {
    row.push(cell);
    cell = "";
    closed = false;
  };
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error("A CSV quote must begin a cell.");
      quoted = true;
    } else if (c === ",") endCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      endCell();
      rows.push(row);
      row = [];
    } else {
      if (closed) throw new Error("Unexpected text after a quoted CSV cell.");
      cell += c;
    }
  }
  if (quoted) throw new Error("The roster CSV contains an unclosed quote.");
  endCell();
  rows.push(row);
  const nonempty = rows.filter((r) => r.some((s) => s.trim()));
  if (nonempty.length > 101)
    throw new Error("Import at most 100 students at a time.");
  return nonempty;
}
export function rosterHeaders(source: string) {
  const headers = csvRows(source)[0]?.map((s) => s.trim()) ?? [];
  if (
    !headers.length ||
    new Set(headers).size !== headers.length ||
    headers.some((s) => !s)
  )
    throw new Error("Use a CSV header with distinct, nonempty column names.");
  return headers;
}
export function mappedRoster(
  source: string,
  mapping: Record<RosterColumn, string>,
) {
  const rows = csvRows(source),
    headers = rosterHeaders(source);
  const columns = rosterColumns.map((key) => headers.indexOf(mapping[key]));
  if (columns.some((n) => n < 0) || new Set(columns).size !== 4)
    throw new Error(
      "Map four distinct CSV columns to student ID, first name, last name and email. Read the CSV columns after pasting a new header.",
    );
  return rows.slice(1).map((row) => {
    if (row.length !== headers.length)
      throw new Error(
        "Every CSV row must have the same number of columns as its header.",
      );
    return {
      number: row[columns[0]!]!.trim(),
      firstName: row[columns[1]!]!.trim(),
      lastName: row[columns[2]!]!.trim(),
      email: row[columns[3]!]!.trim(),
    };
  });
}
