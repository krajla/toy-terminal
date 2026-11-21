// A small pixel icon for each game at Robert's table, drawn by scripts/icons.ts.
export const EMBLEMS: Record<string, string> = {
  "Heart: The City Beneath": "heart",
  "Delta Green": "delta",
  "Blades in the Dark": "dagger",
  "D&D": "dragon",
};

const SCALE = 3;

export function icon(name: string): HTMLImageElement {
  const img = document.createElement("img");
  img.className = name === "heart" ? "icon beat" : "icon";
  img.src = `/icons/${name}.png`;
  img.alt = name;
  img.height = 16 * SCALE;
  return img;
}
