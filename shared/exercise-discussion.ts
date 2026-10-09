import {
  exercises,
  checkExercise,
  type ExerciseResponse,
} from "./exercises.ts";

/** A reviewed handoff includes this attempt and checker evidence, never the worked answer. */
export function exerciseDiscussion(id: string, answer: ExerciseResponse) {
  const exercise = exercises[id];
  if (!exercise) throw new Error("Unknown exercise.");
  const result = checkExercise(id, answer);
  const fields = exercise.fields.map((field) => {
    const value = answer[field.id] ?? "";
    const label =
      field.options?.find((option) => option.value === value)?.label ?? value;
    return `${field.label}: ${label}`;
  });
  return [
    `Help me understand my attempt at ${exercise.title} (exercise ${id}, version ${exercise.version}).`,
    `Question:\n${exercise.prompt}`,
    `My answers:\n${fields.join("\n")}`,
    `Automatic checker feedback:\n${result.fields.map((field) => `${field.id}: ${field.correct ? "Correct" : "Not quite"}. ${field.explanation}`).join("\n")}`,
    "Discuss my reasoning and what I could check next. This attempt and automatic checking do not establish independent mastery.",
  ].join("\n\n");
}
