# Graphics and experiments for agents

Chapters carry a concise narrative; course tasks motivate deeper exploration through a student's agent and the graph.
Optional activities are discoverable from short chapter invitations, task-based starting points at `/explore/`, and the relevant concept cards.

`shared/explorations.ts` owns stable activity IDs, course-task connections, reading context, and concept membership.
The scenario and prompts live in `explorations/<id>.md`; worked reasoning lives separately in `explorations/<id>.discussion.md`.
The build generates one student page and two Markdown resources per activity:

- `/explore/<id>/`: a copyable starting URL, task and graph links, and closed disclosures for independent study and worked reasoning.
- `/explore/<id>/agent.md`: self-contained conversation guidance, the scenario, prompts, and absolute source links, with no worked answer.
- `/explore/<id>/discussion.md`: authored worked reasoning, retrieved after the student's attempt or explicit request.

Students can give an activity URL directly to their agent without first using the general guide.
The guide and both graph formats link to the catalog; concepts carry `explorationIds`.
The first response introduces the chosen scenario and asks one relevant question, then waits.
Hints, evidence checks, and changed assumptions support the student's reasoning; agreement with the discussion is not a grade.
Trials must actually be performed within granted scope, and an agent must distinguish plans from observations.
These instructions guide the student's external agent; client behavior needs test drives and is not enforced by the site.
The resources are public, and separation of the discussion supports pacing rather than concealing answers.
Activities add no required course deliverables or new saved-progress system.

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

Interactive answers are an optional presentation layer over the authored material.
`shared/agent-presentation.ts` owns common predict → interact → explain guidance, exported as `agentPresentation` in the graph JSON and rendered in the general guide, graph Markdown, and every activity's agent starting point.
Agents should use their client's supported rendering mechanism when one is available and a focused interaction helps the current question.
HTML retrieval, a browser tool, and an inline renderer are distinct capabilities; our URLs do not automatically embed the site in a conversation.
The guidance uses no client-specific output syntax or promise of universal rendering support.

An agent-created view must cite its source, preserve the fixture's quantities and assumptions, and identify changed assumptions.
Reproducing a simulator requires inspecting its implementation and checking representative inputs against the actual demo; otherwise a qualitative diagram or supplied fixture is preferable.
The original demo or activity link stays available, and images, links, and one-question conversation provide the fallback.
An agent must ask for the student's observations when interaction state is not exposed to it.
Generated results are illustrative; they do not become measured project evidence or additional course requirements.
The guidance preserves the first-question pause and separate worked reasoning.

For example, an agent can help investigate work in progress with the queue balance lab, trace the recorder fixture across restart, or compare reported confidence with reference agreement after a prediction.
No MCP UI server or hosted conversational client is introduced by this guidance.
Client behavior should be tested with both an interactive-capable client and a text-only client.

Resource fields are additive to graph schema version 2.
The content revision includes the authored resource metadata and presentation guidance; image URLs still identify the current publication rather than immutable archived artifacts.
Production responses revalidate `/concepts/visuals/` images so a stable URL can reflect a newly published diagram or refreshed preview.
