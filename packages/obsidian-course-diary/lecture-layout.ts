export const phases = ["Establish", "Challenge", "Compare"] as const;

export const lectures = Array.from({ length: 9 }, (_, index) => {
  const phaseIndex = Math.floor(index / 3);
  const phase = phases[phaseIndex]!;
  const number = index + 1;
  return {
    number,
    phase,
    slot: (index % 3) + 1,
    path: `${phase}/Lecture ${number}.md`,
  };
});
