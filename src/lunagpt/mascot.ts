const SVG = "http://www.w3.org/2000/svg";

// Luna's face as pixels: folded ears, amber eyes, pink nose, whiskers. Keys are classes in style.css.
const FACE = [
  "...ee....ee...",
  "..eFFFFFFFFe..",
  ".FFFFFFFFFFFF.",
  ".FFapFFFFpaFF.",
  ".FFbbFFFFbbFF.",
  "wFFFFFnnFFFFFw",
  "..FFFFFFFFFF..",
  "...FFFFFFFF...",
];
// The eye has an upper row (a, p) and a lower row (b). A blink closes it to a dark line in the lower row.
const CLASS: Record<string, string> = { F: "px-fur", e: "px-ear", a: "px-eye", p: "px-pupil", b: "px-eye-low", n: "px-nose", w: "px-whisker" };

export function mascot(): SVGSVGElement {
  const width = FACE[0]?.length ?? 0;
  const art = document.createElementNS(SVG, "svg");
  art.setAttribute("viewBox", `0 0 ${width} ${FACE.length}`);
  art.setAttribute("class", "mascot");
  art.setAttribute("aria-hidden", "true");
  FACE.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const cls = CLASS[ch];
      if (!cls) return;
      const px = document.createElementNS(SVG, "rect");
      for (const [k, v] of Object.entries({ x, y, width: 1, height: 1, class: cls })) px.setAttribute(k, String(v));
      art.append(px);
    });
  });
  return art;
}
