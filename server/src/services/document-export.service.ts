import PDFDocument from "pdfkit";
import type { IDocument } from "../models/document.model";

export const documentToPdf = (
  document: IDocument
): PDFKit.PDFDocument => {
  const pdf = new PDFDocument({
    size: "A4",
    margin: 50,

    info: {
      Title: document.title,
      Author: document.owner,
    },
  });

  // --------------------------------
  // Document Title
  // --------------------------------

  pdf
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor("#111827")
    .text(document.title);

  // --------------------------------
  // Owner
  // --------------------------------

  pdf
    .moveDown(0.5)
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(`Owner: ${document.owner}`);

  pdf.moveDown(1);

  // Reset color
  pdf.fillColor("#111827");

  // --------------------------------
  // AST Blocks
  // --------------------------------

  for (const block of document.blocks) {
    switch (block.type) {
      // --------------------------------
      // Heading
      // --------------------------------

      case "heading":
        pdf
          .moveDown(0.8)
          .font("Helvetica-Bold")
          .fontSize(18)
          .fillColor("#111827")
          .text(block.content);

        break;

      // --------------------------------
      // Paragraph
      // --------------------------------

      case "paragraph":
        pdf
          .moveDown(0.5)
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#111827")
          .text(block.content, {
            lineGap: 4,
          });

        break;

      // --------------------------------
      // Code
      // --------------------------------

      case "code":
        pdf
          .moveDown(0.7)
          .font("Courier")
          .fontSize(9)
          .fillColor("#111827")
          .text(block.content, {
            lineGap: 3,
            indent: 10,
          });

        pdf
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#111827");

        break;

      // --------------------------------
      // List
      // --------------------------------

      case "list":
        pdf.moveDown(0.5);

        for (const item of block.items ?? []) {
          pdf
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#111827")
            .text(`• ${item}`, {
              indent: 15,
              lineGap: 3,
            });
        }

        break;
    }
  }

  return pdf;
};