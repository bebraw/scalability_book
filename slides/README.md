# Lecture slide drafts

These Markdown decks are the student reading editions for nine lectures.
Lecture 1 has two presentations.
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
Run `npm run slides:pdf` to render one 16:9 PDF per deck under `output/pdf/lectures/`.
To reuse a book diagram, copy its `{{ import "site/includes/…-figure.html" }}` line from the chapter into the slide.
Both the student page and the offline PDF render the diagram from the book source.
For Lecture 1, the instructor's Obsidian teaching vault also has separate Lecture Studio presentations for the welcome and the chapter.
Both decks finish with written questions through Lecture Studio’s **Ask a question** control.
Open the chapter with the moderated word cloud, then use the embedded pipeline demo to vary demand and capacity before discussing Implementation A.
The web pages and PDFs are reading copies.
The [teaching plan](../lecture_plan.md#1-course-introduction-and-a-common-view-of-scalability) covers timing, keeping questions for follow-up and saving the cloud for Lecture 9.

For Lecture 2, open **02 Coding agents and first experiences** in the teaching vault to run the experience poll and the review-queue poll.
The [Lecture 2 teaching plan](../lecture_plan.md#2-coding-agents-and-first-experiences) includes the recorder example, the sequence for the release demo and a board exercise for each.

| Lecture | Deck                                                           |
| ------- | -------------------------------------------------------------- |
| 1       | [Course welcome and project launch](lecture-01-orientation.md) |
| 1       | [What scalability means](lecture-01-what-scalability-means.md) |
| 2       | `lecture-02-agent-supported-development.md`                    |
| 3       | `lecture-03-measurement-and-evidence.md`                       |
| 4       | `lecture-04-web-architecture.md`                               |
| 5       | `lecture-05-development-friction.md`                           |
| 6       | `lecture-06-assumptions-under-pressure.md`                     |
| 7       | `lecture-07-agent-fleets.md`                                   |
| 8       | `lecture-08-scaling-responses.md`                              |
| 9       | `lecture-09-engineering-judgment.md`                           |

Keep projected slides short enough to read at a glance.
A useful classroom starting point is 24 pt for body text and table cells, and 36 pt for slide headings.
Check from the back of the room and move detail into presenter notes or the linked reading when a slide gets crowded. [Aalto’s checklist for accessible learning materials](https://www.aalto.fi/en/services/checklist-for-the-accessibility-of-learning-material-and-digital-content)
A question, a picture or a few figures often gives the lecturer enough to work with.
When a demo can show the idea, pause for a prediction, change one input and discuss what the class observes.
Put operating steps, expected results and a fallback in the private presenter notes.
Link the student-facing demo so students can try it again after class.
