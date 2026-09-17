import { exercises, isExerciseId } from "../../shared/exercises.ts";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");

export function renderExercise(id: string): string {
  if (!isExerciseId(id)) throw new Error(`Unknown exercise: ${id}`);
  const exercise = exercises[id]!;
  const fields = exercise.fields
    .map((field) => {
      const name = `${id}-${field.id}`;
      const control =
        field.kind === "number"
          ? `<input id="${name}" data-field="${field.id}" type="number" step="any" inputmode="decimal" />`
          : `<select id="${name}" data-field="${field.id}"><option value="">Choose an answer</option>${field.options!.map((option) => `<option value="${option.value}">${escape(option.label)}</option>`).join("")}</select>`;
      return `<div class="exercise-field"><label for="${name}">${escape(field.label)}</label>${control}<p data-feedback="${field.id}" hidden></p></div>`;
    })
    .join("");
  return `<section class="book-exercise" id="exercise-${id}" data-exercise="${id}" data-version="${exercise.version}" aria-labelledby="${id}-title">
  <p class="exercise-kicker">Pause &amp; think</p>
  <h3 id="${id}-title">${escape(exercise.title)}</h3>
  <p>${escape(exercise.prompt)}</p>
  <div class="exercise-work" hidden>
    ${fields}
    <p class="exercise-privacy" id="${id}-privacy">Automatically checked practice. Saved answers are private to your account.</p>
    <p class="exercise-result" data-result role="status" aria-live="polite"></p>
    <div class="exercise-actions"><button type="button" data-check>Check answer</button><button type="button" data-save disabled>Save result</button><a data-signin hidden>Sign in to save</a></div>
    <p class="exercise-status" role="status" aria-live="polite">Checking saved answers…</p>
    <details data-previous hidden><summary>Your answers to earlier versions</summary><div></div></details>
  </div>
  <noscript><p>You can work through this question on paper. Enable JavaScript for automatic checking and saving.</p></noscript>
  <details class="exercise-discussion"><summary>Show worked answer</summary><p>${escape(exercise.discussion)}</p></details>
  </section>`;
}
