# Synthetic source-bundle fixture

This small Node 24+ application verifies course archive reproduction.
It uses no installed third-party dependencies, credentials or personal data.
It is a controlled test fixture, not a completed student project or a full workload/phase evidence package.

Unpack the ZIP into a clean directory, then run:

```bash
npm ci --offline --ignore-scripts
npm run fixtures
npm run validate
npm start
```

The server prints its loopback URL; `PORT=0` selects a free port.
`GET /` returns workspaces, items and events; `GET /summary?workspace=sample` returns state counts.
`GET /events` uses newest-first insertion order and accepts `workspace` and `type` filters.
`POST /items` accepts JSON with `workspace`, `title` and `actor`.
`POST /advance` accepts `id`, `state` (`active`, then `done`) and `actor`.
Operations persist in `.local/state.json`; restarting the application retains that state.
Stop with Ctrl-C.
Re-running `npm run fixtures` resets only these synthetic local records.
`npm run demo` loads the same state and reports readiness without opening a port.

The curated archive includes this README, source/test, fixture, manifests/lockfile and example configuration.
Exclude `.local`, installed dependencies, generated archives and credentials.
There are no necessary vendored/generated exceptions.
