# CSV export starter lab

Implement one function with your own model and coding harness, then inspect an actual browser download.
The supplied page already renders and filters five synthetic records and handles download requests.
`export.mjs` deliberately throws until you implement CSV serialization.
No model calls are made by the page or checks.

## Start and separate setup from feature failures

Use Node 24 or newer.
From this directory:

```sh
npm ci
npx playwright install chromium
npm run preflight
npm start
```

Open <http://127.0.0.1:4175> and filter the records.
The preflight should pass before any implementation; exporting shows the implementation-gap message.
Stop this manual server before browser tests, which start an isolated server on the same port.
Set `PORT` for manual serving or `CSV_LAB_PORT` for browser checks if another service owns that port.

Read SPEC.md, record your initial prediction and intended checks, then give TASK.md to your model in this disposable lab directory.
Keep the implementation scoped to `export.mjs`; maintain the specification and one decision record.
Use 60–90 minutes as an initial planning limit to calibrate, not an established completion-time estimate.
This replaces an existing practice activity when agreed; further exploration is optional.

## Run and retain actual checks

```sh
npm test
npm run test:browser
npm run check
```

The untouched starter is expected to fail all seven serialization checks and two download checks.
The browser baseline still renders and filters the supplied records.
`npm run check` runs preflight, contract and browser checks even if an earlier check fails, retains each log and writes runtime, commands, exit status and elapsed time to `test-results/evidence/summary.json`.
Keep the first failure as well as the final result; copy records elsewhere before rerunning if you need both versions, because this directory records the latest check.
Browser traces for failures live under `test-results/browser/`.
Missing dependencies or browsers are setup failures, not evidence that CSV serialization is incorrect.

The supplied expected strings are independent of your serializer.
They cover headers, order, delimiters, commas, quotes, LF, CRLF, bare CR, Unicode, whitespace, empty values and input preservation.
Browser checks inspect the downloaded bytes for the full list, a filtered list and no matching rows.
Try a separate additional record or harmless refactor afterward to challenge whether the solution merely fits the examples.

Use your existing learning or project notes for the prediction, actual result, model configuration, corrections and decision.
Passing these checks establishes the stated local behavior for their cases; it does not establish complete CSV interoperability, production security, performance or a model-wide capability result.
The starter contains no completed solution or measured productivity claim.
