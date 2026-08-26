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
  // Helper: Check page space
  // --------------------------------

  const ensureSpace = (
    requiredHeight: number
  ) => {
    const pageHeight =
      pdf.page.height;

    const bottomMargin =
      pdf.page.margins.bottom;

    const availableSpace =
      pageHeight -
      bottomMargin -
      pdf.y;

    if (
      availableSpace <
      requiredHeight
    ) {
      pdf.addPage();
    }
  };

  // --------------------------------
  // Document Title
  // --------------------------------

  ensureSpace(80);

  pdf
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor("#111827")
    .text(document.title, {
      align: "left",
    });

  // --------------------------------
  // Owner
  // --------------------------------

  pdf
    .moveDown(0.5)
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(
      `Owner: ${document.owner}`
    );

  // --------------------------------
  // Header separator
  // --------------------------------

  pdf.moveDown(0.8);

  pdf
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .moveTo(
      pdf.page.margins.left,
      pdf.y
    )
    .lineTo(
      pdf.page.width -
        pdf.page.margins.right,
      pdf.y
    )
    .stroke();

  pdf.moveDown(1);

  // Reset color
  pdf.fillColor("#111827");

  // --------------------------------
  // Blocks
  // --------------------------------

  for (const block of document.blocks) {
    switch (block.type) {
      // ==================================
      // HEADING
      // ==================================

      case "heading": {
        ensureSpace(60);

        pdf
          .moveDown(0.7)
          .font("Helvetica-Bold")
          .fontSize(18)
          .fillColor("#111827")
          .text(block.content, {
            lineGap: 4,
          });

        break;
      }

      // ==================================
      // PARAGRAPH
      // ==================================

      case "paragraph": {
        ensureSpace(60);

        pdf
          .moveDown(0.4)
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#374151")
          .text(block.content, {
            lineGap: 5,
            align: "left",
          });

        break;
      }

      // ==================================
      // CODE
      // ==================================

      case "code": {
        ensureSpace(100);

        pdf.moveDown(0.7);

        // Language label
        pdf
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#6b7280")
          .text(
            (
              block.language ||
              "text"
            ).toUpperCase()
          );

        pdf.moveDown(0.3);

        // Code content
        pdf
          .font("Courier")
          .fontSize(9)
          .fillColor("#111827")
          .text(block.content, {
            lineGap: 3,
            indent: 10,
            width:
              pdf.page.width -
              pdf.page.margins.left -
              pdf.page.margins.right -
              20,
          });

        // Reset font
        pdf
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#111827");

        break;
      }

      // ==================================
      // LIST
      // ==================================

      case "list": {
        ensureSpace(60);

        pdf.moveDown(0.5);

        for (const item of block.items ||
          []) {
          ensureSpace(30);

          pdf
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#374151")
            .text(`• ${item}`, {
              indent: 15,
              lineGap: 4,
            });
        }

        break;
      }

      default:
        break;
    }
  }

  // --------------------------------
  // Footer
  // --------------------------------

  const addFooter = () => {
    const pageCount =
      pdf.bufferedPageRange();

    for (
      let i = pageCount.start;
      i <
      pageCount.start +
        pageCount.count;
      i++
    ) {
      pdf.switchToPage(i);

      const footerY =
        pdf.page.height -
        pdf.page.margins.bottom +
        20;

      pdf
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#9ca3af")
        .text(
          `SyncDoc • Page ${
            i + 1
          }`,
          pdf.page.margins.left,
          footerY,
          {
            align: "center",
            width:
              pdf.page.width -
              pdf.page.margins.left -
              pdf.page.margins.right,
          }
        );
    }

    // Restore last page
    pdf.switchToPage(
      pageCount.start +
        pageCount.count -
        1
    );
  };

  addFooter();

  return pdf;
};