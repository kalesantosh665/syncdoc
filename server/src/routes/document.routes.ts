import { Router } from "express";

import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocuments,
  getSharedDocuments,
  shareDocument,
  toggleStarDocument,
  updateDocument,
  getTrashDocuments,
restoreDocument,
permanentlyDeleteDocument,
} from "../controllers/document.controller";

import {
  exportDocumentHTML,
  exportDocumentPDF,
} from "../controllers/export.controller";

const router = Router();

// --------------------------------
// Create Document
// --------------------------------

router.post(
  "/",
  createDocument
);

// --------------------------------
// List All Documents
// --------------------------------

router.get(
  "/",
  getDocuments
);

// --------------------------------
// Shared With Me
// IMPORTANT: Must come BEFORE /:id
// --------------------------------
router.get(
  "/trash",
  getTrashDocuments
);
router.get(
  "/shared-with-me",
  getSharedDocuments
);

// --------------------------------
// Export HTML
// --------------------------------

router.get(
  "/:id/html",
  exportDocumentHTML
);

// --------------------------------
// Export PDF
// --------------------------------

router.get(
  "/:id/pdf",
  exportDocumentPDF
);

// --------------------------------
// Star / Unstar
// --------------------------------

router.put(
  "/:id/star",
  toggleStarDocument
);

router.put(
  "/:id/restore",
  restoreDocument
);
// --------------------------------
// Share Document
// --------------------------------
router.delete(
  "/:id/permanent",
  permanentlyDeleteDocument
);
router.post(
  "/:id/share",
  shareDocument
);

// --------------------------------
// Get Single Document
// IMPORTANT: Keep this AFTER
// all specific routes
// --------------------------------

router.get(
  "/:id",
  getDocumentById
);

// --------------------------------
// Update Document
// --------------------------------

router.put(
  "/:id",
  updateDocument
);

// --------------------------------
// Delete Document
// --------------------------------

router.delete(
  "/:id",
  deleteDocument
);


export default router;