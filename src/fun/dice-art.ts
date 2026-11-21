const PIPS: Record<number, string[]> = {
  1: ["       ", "   o   ", "       "],
  2: [" o     ", "       ", "     o "],
  3: [" o     ", "   o   ", "     o "],
  4: [" o   o ", "       ", " o   o "],
  5: [" o   o ", "   o   ", " o   o "],
  6: [" o   o ", " o   o ", " o   o "],
};

const PER_ROW = 6;

function face(value: number, sides: number): string[] {
  const middle =
    sides === 6
      ? (PIPS[value] ?? [])
      : ["       ", String(value).padStart(Math.ceil((7 + String(value).length) / 2)).padEnd(7), `  d${sides}`.padEnd(7)];
  return ["+-------+", ...middle.map((row) => `|${row}|`), "+-------+"];
}

export function drawDice(values: number[], sides: number): string {
  const rows: string[] = [];
  for (let start = 0; start < values.length; start += PER_ROW) {
    const faces = values.slice(start, start + PER_ROW).map((v) => face(v, sides));
    for (let line = 0; line < 5; line++) rows.push(faces.map((f) => f[line]).join(" "));
  }
  return rows.join("\n");
}
