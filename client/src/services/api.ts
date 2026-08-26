import type { SyncDocument } from "../types/document";

const API_URL = "http://localhost:5000/api";

// Get all documents
export async function getDocuments(): Promise<SyncDocument[]> {
  const response = await fetch(`${API_URL}/documents`);

  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  return response.json();
}

// Get single document
export async function getDocumentById(
  id: string
): Promise<SyncDocument> {
  const response = await fetch(
    `${API_URL}/documents/${id}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  return response.json();
}

// Create new document
export async function createDocument(
  title: string,
  owner: string
): Promise<SyncDocument> {
  const response = await fetch(
    `${API_URL}/documents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        owner,
        blocks: [],
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}

// Delete document
export async function deleteDocument(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/documents/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
}

// Toggle document star status
export async function toggleStarDocument(
  id: string
): Promise<{ isStarred: boolean }> {
  const response = await fetch(
    `${API_URL}/documents/${id}/star`,
    {
      method: "PUT",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update star status");
  }

  const data = await response.json();

  return {
    isStarred: data.document?.isStarred ?? data.isStarred,
  };
}

// Get documents shared with current user
export async function getSharedDocuments(
  user: string
): Promise<SyncDocument[]> {
  const response = await fetch(
    `${API_URL}/documents/shared-with-me?user=${encodeURIComponent(
      user
    )}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch shared documents");
  }

  return response.json();
}
// Share document
export async function shareDocument(
  id: string,
  user: string,
  permission: "view" | "edit"
) {
  const response = await fetch(
    `${API_URL}/documents/${id}/share`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user,
        permission,
      }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.message || "Failed to share document"
    );
  }

  return response.json();
}
// Get trash documents
export async function getTrashDocuments(): Promise<
  SyncDocument[]
> {
  const response = await fetch(
    `${API_URL}/documents/trash`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch trash documents");
  }

  return response.json();
}

// Restore document
export async function restoreDocument(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/documents/${id}/restore`,
    {
      method: "PUT",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to restore document");
  }
}

// Permanently delete document
export async function permanentlyDeleteDocument(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/documents/${id}/permanent`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to permanently delete document"
    );
  }
}