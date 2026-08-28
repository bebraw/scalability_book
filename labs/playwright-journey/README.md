# Playwright journey lab

This standalone example separates a small event-filter fixture from the Playwright journey that exercises it.
The test opens the local HTML file, enters a query through an accessible locator, and asserts the user-visible result.

## Run the example

Install the project dependency and a Chromium browser:

```sh
npm install
npx playwright install chromium
```

Run the test and preserve a trace:

```sh
npm run test:headed
```

The trace shows the action, DOM state, and assertion around this journey.
It does not measure application loading, network behavior, Web Vitals, or production performance because the fixture is a local file.

## Transfer the journey to the project

1. Replace the local fixture URL with a deployed or locally served project route.
2. Adapt the accessible names while preserving the user-visible filtering contract.
3. Keep the functional assertion separate from Lighthouse or other performance evidence.
4. Record the application revision, browser version, route, result, and known limits.

The flow can be correct but slow, or appear fast because it failed to perform the intended work.
Use the assertion to establish behavior and a suitable performance tool to measure speed.
