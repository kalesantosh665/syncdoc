import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDocumentById } from "../../services/api";
import DocumentEditor from "../../components/DocumentEditor/DocumentEditor";
import type { SyncDocument } from "../../types/document";

function Editor() {
  const { id } = useParams<{ id: string }>();

  const [document, setDocument] = useState<SyncDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDocument = async () => {
      if (!id) return;

      try {
        const data = await getDocumentById(id);
        setDocument(data);
      } catch (error) {
        console.error(error);
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  if (loading) {
    return <p>Loading document...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!document) {
    return <p>Document not found.</p>;
  }

  return <DocumentEditor document={document} />;
}

export default Editor;