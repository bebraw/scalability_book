import { htmlispToHTMLSync } from "gustwind/htmlisp";

type HtmlispProps = Record<string, unknown>;

export function renderHtmlisp(
  htmlInput: string,
  props: HtmlispProps = {},
): string {
  const rawBlocks: string[] = [];
  const rendered = htmlispToHTMLSync({
    htmlInput,
    components: {
      Raw: ({ html }: { html?: string }) => {
        const index = rawBlocks.push(html || " ") - 1;

        return `HTMLISP_RAW_${index}`;
      },
    },
    props,
    renderOptions: { escapeByDefault: true },
  });

  return normalizeVoidTags(
    rawBlocks.reduce(
      (html, rawBlock, index) =>
        html.replaceAll(`HTMLISP_RAW_${index}`, rawBlock),
      rendered,
    ),
  );
}

function normalizeVoidTags(html: string): string {
  return html.replaceAll("</meta>", "").replaceAll("</link>", "");
}
