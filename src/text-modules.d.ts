// Bun imports any file as a string with `with { type: "text" }`. TypeScript needs a declaration for each extension.
declare module "*.go" {
  const text: string;
  export default text;
}

declare module "*.enc" {
  const text: string;
  export default text;
}
