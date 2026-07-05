export const PARTICIPANT_COLORS = [
  "#1a73e8",
  "#d33f49",
  "#8e24aa",
  "#00897b",
  "#f9a825",
  "#5e35b1",
  "#00acc1",
  "#6d4c41",
];

export function colorForIndex(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

export function labelForIndex(index: number): string {
  const letters = [];
  let n = index;
  do {
    letters.unshift(String.fromCharCode(65 + (n % 26)));
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters.join("");
}
