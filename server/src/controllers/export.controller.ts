import type { Request, Response } from "express";
import mongoose from "mongoose";
import DOMPurify from "isomorphic-dompurify";

import { DocumentModel } from "../models/document.model";
import { documentToPdf } from "../services/document-export.service";

// ============================================================
// TYPES
// ============================================================

interface ExportBlock {
  type: string;
  content?: string;
  language?: string;
  items?: string[];
}

interface ExportDocument {
  title: string;
  owner: string;
  blocks: ExportBlock[];
}

// ============================================================
// HTML ESCAPING
// ============================================================

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ============================================================
// AST → HTML
// ============================================================

const documentToHTML = (
  document: ExportDocument
): string => {
  let html = "";

  // ----------------------------------------------------------
  // Document Header
  // ----------------------------------------------------------

  html += `
    <h1>${escapeHtml(document.title)}</h1>

    <p>
      <strong>Owner:</strong>
      ${escapeHtml(document.owner)}
    </p>
  `;

  // ----------------------------------------------------------
  // Blocks
  // ----------------------------------------------------------

  for (const block of document.blocks) {
    switch (block.type) {
      // ======================================================
      // HEADING
      // ======================================================

      case "heading":
        html += `
          <h2>
            ${escapeHtml(block.content ?? "")}
          </h2>
        `;

        break;

      // ======================================================
      // PARAGRAPH
      // ======================================================

      case "paragraph":
        html += `
          <p>
            ${escapeHtml(block.content ?? "")}
          </p>
        `;

        break;

      // ======================================================
      // CODE
      // ======================================================

      case "code": {
        const language =
          block.language || "text";

        html += `
          <pre>
            <code class="language-${escapeHtml(
              language
            )}">${escapeHtml(
              block.content ?? ""
            )}</code>
          </pre>
        `;

        break;
      }

      // ======================================================
      // LIST
      // ======================================================

      case "list":
        html += "<ul>";

        for (
          const item of block.items ?? []
        ) {
          html += `
            <li>
              ${escapeHtml(item)}
            </li>
          `;
        }

        html += "</ul>";

        break;

      // ======================================================
      // UNKNOWN BLOCK
      // ======================================================

      default:
        console.warn(
          `Unknown block type: ${block.type}`
        );

        break;
    }
  }

  return html;
};

// ============================================================
// HTML EXPORT
// ============================================================

export const exportDocumentHTML = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // IMPORTANT:
    // Express params can be typed as string | string[]
    // So convert it explicitly to string.

    const id = String(
      req.params.id ?? ""
    );

    // --------------------------------------------------------
    // Validate ObjectId
    // --------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      res.status(400).json({
        message: "Invalid document ID",
      });

      return;
    }

    // --------------------------------------------------------
    // Find document
    // --------------------------------------------------------

    const document =
      await DocumentModel.findById(id).lean();

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });

      return;
    }

    // --------------------------------------------------------
    // Convert MongoDB document → export structure
    // --------------------------------------------------------

    const exportDocument: ExportDocument = {
      title: String(document.title),
      owner: String(document.owner),
      blocks: document.blocks.map(
        (block) => ({
          type: String(block.type),
          content:
            "content" in block
              ? String(block.content ?? "")
              : undefined,
          language:
            "language" in block
              ? String(
                  block.language ?? "text"
                )
              : undefined,
          items:
            "items" in block
              ? (block.items ?? []).map(
                  (item) =>
                    String(item)
                )
              : undefined,
        })
      ),
    };

    // --------------------------------------------------------
    // AST → HTML
    // --------------------------------------------------------

    const rawHTML =
      documentToHTML(
        exportDocument
      );

    // --------------------------------------------------------
    // DOMPurify
    // --------------------------------------------------------

    const safeHTML =
      DOMPurify.sanitize(
        rawHTML,
        {
          USE_PROFILES: {
            html: true,
          },
        }
      );

    // --------------------------------------------------------
    // Final HTML document
    // --------------------------------------------------------

    const finalHTML = `<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    ${escapeHtml(
      exportDocument.title
    )}
  </title>

  <style>

    body {
      font-family:
        Arial,
        Helvetica,
        sans-serif;

      max-width: 900px;

      margin: 40px auto;

      padding: 0 20px;

      color: #111827;

      background: #ffffff;

      line-height: 1.6;
    }

    h1 {
      font-size: 36px;

      margin-bottom: 10px;
    }

    h2 {
      font-size: 24px;

      margin-top: 30px;

      margin-bottom: 12px;
    }

    p {
      margin: 12px 0;
    }

    pre {
      background: #f3f4f6;

      padding: 16px;

      border-radius: 8px;

      overflow-x: auto;

      border: 1px solid #e5e7eb;
    }

    code {
      font-family:
        Consolas,
        Monaco,
        "Courier New",
        monospace;

      font-size: 14px;
    }

    li {
      margin-bottom: 6px;
    }

  </style>

</head>

<body>

  ${safeHTML}

</body>

</html>`;

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.status(200).send(
      finalHTML
    );
  } catch (error) {
    console.error(
      "HTML export error:",
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        message:
          "Failed to export document as HTML",
      });
    }
  }
};

// ============================================================
// PDF EXPORT
// ============================================================

export const exportDocumentPDF = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // IMPORTANT:
    // Convert Express route param to string.

    const id = String(
      req.params.id ?? ""
    );

    // --------------------------------------------------------
    // Validate ObjectId
    // --------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      res.status(400).json({
        message: "Invalid document ID",
      });

      return;
    }

    // --------------------------------------------------------
    // Find document
    // --------------------------------------------------------

    const document =
      await DocumentModel.findById(id);

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });

      return;
    }

    // --------------------------------------------------------
    // Convert AST → PDF
    // --------------------------------------------------------

    const pdf =
      documentToPdf(document);

    // --------------------------------------------------------
    // Safe filename
    // --------------------------------------------------------

    const safeFileName =
      document.title
        .replace(
          /[^a-z0-9]/gi,
          "_"
        )
        .replace(
          /_+/g,
          "_"
        )
        .slice(
          0,
          100
        ) ||
      "syncdoc_document";

    // --------------------------------------------------------
    // PDF Headers
    // --------------------------------------------------------

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName}.pdf"`
    );

    // --------------------------------------------------------
    // Stream PDF
    // --------------------------------------------------------

    pdf.pipe(res);

    pdf.end();
  } catch (error) {
    console.error(
      "PDF export error:",
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        message:
          "Failed to export document as PDF",
      });
    }
  }
};