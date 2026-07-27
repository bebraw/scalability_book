declare module "@citation-js/core" {
  export class Cite {
    constructor(data: readonly unknown[]);

    format(
      kind: "bibliography" | "citation",
      options: Readonly<Record<string, unknown>>,
    ): string;
  }
}
