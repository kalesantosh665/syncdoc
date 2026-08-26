import type { IDocument } from "../models/document.model";
import DOMPurify from "isomorphic-dompurify";
const escapeHtml = (
  value: string
): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const documentToHtml = (
  document: IDocument
): string => {
  const blocksHtml = document.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `
            <h2>${escapeHtml(
              block.content
            )}</h2>
          `;

        case "paragraph":
          return `
            <p>${escapeHtml(
              block.content
            )}</p>
          `;

        case "code":
          return `
            <pre>
              <code class="language-${escapeHtml(
                block.language || "text"
              )}">${escapeHtml(
                block.content
              )}</code>
            </pre>
          `;

        case "list":
          return `
            <ul>
              ${(block.items || [])
                .map(
                  (item) =>
                    `<li>${escapeHtml(
                      item
                    )}</li>`
                )
                .join("")}
            </ul>
          `;

        default:
          return "";
      }
    })
    .join("\n");

 const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
    ${blocksHtml}
  </body>
</html>
`.trim();

  return DOMPurify.sanitize(html, {
    USE_PROFILES: {
      html: true,
    },
  });
};