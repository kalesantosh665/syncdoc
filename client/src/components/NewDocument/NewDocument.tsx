import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa";

import { createDocument } from "../../services/api";
import "./NewDocument.css";

function NewDocument() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("user1");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      alert("Please enter document title");
      return;
    }

    try {
      setLoading(true);

      const document = await createDocument(
        title.trim(),
        owner.trim()
      );

      navigate(`/edit/${document._id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
      alert("Failed to create document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-document-page">

      <div className="new-document-container">

        <button
          className="back-button"
          onClick={() => navigate("/documents")}
        >
          <FaArrowLeft />
          Back to Documents
        </button>

        <div className="new-document-card">

          <div className="new-document-icon">
            <FaPlus />
          </div>

          <h1>Create New Document</h1>

          <p>
            Create a new collaborative document in SyncDoc.
          </p>

          <div className="form-group">
            <label>Document Title</label>

            <input
              type="text"
              placeholder="Enter document title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Owner</label>

            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          <div className="form-actions">

            <button
              className="cancel-button"
              onClick={() => navigate("/documents")}
            >
              Cancel
            </button>

            <button
              className="create-button"
              onClick={handleCreate}
              disabled={loading}
            >
              <FaPlus />

              {loading
                ? "Creating..."
                : "Create Document"}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default NewDocument;