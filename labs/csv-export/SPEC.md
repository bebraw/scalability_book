# CSV export contract

Version 1. The supplied browser displays synthetic records in fixture order and filters title and location using a case-insensitive substring.
The implementation gap is `serializeEvents(events)` in `export.mjs`.
It receives exactly the records currently visible, in their displayed order, and returns a string without mutating its input.

- The first record is the header `title,location`.
- Export only those two columns, with a comma delimiter and CRLF between records, including a final CRLF.
- Preserve field text exactly, including Unicode, edge whitespace, empty strings and embedded line endings.
- Quote a field if it contains a comma, double quote, CR or LF; double each double quote inside a quoted field.
- Leave other fields unquoted.
  An empty list produces `title,location\r\n` and no data records.
- The supplied button downloads these bytes as UTF-8 `events.csv`; the button handler is outside the implementation gap.

The browser fixture has E1 Architecture clinic / Room 204; E2 Build, measure, learn / Main hall; E3 API "office hours" / Online; E4 `Design\nreview` / `Lab\r\nEast`; E5 Åland / 東京 / empty location.
Here `\n` and `\r` denote literal LF and CR characters, not backslash text.
The supplied tests also use other records; hardcoding this fixture does not satisfy the contract.

Fields are strings in this exercise.
Type coercion, spreadsheet formula handling, streaming, server-side export and changes to filtering are outside scope.
Before implementation, record your prediction and the checks you will use below; update this specification if the agreed scope changes.

## Intended checks and prediction

_Record your initial prediction and intended checks here before asking the model to implement._
