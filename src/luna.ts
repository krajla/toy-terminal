export interface LunaPhoto {
  name: string;
  caption: string;
  width: number;
  height: number;
  reserved?: boolean;
}

export const SCALE = 3;

export const NIGHT: LunaPhoto = { name: "night", caption: "Luna, in the monitor glow. Late, again.", width: 150, height: 176, reserved: true };

// Made from night.png outside the repo, so it is not in LUNA_PHOTOS and scripts/dither.ts skips it.
export const NIGHT_POV: LunaPhoto = { ...NIGHT, name: "night_luna_pov", caption: "The same night, through Luna's eyes." };

// scripts/dither.ts reads these sizes. A reserved photo belongs to one command and stays out of `luna`.
export const LUNA_PHOTOS: LunaPhoto[] = [
  { name: "judge", caption: "Luna, under the plant, judging you.", width: 150, height: 200 },
  { name: "peek", caption: "Luna, around the door. She saw that.", width: 150, height: 200 },
  { name: "belly", caption: "Luna, on her back. It is a trap.", width: 180, height: 180 },
  { name: "box", caption: "Luna, in the Ark Nova box. Game night is cancelled.", width: 180, height: 144 },
  { name: "laptop", caption: "Luna, on the laptop. No more commits today.", width: 160, height: 160 },
  { name: "upside", caption: "Luna, upside down. Or maybe you are.", width: 150, height: 200 },
  { name: "pillow", caption: "Luna, on your pillow. It is her pillow now.", width: 200, height: 150 },
  { name: "blep", caption: "Luna, mid-blep. She will deny this.", width: 150, height: 200 },
  { name: "sleep", caption: "Luna, asleep. Do not make a sound.", width: 180, height: 180 },
  { name: "nap", caption: "Luna, flat out. Paws up, systems down.", width: 180, height: 132 },
  { name: "sit", caption: "Luna, sitting like a person. She has a question for you.", width: 150, height: 200 },
  { name: "stare", caption: "Luna, too close to the camera. She knows.", width: 150, height: 200 },
  { name: "desk", caption: "Luna, under the monitor. The warmest seat in the house.", width: 150, height: 200 },
  { name: "league", caption: "Luna, watching League. She would have flashed earlier.", width: 150, height: 165, reserved: true },
  { name: "swipe", caption: "Luna, at full speed.", width: 150, height: 200, reserved: true },
  { name: "boss", caption: "Luna, waiting for you at the end.", width: 150, height: 200, reserved: true },
  NIGHT,
];

export const POSES = LUNA_PHOTOS.filter((p) => !p.reserved);

export interface LunaClip {
  name: string;
  width: number;
  height: number;
  frames: number;
  fps: number;
}

// scripts/animate.ts writes the frames of a clip stacked from top to bottom in one PNG.
export const PLAY_CLIP: LunaClip = { name: "play", width: 160, height: 120, frames: 80, fps: 8 };

export function photo(p: LunaPhoto): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "dither";
  img.src = `/luna/${p.name}.png`;
  img.alt = p.caption;
  img.width = p.width * SCALE;
  img.height = p.height * SCALE;
  return img;
}

export function clip(c: LunaClip): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "clip";
  box.style.width = `${c.width * SCALE}px`;
  box.style.aspectRatio = `${c.width} / ${c.height}`;
  const img = document.createElement("img");
  img.src = `/luna/${c.name}.png`;
  img.alt = "Luna plays with her sardine toy.";
  img.style.setProperty("--frames", String(c.frames));
  img.style.setProperty("--duration", `${c.frames / c.fps}s`);
  box.append(img);
  return box;
}
