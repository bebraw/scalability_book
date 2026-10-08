# Reviewing book changes

Run this from the repository:

```sh
npm run review
```

The command generates `.local/reviews/book-changes.html` and opens it in your default browser.
It compares the current working copy with `HEAD`, including the combined result of staged and unstaged edits, new non-ignored files, and deletions.
It does not stage, commit, or modify source files.
The report is a snapshot; rerun the command after further edits.

Git and Python 3.10 or newer must be available as `git` and `python3`.
The generator uses only Python's standard library; the resulting HTML works offline without a server or external assets.

## Serving a review

When presenting a highlighted review to the user, serve it over loopback HTTP and provide a clickable browser URL.
Open and inspect the rendered report before handing it over; a link to the HTML file alone is insufficient.

Copy the current report into a dedicated directory under `.local/reviews/` and serve only that directory, bound to `127.0.0.1`, on an available port.
Keep the server running until the user asks to close it.
After further edits, regenerate the report and refresh the served copy.

## Reading the report

Book chapters, case studies, and the bibliography come first, followed by assignments, slides, demo wording, teaching notes, documentation, and code.
The first six text files are expanded.
Green highlights additions, and red strikethrough marks removals.
Unchanged passages are collapsed to two surrounding lines by default.

Use **Read revised text only** to hide the old wording, filter by any part of a file path, or jump to a file from the index.
**Expand all** and **Collapse all** affect the files currently visible through the filter.
The revised-text view still shows only the changed passages and their context, not the complete book.

## Useful comparisons

| Task                                      | Command                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Review the working copy                   | `npm run review`                                                    |
| Review only staged changes                | `npm run review -- --staged`                                        |
| Review the latest commit                  | `npm run review -- --base HEAD~1 --to HEAD`                         |
| Compare two committed snapshots           | `npm run review -- --base main --to my-branch`                      |
| Focus on book content and course material | `npm run review -- --book-only`                                     |
| Keep more surrounding text                | `npm run review -- --context 5`                                     |
| Save without opening a browser            | `npm run review -- --no-open`                                       |
| Keep a named report                       | `npm run review -- --output .local/reviews/before-publication.html` |

`--base` defaults to `HEAD`; without `--to` or `--staged`, the target is the working copy.
`--to` and `--staged` cannot be combined.
Revision comparisons use the two selected commit trees directly, not their merge base, and ignore uncommitted changes.
`--book-only` includes `book/`, `case-studies/`, `specifications/`, `slides/`, and `bibliography.bib`, including teaching notes and project fixtures in those directories.

## Representation limits

The report displays source text with word-level highlights, so Markdown syntax remains visible.
It normalizes Markdown table padding outside fenced code to reduce alignment noise; counts describe the normalized lines.
It also identifies final-newline and executable-mode changes.
Renames appear as a deletion and an addition.

Binary files, non-UTF-8 files, symlinks, submodules, and files larger than 1 MiB are listed without a text preview.
Very large changed passages receive whole-passage highlighting instead of word matching.
The command refuses to overwrite a tracked file with its output.
The default `.local/` destination is ignored by Git and is separate from the published site build.

For the exact raw patch, use `git diff` or `git diff --cached` alongside the review page.

## Maintaining the tool

The generator is [scripts/review-diff.py](../scripts/review-diff.py); the embedded page styles and controls live in [scripts/review-diff-assets/](../scripts/review-diff-assets/).
Run `npm run test:review` for integration checks against disposable Git repositories.
These cover working-copy, staged, and committed comparisons, new and deleted files, metadata changes, escaping, table normalization, excluded output, and unsupported file types.
