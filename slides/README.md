# Lecture slide drafts

These nine Markdown decks provide a content-first starting point for the course lectures.
They follow the topic sequence in `course_plan.md`, use the matching book chapter as their primary source, and end with the project evidence students should produce.
Use `lecture_plan.md` for the actual session format: Lectures 4, 7, and 9 are primarily project presentations.
Their decks supply preparation, brief framing, and selective discussion prompts; they are not additional full lectures to deliver alongside the presentations.

Each file uses Marp-compatible frontmatter and `---` slide separators.
The source comments at the end of each slide are intended to become speaker-note source blocks when the decks are converted to PowerPoint or another presentation format.

## Publish a revision

Edit the numbered Markdown deck below and run the normal site build.
The [student slide index](https://scalableweb.dev/slides/) groups the decks by phase.
Each Obsidian lecture note links to its own numbered page, such as `/slides/lecture-3/`, so students can reopen it after class to see the latest published revision.
Students can also save the link beside a slide heading in their notes.
Keep a heading's wording when revising its body if students should be able to return to the same passage.
The [self-study modules](../study/README.md) provide separate exercises for the same topics.

The student pages show the slide text in teaching order and omit speaker comments.
Put `<!-- in-class-only -->` on its own line at the top of a slide to reserve it for the session.
Lecture 9 uses this marker for the two-stage cache activity so students can record their first answer before the instructor gives the second prompt.
To release a reserved slide for review after class, remove its marker and publish the revision.
Run `npm run slides:pdf` to render the complete instructor decks as 16:9 PDFs under `output/pdf/lectures/`.

| Lecture | Deck                                        |
| ------- | ------------------------------------------- |
| 1       | `lecture-01-what-scalability-means.md`      |
| 2       | `lecture-02-agent-supported-development.md` |
| 3       | `lecture-03-measurement-and-evidence.md`    |
| 4       | `lecture-04-web-architecture.md`            |
| 5       | `lecture-05-development-friction.md`        |
| 6       | `lecture-06-assumptions-under-pressure.md`  |
| 7       | `lecture-07-agent-fleets.md`                |
| 8       | `lecture-08-scaling-responses.md`           |
| 9       | `lecture-09-engineering-judgment.md`        |

The drafts deliberately keep slides concise.
Worked demonstrations, screenshots, live labs, and lecturer-specific examples can be added during the voice-editing pass.
