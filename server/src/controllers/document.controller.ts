import type { Request, Response } from "express";
import { DocumentModel } from "../models/document.model";
import { documentToHtml } from "../utils/document.transformer";
import { documentToPdf } from "../utils/document.pdf";

// --------------------------------
// Create Document
// --------------------------------

export const createDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, owner, blocks } = req.body ?? {};

    const document = await DocumentModel.create({
      title,
      owner,
      blocks,
    });

    res.status(201).json(document);
  } catch (error) {
    console.error("Create document error:", error);

    res.status(400).json({
      message: "Failed to create document",
    });
  }
};

// --------------------------------
// Get All Documents
// --------------------------------

export const getDocuments = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
  const documents = await DocumentModel.find({
  isDeleted: false,
}).sort({
  updatedAt: -1,
});

    res.status(200).json(documents);
  } catch (error) {
    console.error("Get documents error:", error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
};
// --------------------------------
// Get Shared Documents
// --------------------------------

export const getSharedDocuments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = String(req.query.user || "").trim();

    if (!user) {
      res.status(400).json({
        message: "User is required",
      });
      return;
    }

    const documents = await DocumentModel.find({
      "sharedWith.user": user,
    }).sort({
      updatedAt: -1,
    });

    res.status(200).json(documents);
  } catch (error) {
    console.error(
      "Get shared documents error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch shared documents",
    });
  }
};
// --------------------------------
// Get Document By ID
// --------------------------------

export const getDocumentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document = await DocumentModel.findById(
      req.params.id
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    res.status(200).json(document);
  } catch (error) {
    console.error("Get document error:", error);

    res.status(500).json({
      message: "Failed to fetch document",
    });
  }
};

// --------------------------------
// Update Document
// --------------------------------

export const updateDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, owner, blocks } = req.body;

    const document = await DocumentModel.findByIdAndUpdate(
      req.params.id,
      {
        title,
        owner,
        blocks,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    res.status(200).json(document);
  } catch (error) {
    console.error("Update document error:", error);

    res.status(400).json({
      message: "Failed to update document",
    });
  }
};

// --------------------------------
// Export Document as HTML
// --------------------------------

export const exportDocumentHtml = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document = await DocumentModel.findById(
      req.params.id
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    const html = documentToHtml(document);

    res
      .status(200)
      .type("html")
      .send(html);
  } catch (error) {
    console.error(
      "Export document HTML error:",
      error
    );

    res.status(500).json({
      message: "Failed to export document as HTML",
    });
  }
};

// --------------------------------
// Export Document as PDF
// --------------------------------

export const exportDocumentPdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document = await DocumentModel.findById(
      req.params.id
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    const pdf = documentToPdf(document);

    res.status(200);

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}.pdf"`
    );

    pdf.pipe(res);
    pdf.end();
  } catch (error) {
    console.error(
      "Export document PDF error:",
      error
    );

    res.status(500).json({
      message: "Failed to export document as PDF",
    });
  }
};
// --------------------------------
// Share Document
// --------------------------------

export const shareDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user, permission } = req.body ?? {};

    if (!user || !user.trim()) {
      res.status(400).json({
        message: "User is required",
      });
      return;
    }

    if (
      permission !== "view" &&
      permission !== "edit"
    ) {
      res.status(400).json({
        message: "Permission must be view or edit",
      });
      return;
    }

    const document = await DocumentModel.findById(
      req.params.id
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    const normalizedUser = user.trim();

    const existingUser = document.sharedWith.find(
      (sharedUser) =>
        sharedUser.user.toLowerCase() ===
        normalizedUser.toLowerCase()
    );

    if (existingUser) {
      existingUser.permission = permission;
    } else {
      document.sharedWith.push({
        user: normalizedUser,
        permission,
      });
    }

    await document.save();

    res.status(200).json({
      message: "Document shared successfully",
      sharedWith: document.sharedWith,
    });
  } catch (error) {
    console.error(
      "Share document error:",
      error
    );

    res.status(500).json({
      message: "Failed to share document",
    });
  }
};
// --------------------------------
// Toggle Star
// --------------------------------

export const toggleStarDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document = await DocumentModel.findById(
      req.params.id
    );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    // Toggle current star state
    document.isStarred = !document.isStarred;

    await document.save();

    // Return a simple response for frontend
    res.status(200).json({
      isStarred: document.isStarred,
    });
  } catch (error) {
    console.error(
      "Toggle star error:",
      error
    );

    res.status(500).json({
      message: "Failed to update star status",
    });
  }
};

// --------------------------------
// Delete Document
// --------------------------------

export const deleteDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
  const document =
  await DocumentModel.findByIdAndUpdate(
    req.params.id,
    {
      isDeleted: true,
    },
    {
      new: true,
    }
  );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete document error:",
      error
    );

    res.status(500).json({
      message: "Failed to delete document",
    });
  }
};
// --------------------------------
// Get Trash Documents
// --------------------------------

export const getTrashDocuments = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const documents = await DocumentModel.find({
      isDeleted: true,
    }).sort({
      updatedAt: -1,
    });

    res.status(200).json(documents);
  } catch (error) {
    console.error(
      "Get trash documents error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch trash documents",
    });
  }
};
// --------------------------------
// Restore Document
// --------------------------------

export const restoreDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document =
      await DocumentModel.findByIdAndUpdate(
        req.params.id,
        {
          isDeleted: false,
        },
        {
          new: true,
        }
      );

    if (!document) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }

    res.status(200).json({
      message: "Document restored successfully",
      document,
    });
  } catch (error) {
    console.error(
      "Restore document error:",
      error
    );

    res.status(500).json({
      message: "Failed to restore document",
    });
  }
};
// --------------------------------
// Permanently Delete Document
// --------------------------------

export const permanentlyDeleteDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const document =
      await DocumentModel.findOneAndDelete({
        _id: req.params.id,
        isDeleted: true,
      });

    if (!document) {
      res.status(404).json({
        message: "Trash document not found",
      });
      return;
    }

    res.status(200).json({
      message: "Document permanently deleted",
    });
  } catch (error) {
    console.error(
      "Permanent delete error:",
      error
    );

    res.status(500).json({
      message: "Failed to permanently delete document",
    });
  }
};