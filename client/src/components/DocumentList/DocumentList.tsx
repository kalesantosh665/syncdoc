import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBell,
  FaChevronDown,
  FaCog,
  FaFileAlt,
  FaFolder,
  FaPlus,
  FaSearch,
  FaStar,
  FaTrash,
  FaUsers,
  FaShareAlt,
} from "react-icons/fa";

import {
  getDocuments,
  getSharedDocuments,
  getTrashDocuments,
  deleteDocument as deleteDocumentApi,
  toggleStarDocument,
  shareDocument,
  restoreDocument,
  permanentlyDeleteDocument,
  
} from "../../services/api";

import "./DocumentList.css";

interface DocumentBlock {
  _id?: string;
  type: string;
  content?: string;
  items?: string[];
}

interface Document {
  _id: string;
  title: string;
  owner: string;
  blocks: DocumentBlock[];
  updatedAt?: string;
  isStarred?: boolean;
  isDeleted?: boolean;
}

type ViewMode =
  | "documents"
  | "shared"
  | "starred"
  | "trash";

function DocumentList() {
  // --------------------------------
  // State
  // --------------------------------

  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] =
    useState<ViewMode>("documents");
const [shareDocumentId, setShareDocumentId] =
  useState<string | null>(null);

const [shareUser, setShareUser] =
  useState("");

const [sharePermission, setSharePermission] =
  useState<"view" | "edit">("view");

const [sharing, setSharing] =
  useState(false);

const [shareError, setShareError] =
  useState("");

const [shareSuccess, setShareSuccess] =
  useState("");
  // Used to prevent older async requests
  // from overwriting newer data.
  const requestIdRef = useRef(0);

  // --------------------------------
  // Fetch All Documents
  // --------------------------------

  const fetchDocuments = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError("");

      const result = await getDocuments();

      // Ignore stale request
      if (requestId !== requestIdRef.current) {
        return;
      }

      setDocuments(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "Failed to fetch documents:",
        err
      );

      setError("Failed to load documents.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // --------------------------------
  // Fetch Shared Documents
  // --------------------------------

  const fetchSharedDocuments = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError("");

      const result =
        await getSharedDocuments("user2");

      // Ignore stale request
      if (requestId !== requestIdRef.current) {
        return;
      }

      setDocuments(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "Failed to fetch shared documents:",
        err
      );

      setError(
        "Failed to load shared documents."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // --------------------------------
  // Fetch Trash Documents
  // --------------------------------

  const fetchTrashDocuments = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError("");

      const result = await getTrashDocuments();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setDocuments(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "Failed to fetch trash documents:",
        err
      );

      setError("Failed to load trash.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // --------------------------------
  // Initial Load
  // --------------------------------

  useEffect(() => {
    fetchDocuments();
  }, []);

  // --------------------------------
  // Keyboard Shortcut
  // --------------------------------

  useEffect(() => {
    const handleShortcut = (
      event: KeyboardEvent
    ) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        const searchInput =
          document.querySelector<HTMLInputElement>(
            ".search-box input"
          );

        searchInput?.focus();
      }
    };

    window.addEventListener(
      "keydown",
      handleShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleShortcut
      );
    };
  }, []);

  // --------------------------------
  // Filter Documents
  // --------------------------------

  const filteredDocuments = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    let result = documents;

    // Starred view
    if (viewMode === "starred") {
      result = result.filter(
        (document) => document.isStarred === true
      );
    }

    // Search
    if (!query) {
      return result;
    }

    return result.filter((document) => {
      const titleMatch = document.title
        .toLowerCase()
        .includes(query);

      const contentMatch =
        document.blocks?.some(
          (block) =>
            block.content
              ?.toLowerCase()
              .includes(query)
        );

      return titleMatch || contentMatch;
    });
  }, [documents, search, viewMode]);

  // --------------------------------
  // Change View
  // --------------------------------

  const handleDocumentsView = () => {
    setViewMode("documents");
    setSearch("");
    fetchDocuments();
  };

  const handleSharedView = () => {
    setViewMode("shared");
    setSearch("");
    fetchSharedDocuments();
  };

  const handleStarredView = () => {
    setViewMode("starred");
    setSearch("");

    // We need all documents first,
    // then filteredDocuments will show starred ones.
    fetchDocuments();
  };
  const handleTrashView = () => {
    setViewMode("trash");
    setSearch("");
    fetchTrashDocuments();
  };
