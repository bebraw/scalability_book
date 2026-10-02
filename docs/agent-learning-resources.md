# Graphics and experiments for agents

The concept JSON and Markdown include a curated learning-resource catalog.
Each concept's `resourceIds` refer to entries in `learningResources`.
The catalog includes a labelled neighborhood image for every concept, the complete graph, the five book diagrams, and all gallery demos.
Resource membership helps discover teaching aids; it does not create a new concept relationship.

`shared/demo-catalog.ts` is the gallery's source of titles, includes, and scripts.
`shared/learning-resources.ts` supplies concept membership, captions, assumptions, controls, and prediction-led experiments.
Keep the activity consistent with the actual demo controls and preserve the distinction between illustrative models and measured evidence.
Experiments intentionally omit a model answer.

The agent guide asks for a brief first reply when the student supplies only the guide: acknowledge the material actually retrieved, offer three starting activities, and ask the student to choose.
The activities follow a reading, connect Queue and Latency, or try the queue balance experiment; the experiment is the suggested starting point for an unsure learner.
A student who already has a question, chapter, or passage starts there.
After choosing, the student explains or predicts before the agent reveals labels or results, then checks a cited passage.
These instructions guide the student's external agent; the site does not run or control that agent.

Graphics are generated under `/concepts/visuals/` as standalone SVG and PNG files during the site build.
They use the existing diagram and graph renderers, with the light theme embedded so the image does not depend on host-page CSS or JavaScript.
The PNG alternative supports agents and clients that cannot display SVG.
The agent guide describes how to return an image, cite its context, and prompt a prediction before operating a demo.

Demo previews in `site/assets/demo-previews/` are captured static PNGs of the default gallery views, not simulation results or the learner's saved state.
To refresh them after changing a demo:

1. Build and serve the book locally with `rtk npm run dev` (or serve an existing build).
2. Run `rtk npm run visuals:capture-demos -- http://127.0.0.1:3000/` in another terminal.
3. Review the changed images, update the relevant resource metadata, then rebuild and validate.

The capture command uses the project's Playwright Chromium installation, a fresh browser context, reduced motion, and the light theme.
Normal site builds copy the committed previews and do not require a browser.
Opening a demo URL with an HTTP client retrieves its page but does not run the JavaScript.
Browser-equipped agents can operate the real demo; other agents should return the link and ask the learner to report observations.

Resource fields are additive to graph schema version 2.
The content revision includes the authored resource metadata; image URLs still identify the current publication rather than immutable archived artifacts.
Production responses revalidate `/concepts/visuals/` images so a stable URL can reflect a newly published diagram or refreshed preview.
