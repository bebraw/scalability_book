# HTTP cache starter

Use your own model and harness to implement one conditional-response function.
The supplied loopback origin, page, synthetic body versions and origin-request log let you inspect actual browser reuse.
No shared cache, CDN, deployment account or model credential is needed.

## Setup and implementation

In the combined course workspace, use the root `npm ci` once and run `npm run lab -- http-cache <command>` there.
Install Chromium once with the root `npm run browser:install`; skip the separate installation below.
The remaining commands and records still belong to this exercise.

Use Node 24 or newer.
From this directory:

```sh
npm ci
npx playwright install chromium
npm run preflight
npm start
```

Open <http://127.0.0.1:4182>.
The supplied UI and origin controls work before implementation; fetching the summary shows the deliberate implementation-gap error.
Keep DevTools “disable cache” off and use the page's fetch button rather than reload.
Read SPEC.md, record your prediction and give TASK.md to your model.
Use 45–75 minutes as an initial planning limit to calibrate, replacing existing practice time.
This optional activity adds no submission or grading criterion.

## Check actual behavior

Stop the manual server before browser checks, which start an isolated fixture on the same port.
Set `PORT` for manual serving or `HTTP_LAB_PORT` for checks if needed.

```sh
npm test
npm run test:browser
npm run check
```

The unfinished starter fails all six contract checks and two browser feature cases; setup preflight and the browser baseline pass.
The runner continues after suite failures, storing logs and runtime/command/exit/elapsed evidence in `test-results/evidence/`.
Successful browser observation records live in `test-results/runs/`; failures retain browser traces.
Copy these directories before rerunning to preserve first and final results, since the latest run overwrites them.

Direct HTTP assertions check status, validators and exact body behavior.
The Chromium cases separately establish actual browser reuse, origin traffic, conditional requests and changed bodies without mocking requests or disabling the cache.
After a network 304, browser JavaScript receives its stored body as a 200 response; compare the origin log with the page instead of treating these as contradictory statuses.
Fresh content can remain stale relative to the origin for its declared 60-second lifetime.

Keep actual browser/runtime versions, request mode, settings, model configuration, corrections, specification and decision in existing learning notes.
The provided cases do not establish every browser's cache behavior, performance, shared-cache correctness or a complete HTTP implementation.
No completed solution is distributed.