const handleShare = async () => {
  if (!shareDocumentId) {
    return;
  }

  const user = shareUser.trim();

  if (!user) {
    setShareError("Please enter a user.");
    return;
  }

  try {
    setSharing(true);
    setShareError("");
    setShareSuccess("");

    await shareDocument(
      shareDocumentId,
      user,
      sharePermission
    );

    setShareSuccess(
      "Document shared successfully."
    );

    setShareUser("");

    setTimeout(() => {
      setShareDocumentId(null);
      setShareSuccess("");
      setSharePermission("view");
    }, 1000);
  } catch (error) {
    console.error(
      "Failed to share document:",
      error
    );

    setShareError(
      error instanceof Error
        ? error.message
        : "Failed to share document."
    );
  } finally {
    setSharing(false);
  }
};
  // --------------------------------
  // Toggle Star
  // --------------------------------

  const handleToggleStar = async (
    id: string
  ) => {
    try {
      const data =
        await toggleStarDocument(id);

      setDocuments((current) =>
        current.map((document) =>
          document._id === id
            ? {
                ...document,
                isStarred: data.isStarred,
              }
            : document
        )
      );
    } catch (error) {
      console.error(
        "Failed to update star:",
        error
      );

      alert(
        "Failed to update star status."
      );
    }
  };

  // --------------------------------
  // Restore Document
  // --------------------------------

  const handleRestoreDocument = async (
    id: string
  ) => {
    try {
      await restoreDocument(id);

      setDocuments((current) =>
        current.filter(
          (document) => document._id !== id
        )
      );
    } catch (error) {
      console.error(
        "Failed to restore document:",
        error
      );

      alert("Failed to restore document.");
    }
  };

  // --------------------------------
  // Permanently Delete Document
  // --------------------------------

  const handlePermanentlyDeleteDocument = async (
    id: string
  ) => {
    const confirmed = window.confirm(
      "Permanently delete this document? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await permanentlyDeleteDocument(id);

      setDocuments((current) =>
        current.filter(
          (document) => document._id !== id
        )
      );
    } catch (error) {
      console.error(
        "Failed to permanently delete document:",
        error
      );

      alert(
        "Failed to permanently delete document."
      );
    }
  };

  // --------------------------------
  // Delete Document
  // --------------------------------

  const deleteDocument = async (
    id: string
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDocumentApi(id);

      setDocuments((current) =>
        current.filter(
          (document) =>
            document._id !== id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete document:",
        err
      );

      alert(
        "Failed to delete document."
      );
    }
  };

  // --------------------------------
  // Format Date
  // --------------------------------

  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return "Recently";
    }

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --------------------------------
  // Document Preview
  // --------------------------------

  const getPreview = (
    document: Document
  ) => {
    const paragraph =
      document.blocks?.find(
        (block) =>
          block.type === "paragraph" &&
          block.content?.trim()
      );

    return (
      paragraph?.content?.trim() ||
      "No description available for this document."
    );
  };

  // --------------------------------
  // Page Title
  // --------------------------------

  const pageTitle =
    viewMode === "shared"
      ? "Shared with me"
      : viewMode === "starred"
      ? "Starred Documents"
      : viewMode === "trash"
      ? "Trash"
      : "My Documents";

  const pageSubtitle =
    viewMode === "shared"
      ? "Documents shared with you"
      : viewMode === "starred"
      ? "Your favorite documents"
      : viewMode === "trash"
      ? "Deleted documents"
      : "All your documents in one place";

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="documents-page">

      {/* ================================
          Sidebar
      ================================= */}

      <aside className="documents-sidebar">

        {/* Brand */}

        <div className="brand">
          <div className="brand-icon">
            <FaFileAlt />
          </div>

          <span className="brand-text">
            Sync<span>Doc</span>
          </span>
        </div>

        {/* Navigation */}

        <nav className="sidebar-nav">

          <div className="sidebar-section">

            <p className="sidebar-label">
              WORKSPACE
            </p>

            {/* Documents */}

            <Link
              to="/documents"
              className={`sidebar-item ${
                viewMode === "documents"
                  ? "active"
                  : ""
              }`}
              onClick={
                handleDocumentsView
              }
            >
              <FaFolder />
              <span>Documents</span>
            </Link>

            {/* Shared with me */}

            <button
              className={`sidebar-item ${
                viewMode === "shared"
                  ? "active"
                  : ""
              }`}
              onClick={
                handleSharedView
              }
            >
              <FaUsers />
              <span>
                Shared with me
              </span>
            </button>

            {/* Starred */}

            <button
              className={`sidebar-item ${
                viewMode === "starred"
                  ? "active"
                  : ""
              }`}
              onClick={
                handleStarredView
              }
            >
              <FaStar />
              <span>Starred</span>
            </button>

            {/* Trash */}

            <button
              className={`sidebar-item ${
                viewMode === "trash"
                  ? "active"
                  : ""
              }`}
              onClick={handleTrashView}
            >
              <FaTrash />
              <span>Trash</span>
            </button>

          </div>

          <div className="sidebar-divider" />

          {/* Workspaces */}

          <div className="sidebar-section">

            <p className="sidebar-label">
              WORKSPACES
            </p>

            <button className="workspace-item">
              <span className="workspace-avatar purple">
                M
              </span>

              <span>
                My Workspace
              </span>
            </button>

            <button className="workspace-item">
              <span className="workspace-avatar green">
                T
              </span>

              <span>
                Team Workspace
              </span>
            </button>

          </div>

        </nav>

        {/* Storage */}

        <div className="storage-card">

          <div className="storage-header">
            <span>
              Storage Used
            </span>
          </div>

          <strong>2.4 MB</strong>

          <span className="storage-limit">
            {" "}
            / 1 GB
          </span>

          <div className="storage-bar">
            <div className="storage-progress" />
          </div>

          <button className="upgrade-button">
            Upgrade Plan
          </button>

        </div>

        {/* User */}

        <div className="sidebar-user">

          <div className="user-avatar">
            U
          </div>

          <div className="user-details">

            <strong>
              user1
            </strong>

            <span>
              user1@example.com
            </span>

          </div>

          <FaChevronDown
            className="user-chevron"
          />

        </div>

      </aside>

      {/* ================================
          Main
      ================================= */}

      <main className="documents-main">

        {/* Topbar */}

        <header className="documents-topbar">

          <div className="search-box">

            <FaSearch />

            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <span className="search-shortcut">
              Ctrl K
            </span>

          </div>

          <div className="topbar-actions">

            <button
              className="icon-button"
              title="Settings"
            >
              <FaCog />
            </button>

            <button
              className="icon-button"
              title="Notifications"
            >
              <FaBell />
            </button>

            <div className="topbar-user">

              <div className="topbar-avatar">
                U
              </div>

              <span>
                user1
              </span>

              <FaChevronDown />

            </div>

          </div>

        </header>

        {/* Content */}

        <section className="documents-content">

          {/* Heading */}

          <div className="documents-heading">

            <div>

              <h1>
                {pageTitle}
              </h1>

              <p>
                {pageSubtitle}
              </p>

            </div>

            <Link
              to="/documents/new"
              className="new-document-button"
            >
              <FaPlus />
              New Document
            </Link>

          </div>

          {/* Loading */}

          {loading && (
            <div className="documents-state">
              Loading documents...
            </div>
          )}

          {/* Error */}

          {!loading && error && (
            <div className="documents-state error">
              {error}
            </div>
          )}

          {/* Empty */}

          {!loading &&
            !error &&
            filteredDocuments.length ===
              0 && (
              <div className="documents-empty">

                <FaFileAlt />

                <h2>
                  {search
                    ? "No documents found"
                    : viewMode ===
                      "shared"
                    ? "No shared documents"
                    : viewMode ===
                      "starred"
                    ? "No starred documents"
                    : viewMode === "trash"
                    ? "Trash is empty"
                    : "No documents yet"}
                </h2>

                <p>
                  {search
                    ? "Try another search term."
                    : viewMode ===
                      "shared"
                    ? "No documents have been shared with you yet."
                    : viewMode ===
                      "starred"
                    ? "Star a document to see it here."
                    : "Create your first SyncDoc document."}
                </p>

                {!search &&
                  viewMode ===
                    "documents" && (
                    <Link
                      to="/documents/new"
                      className="new-document-button"
                    >
                      <FaPlus />
                      Create Document
                    </Link>
                  )}

              </div>
            )}

          {/* Documents */}

          {!loading &&
            !error &&
            filteredDocuments.length >
              0 && (
              <>

                <div className="documents-grid">

                  {filteredDocuments.map(
                    (document) => (

                    <article
                      className="document-card"
                      key={document._id}
                    >

                      {/* Icon */}

                      <div className="document-card-icon">
                        <FaFileAlt />
                      </div>

                      {/* Content */}

                      <div className="document-card-content">

                        {/* Top */}

                        <div className="document-card-top">

                          <h2>
                            {document.title}
                          </h2>

                          <div className="document-card-top-actions">

                            {/* Star */}

                            <button
                              className={`star-button ${
                                document.isStarred
                                  ? "starred"
                                  : ""
                              }`}
                              onClick={() =>
                                handleToggleStar(
                                  document._id
                                )
                              }
                              title={
                                document.isStarred
                                  ? "Remove from starred"
                                  : "Add to starred"
                              }
                            >
                              <FaStar />
                            </button>

                            {/* Menu */}

                            <button
                              className="document-menu"
                              title="More options"
                            >
                              ⋮
                            </button>

                          </div>

                        </div>

                        {/* Meta */}

                        <div className="document-meta">

                          <span>
                            Owner:{" "}
                            {document.owner}
                          </span>

                          <span className="meta-dot">
                            •
                          </span>

                          <span>
                            Updated{" "}
                            {formatDate(
                              document.updatedAt
                            )}
                          </span>

                          <span className="meta-dot">
                            •
                          </span>

                          <span>
                            {document.blocks
                              ?.length ||
                              0}{" "}
                            blocks
                          </span>

                        </div>

                        {/* Preview */}

                        <p className="document-preview">
                          {getPreview(
                            document
                          )}
                        </p>

                        {/* Actions */}

                      <div className="document-card-actions">

                        {viewMode === "trash" ? (
                          <>
                            <button
                              className="open-document-button"
                              onClick={() =>
                                handleRestoreDocument(
                                  document._id
                                )
                              }
                            >
                              ↩ Restore
                            </button>

                            <button
                              className="delete-document-button"
                              onClick={() =>
                                handlePermanentlyDeleteDocument(
                                  document._id
                                )
                              }
                            >
                              <FaTrash />
                              Delete permanently
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to={`/edit/${document._id}`}
                              className="open-document-button"
                            >
                              <FaFolder />
                              Open
                            </Link>

                            <button
                              className="share-document-button"
                              onClick={() => {
                                setShareDocumentId(
                                  document._id
                                );
                                setShareUser("");
                                setSharePermission("view");
                                setShareError("");
                                setShareSuccess("");
                              }}
                            >
                              <FaShareAlt />
                              Share
                            </button>

                            <button
                              className="delete-document-button"
                              onClick={() =>
                                deleteDocument(
                                  document._id
                                )
                              }
                            >
                              <FaTrash />
                              Delete
                            </button>
                          </>
                        )}

                      </div>

                      </div>

                    </article>

                  ))}

                </div>

                {/* Footer */}

                <div className="documents-footer">

                  <span>
                    Showing{" "}
                    {
                      filteredDocuments.length
                    }{" "}
                    of{" "}
                    {documents.length}{" "}
                    documents
                  </span>

                  <div className="pagination">

                    <button disabled>
                      ‹
                    </button>

                    <button className="active">
                      1
                    </button>

                    <button disabled>
                      ›
                    </button>

                  </div>

                </div>

              </>
            )}
{/* ================================
    Share Modal
================================= */}

