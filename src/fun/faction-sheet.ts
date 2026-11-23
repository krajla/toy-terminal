// The Hacan faction sheet of Twilight Imperium 4 with Luna's face. scripts/hacan.ts makes the image.
export function factionSheet(): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "zoom-sheet";
  img.src = "/luna/hacan.png";
  img.alt = "The Emirates of Luna: a Twilight Imperium faction sheet with Luna as the Hacan emir.";
  img.width = 1200;
  img.height = 816;
  return img;
}
