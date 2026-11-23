// A small sitting cat from asciiart.eu (artist unknown). The face is replaceable, and the tail can flick to the
// other side. pet and catsay both draw this cat.
export function sittingCat(face: string, flick = false): string {
  const top = flick
    ? [String.raw`  /\_/\  )`, ` ${face} (_`, String.raw`   \"/  )`]
    : [String.raw`  /\_/\  (`, ` ${face} _)`, String.raw`   \"/  (`];
  return [...top, " ( | | )", "(__d b__)"].join("\n");
}
