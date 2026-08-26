import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument } from "../../services/api";
import "./DocumentCreate.css";

function DocumentCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("user1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter document title");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newDocument = await createDocument(
        title,
        owner
      );

      console.log(
        "Created document:",
        newDocument
      );

      navigate(
        `/editor/${newDocument._id}`
      );
    } catch (error) {
      console.error(error);
      setError(
        "Failed to create document"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-page">
      <div className="create-container">

        {/* Header */}
        <div className="create-topbar">
          <button
            className="back-button"
            onClick={() =>
              navigate("/documents")
            }
          >
            ← Documents
          </button>
        </div>

        {/* Form Card */}
        <section className="create-card">

          <h1>Create New Document</h1>

          <p className="create-subtitle">
            Create a new SyncDoc document
          </p>

          <form onSubmit={handleSubmit}>

            {/* Title */}
            <div className="form-group">
              <label>
                Document Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Enter document title"
              />
            </div>

            {/* Owner */}
            <div className="form-group">
              <label>
                Owner
              </label>

              <input
                type="text"
                value={owner}
                onChange={(event) =>
                  setOwner(
                    event.target.value
                  )
                }
              />
            </div>

            {/* Error */}
            {error && (
              <p className="form-error">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="create-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Document"}
            </button>

          </form>
        </section>

      </div>
    </main>
  );
}

export default DocumentCreate;