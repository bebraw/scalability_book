import { Marked, type Token, type Tokens } from "marked";
import katex from "katex";

// Parse Markdown, then build only the supported DOM. Model-authored HTML is
// always text; images never load. MathML comes only from KaTeX with trust off.
const markdown = new Marked({
  gfm: true,
  extensions: [
    {
      name: "learningMathBlock",
      level: "block",
      start: (text) => text.search(/\\\[|\$\$/),
      tokenizer(text) {
        const match = /^(?:\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$)/.exec(text);
        if (match)
          return {
            type: "learningMathBlock",
            raw: match[0],
            text: match[1] ?? match[2],
          };
      },
    },
    {
      name: "learningMathInline",
      level: "inline",
      start: (text) => text.search(/\\\(|\$(?!\$|\s)/),
      tokenizer(text) {
        const match =
          /^(?:\\\(([^\n]+?)\\\)|\$(?!\$|\s)((?:\\.|[^\\$\n])*?[^\\$\s])\$(?!\d))/.exec(
            text,
          );
        if (match)
          return {
            type: "learningMathInline",
            raw: match[0],
            text: match[1] ?? match[2],
          };
      },
    },
  ],
});

function appendMath(parent: HTMLElement, token: Token) {
  const displayMode = token.type === "learningMathBlock";
  const math = document.createElement(displayMode ? "div" : "span");
  math.className = "learning-math";
  try {
    katex.render((token as Tokens.Generic).text, math, {
      output: "mathml",
      displayMode,
      trust: false,
      throwOnError: true,
      maxExpand: 100,
      maxSize: 10,
      strict: "ignore",
    });
  } catch {
    const fallback = document.createElement("code");
    fallback.textContent = token.raw;
    math.append(fallback);
  }
  parent.append(math);
}

function appendTokens(parent: HTMLElement, tokens: Token[]) {
  for (const token of tokens) {
    switch (token.type) {
      case "space":
      case "def":
        break;
      case "learningMathInline":
      case "learningMathBlock":
        appendMath(parent, token);
        break;
      case "paragraph":
      case "heading":
      case "blockquote":
      case "strong":
      case "em":
      case "del": {
        const tag =
          token.type === "paragraph"
            ? "p"
            : token.type === "heading"
              ? `h${Math.min(6, (token as Tokens.Heading).depth + 3)}`
              : token.type;
        const child = document.createElement(tag);
        appendTokens(child, token.tokens as Token[]);
        parent.append(child);
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        const child = document.createElement(list.ordered ? "ol" : "ul");
        if (child instanceof HTMLOListElement && typeof list.start === "number")
          child.start = list.start;
        for (const item of list.items) {
          const row = document.createElement("li");
          if (item.task) row.append(item.checked ? "☑ " : "☐ ");
          appendTokens(row, item.tokens);
          child.append(row);
        }
        parent.append(child);
        break;
      }
      case "table": {
        const data = token as Tokens.Table;
        const wrapper = document.createElement("div");
        wrapper.className = "learning-reply-table";
        const table = document.createElement("table");
        const head = table.createTHead().insertRow();
        const body = table.createTBody();
        const cells = (
          row: HTMLTableRowElement,
          values: Tokens.TableCell[],
          header: boolean,
        ) => {
          for (const value of values) {
            const cell = document.createElement(header ? "th" : "td");
            if (header) cell.setAttribute("scope", "col");
            appendTokens(cell, value.tokens);
            row.append(cell);
          }
        };
        cells(head, data.header, true);
        for (const values of data.rows) cells(body.insertRow(), values, false);
        wrapper.append(table);
        parent.append(wrapper);
        break;
      }
      case "link": {
        const value = token as Tokens.Link;
        let href: URL | null = null;
        try {
          const url = new URL(value.href, location.href);
          if (/^https?:$/.test(url.protocol) && !url.username && !url.password)
            href = url;
        } catch {
          /* Invalid destinations remain readable text. */
        }
        const child = document.createElement(href ? "a" : "span");
        if (href && child instanceof HTMLAnchorElement) {
          child.href = href.href;
          if (href.origin !== location.origin) {
            child.target = "_blank";
            child.rel = "noopener noreferrer";
          }
        }
        appendTokens(child, value.tokens);
        parent.append(child);
        break;
      }
      case "code":
      case "codespan": {
        const code = document.createElement("code");
        code.textContent = token.text as string;
        if (token.type === "code") {
          const pre = document.createElement("pre");
          pre.append(code);
          parent.append(pre);
        } else parent.append(code);
        break;
      }
      case "br":
      case "hr":
        parent.append(document.createElement(token.type));
        break;
      case "text":
        if (token.tokens) appendTokens(parent, token.tokens as Token[]);
        else parent.append(token.text as string);
        break;
      case "escape":
      case "image":
        parent.append(token.text as string);
        break;
      default:
        // Includes raw HTML and unsupported extensions: never interpret them.
        parent.append(token.raw);
    }
  }
}

export function renderLearningReply(text: string): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "learning-reply";
  try {
    appendTokens(body, markdown.lexer(text));
  } catch {
    body.replaceChildren(document.createTextNode(text));
  }
  return body;
}