{shareDocumentId && (
  <div
    className="share-modal-overlay"
    onClick={() => {
      if (!sharing) {
        setShareDocumentId(null);
      }
    }}
  >
    <div
      className="share-modal"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <div className="share-modal-header">
        <div>
          <h2>Share Document</h2>

          <p>
            Give another user access to this
            document.
          </p>
        </div>

        <button
          className="share-modal-close"
          onClick={() =>
            setShareDocumentId(null)
          }
          disabled={sharing}
        >
          ×
        </button>
      </div>

      {/* User */}

      <div className="share-form-group">

        <label>
          User
        </label>

        <input
          type="text"
          placeholder="Enter username"
          value={shareUser}
          onChange={(event) =>
            setShareUser(event.target.value)
          }
          disabled={sharing}
          autoFocus
        />

      </div>

      {/* Permission */}

      <div className="share-form-group">

        <label>
          Permission
        </label>

        <div className="permission-options">

          <button
            type="button"
            className={`permission-option ${
              sharePermission === "view"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setSharePermission("view")
            }
            disabled={sharing}
          >
            <strong>View</strong>

            <span>
              Can view the document
            </span>
          </button>

          <button
            type="button"
            className={`permission-option ${
              sharePermission === "edit"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setSharePermission("edit")
            }
            disabled={sharing}
          >
            <strong>Edit</strong>

            <span>
              Can edit the document
            </span>
          </button>

        </div>

      </div>

      {/* Error */}

      {shareError && (
        <div className="share-message error">
          {shareError}
        </div>
      )}

      {/* Success */}

      {shareSuccess && (
        <div className="share-message success">
          {shareSuccess}
        </div>
      )}

      {/* Actions */}

      <div className="share-modal-actions">

        <button
          type="button"
          className="share-cancel-button"
          onClick={() =>
            setShareDocumentId(null)
          }
          disabled={sharing}
        >
          Cancel
        </button>

        <button
          type="button"
          className="share-submit-button"
          onClick={handleShare}
          disabled={
            sharing ||
            !shareUser.trim()
          }
        >
          <FaShareAlt />

          {sharing
            ? "Sharing..."
            : "Share Document"}
        </button>

      </div>

    </div>
  </div>
)}
        </section>

      </main>

    </div>
  );
}

export default DocumentList;