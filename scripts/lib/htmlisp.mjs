import { htmlispToHTMLSync } from "gustwind/htmlisp";

export function renderHtmlisp(htmlInput, props = {}) {
  const rawBlocks = [];
  const rendered = htmlispToHTMLSync({
    htmlInput,
    components: {
      Raw: ({ html }) => {
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

function normalizeVoidTags(html) {
  return html.replaceAll("</meta>", "").replaceAll("</link>", "");
}
