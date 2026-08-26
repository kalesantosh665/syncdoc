import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FocusEvent,
} from "react";

import { Link } from "react-router-dom";

import * as Y from "yjs";

import type {
  BlockType,
  SyncDocument,
} from "../../types/document";

import HeadingBlock from "../blocks/HeadingBlock/HeadingBlock";
import ParagraphBlock from "../blocks/ParagraphBlock/ParagraphBlock";
import CodeBlock from "../blocks/CodeBlock/CodeBlock";
import ListBlock from "../blocks/ListBlock/ListBlock";

import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";

import "./DocumentEditor.css";

interface DocumentEditorProps {
  document: SyncDocument;
}

interface OnlineUser {
  name: string;
  color?: string;
  editingBlockId?: string | null;
}

function DocumentEditor({
  document: initialDocument,
}: DocumentEditorProps) {
  const [document, setDocument] =
    useState<SyncDocument>(initialDocument);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [saveError, setSaveError] =
    useState(false);

  const [hasChanges, setHasChanges] =
    useState(false);

  const [lastSavedAt, setLastSavedAt] =
    useState<Date | null>(null);

  const autoSaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const [connected, setConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState<OnlineUser[]>([]);

  // Yjs Awareness reference
  const awarenessRef =
    useRef<Awareness | null>(null);

  // Yjs document reference
  const ydocRef =
    useRef<Y.Doc | null>(null);

  // WebSocket reference
  const wsRef =
    useRef<WebSocket | null>(null);

  // Dragged block
  const [draggedBlockId, setDraggedBlockId] =
    useState<string | null>(null);

  // --------------------------------
  // Yjs + WebSocket + Awareness
  // --------------------------------

  useEffect(() => {
    const ydoc = new Y.Doc();

    const awareness =
      new Awareness(ydoc);

    // IMPORTANT:
    // Store awareness instance in ref
    awarenessRef.current = awareness;

    // --------------------------------
    // Current User
    // --------------------------------

    const getCurrentUser = () => {
      let userId =
        sessionStorage.getItem(
          "syncdoc-user-id"
        );

      let userColor =
        sessionStorage.getItem(
          "syncdoc-user-color"
        );

      if (!userId) {
        userId =
          Math.random()
            .toString(36)
            .substring(2, 8);

        sessionStorage.setItem(
          "syncdoc-user-id",
          userId
        );
      }

      if (!userColor) {
        const colors = [
          "#2563eb",
          "#16a34a",
          "#dc2626",
          "#9333ea",
          "#ea580c",
          "#0891b2",
        ];

        userColor =
          colors[
            Math.floor(
              Math.random() *
                colors.length
            )
          ];

        sessionStorage.setItem(
          "syncdoc-user-color",
          userColor
        );
      }

      return {
        name: `User ${userId}`,
        color: userColor,
      };
    };

    const currentUser =
      getCurrentUser();

    // Set current user information
    awareness.setLocalStateField(
      "user",
      currentUser
    );

    // Initially not editing any block
    awareness.setLocalStateField(
      "editingBlockId",
      null
    );

    // --------------------------------
    // WebSocket
    // --------------------------------

    const ws = new WebSocket(
      `ws://localhost:5000/ws?documentId=${initialDocument._id}`
    );

    ws.binaryType =
      "arraybuffer";

    ydocRef.current = ydoc;
    wsRef.current = ws;

    let initialized = false;

    // --------------------------------
    // Update Online Users
    // --------------------------------

    const updateOnlineUsers = () => {
      const users: OnlineUser[] = [];

      awareness
        .getStates()
        .forEach((state) => {
          if (state.user?.name) {
            users.push({
              name: state.user.name,
              color: state.user.color,
              editingBlockId:
                state.editingBlockId ??
                null,
            });
          }
        });

      setOnlineUsers(users);
    };

    // Show local user immediately
    updateOnlineUsers();

    // --------------------------------
    // Awareness Changes
    // --------------------------------

    const handleAwarenessUpdate = (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      origin?: unknown
    ) => {
      // Always update UI
      updateOnlineUsers();

      // IMPORTANT:
      // Remote awareness already came from
      // server, so don't send it back.
      if (origin === "remote") {
        return;
      }

      if (
        ws.readyState !==
        WebSocket.OPEN
      ) {
        return;
      }

      const changedClients = [
        ...added,
        ...updated,
        ...removed,
      ];

      if (
        changedClients.length === 0
      ) {
        return;
      }

      const awarenessUpdate =
        encodeAwarenessUpdate(
          awareness,
          changedClients
        );

      const message =
        new Uint8Array(
          awarenessUpdate.length + 1
        );

      // 1 = Awareness message
      message[0] = 1;

      message.set(
        awarenessUpdate,
        1
      );

      ws.send(message);
    };

    awareness.on(
      "update",
      handleAwarenessUpdate
    );

    // --------------------------------
    // Receive WebSocket Messages
    // --------------------------------

    ws.onmessage = (event) => {
      try {
        const data =
          new Uint8Array(
            event.data
          );

        if (data.length === 0) {
          return;
        }

        const messageType =
          data[0];

        const update =
          data.slice(1);

        // --------------------------------
        // Awareness Message
        // --------------------------------

        if (
          messageType === 1
        ) {
          applyAwarenessUpdate(
            awareness,
            update,
            "remote"
          );

          updateOnlineUsers();

          return;
        }

        // --------------------------------
        // Yjs Document Update
        // --------------------------------

        if (
          messageType === 0
        ) {
          Y.applyUpdate(
            ydoc,
            update,
            "remote"
          );

          const yDocument =
            ydoc.getMap<string>(
              "document"
            );

          const data =
            yDocument.get("data");

          if (data) {
            const remoteDocument =
              JSON.parse(
                data
              ) as SyncDocument;

            setDocument(
              remoteDocument
            );
          }

          // If server document is empty,
          // initialize it.
          if (
            !initialized &&
            !data
          ) {
            yDocument.set(
              "data",
              JSON.stringify(
                initialDocument
              )
            );
          }

          initialized = true;

          return;
        }

        console.warn(
          `Unknown WebSocket message type: ${messageType}`
        );
      } catch (error) {
        console.error(
          "WebSocket message error:",
          error
        );
      }
    };

    // --------------------------------
    // WebSocket Connected
    // --------------------------------

    ws.onopen = () => {
      console.log(
        "✅ SyncDoc WebSocket connected"
      );

      setConnected(true);

      // Send current awareness state
      const clientID =
        awareness.clientID;

      const awarenessUpdate =
        encodeAwarenessUpdate(
          awareness,
          [clientID]
        );

      const message =
        new Uint8Array(
          awarenessUpdate.length + 1
        );

      // 1 = Awareness
      message[0] = 1;

      message.set(
        awarenessUpdate,
        1
      );

      ws.send(message);
    };

    // --------------------------------
    // Yjs Local Updates
    // --------------------------------

    const handleYjsUpdate = (
      update: Uint8Array,
      origin: unknown
    ) => {
      // Ignore updates received from server
      if (
        origin === "remote"
      ) {
        return;
      }

      if (
        ws.readyState !==
        WebSocket.OPEN
      ) {
        return;
      }

      const message =
        new Uint8Array(
          update.length + 1
        );

      // 0 = Yjs update
      message[0] = 0;

      message.set(
        update,
        1
      );

      ws.send(message);
    };

    ydoc.on(
      "update",
      handleYjsUpdate
    );

    // --------------------------------
    // WebSocket Error
    // --------------------------------

    ws.onerror = (error) => {
      console.error(
        "❌ WebSocket error:",
        error
      );

      setConnected(false);
    };

    // --------------------------------
    // WebSocket Close
    // --------------------------------

    ws.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );

      setConnected(false);
      setOnlineUsers([]);
    };

    // --------------------------------
    // Cleanup
    // --------------------------------

    return () => {
      awareness.off(
        "update",
        handleAwarenessUpdate
      );

      ydoc.off(
        "update",
        handleYjsUpdate
      );

      awarenessRef.current =
        null;

      ws.close();
      ydoc.destroy();

      wsRef.current = null;
      ydocRef.current = null;
    };
  }, [initialDocument._id]);

  // --------------------------------
  // Update Yjs Document
  // --------------------------------

  const updateYDocument = (
    updatedDocument: SyncDocument
  ) => {
    const ydoc =
      ydocRef.current;

    if (!ydoc) {
      return;
    }

    const yDocument =
      ydoc.getMap<string>(
        "document"
      );

    ydoc.transact(() => {
      yDocument.set(
        "data",
        JSON.stringify(
          updatedDocument
        )
      );
    }, "local");
  };

  // --------------------------------
  // Block Presence
  // --------------------------------

  const setEditingBlock = (
    blockId: string | null
  ) => {
    const awareness =
      awarenessRef.current;

    if (!awareness) {
      return;
    }

    awareness.setLocalStateField(
      "editingBlockId",
      blockId
    );
  };

  // --------------------------------
  // Block Blur
  // --------------------------------

  const handleBlockBlur = (
    event: FocusEvent<HTMLDivElement>
  ) => {
    const nextTarget =
      event.relatedTarget;

    // If focus moves to another element
    // inside the same block, don't clear.
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(
        nextTarget
      )
    ) {
      return;
    }

    setEditingBlock(null);
  };

  // --------------------------------
  // Update Block Content
  // --------------------------------

  const updateBlockContent = (
    blockId: string,
    content: string
  ) => {
    setDocument(
      (currentDocument) => {
        const updatedDocument = {
          ...currentDocument,

          blocks:
            currentDocument.blocks.map(
              (block) =>
                block._id === blockId
                  ? {
                      ...block,
                      content,
                    }
                  : block
            ),
        };

        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };

  // --------------------------------
  // Update List Items
  // --------------------------------

  const updateListItems = (
    blockId: string,
    items: string[]
  ) => {
    setDocument(
      (currentDocument) => {
        const updatedDocument = {
          ...currentDocument,

          blocks:
            currentDocument.blocks.map(
              (block) =>
                block._id === blockId
                  ? {
                      ...block,
                      items,
                    }
                  : block
            ),
        };

        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };

  // --------------------------------
  // Generate Block ID
  // --------------------------------

  const generateBlockId = () => {
    return Array.from(
      { length: 24 },
      () =>
        Math.floor(
          Math.random() * 16
        ).toString(16)
    ).join("");
  };

  // --------------------------------
  // Add New Block
  // --------------------------------

  const addBlock = (
    type: BlockType
  ) => {
    const newBlock:
      SyncDocument["blocks"][number] =
      {
        _id:
          generateBlockId(),

        type,

        content:
          type === "heading"
            ? "New Heading"
            : type === "paragraph"
            ? "New paragraph..."
            : type === "code"
            ? "// Write your code here"
            : "",

        ...(type === "code" && {
          language:
            "javascript",
        }),

        ...(type === "list" && {
          items: [
            "New item",
          ],
        }),
      };

    setDocument(
      (currentDocument) => {
        const updatedDocument = {
          ...currentDocument,

          blocks: [
            ...currentDocument.blocks,
            newBlock,
          ],
        };

        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };

  // --------------------------------
  // Delete Block
  // --------------------------------

  const deleteBlock = (
    blockId: string
  ) => {
    const currentEditingBlock =
      awarenessRef.current
        ?.getLocalState()
        ?.editingBlockId;

    if (
      currentEditingBlock ===
      blockId
    ) {
      setEditingBlock(null);
    }

    setDocument(
      (currentDocument) => {
        const updatedDocument = {
          ...currentDocument,

          blocks:
            currentDocument.blocks.filter(
              (block) =>
                block._id !== blockId
            ),
        };

        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };

  // --------------------------------
  // Move Block
  // --------------------------------

  const moveBlock = (
    blockId: string,
    direction: "up" | "down"
  ) => {
    setDocument(
      (currentDocument) => {
        const blocks = [
          ...currentDocument.blocks,
        ];

        const currentIndex =
          blocks.findIndex(
            (block) =>
              block._id === blockId
          );

        if (
          currentIndex === -1
        ) {
          return currentDocument;
        }

        const newIndex =
          direction === "up"
            ? currentIndex - 1
            : currentIndex + 1;

        if (
          newIndex < 0 ||
          newIndex >=
            blocks.length
        ) {
          return currentDocument;
        }

        // Swap blocks
        [
          blocks[currentIndex],
          blocks[newIndex],
        ] = [
          blocks[newIndex],
          blocks[currentIndex],
        ];

        const updatedDocument = {
          ...currentDocument,
          blocks,
        };

        // IMPORTANT:
        // Sync block order through Yjs
        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };

  // --------------------------------
  // Drag Start
  // --------------------------------

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    blockId: string
  ) => {
    setDraggedBlockId(
      blockId
    );

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      blockId
    );
  };

  // --------------------------------
  // Drag Over
  // --------------------------------

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";
  };

  // --------------------------------
  // Drop
  // --------------------------------

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetBlockId: string
  ) => {
    event.preventDefault();

    const sourceBlockId =
      event.dataTransfer.getData(
        "text/plain"
      );

    if (
      !sourceBlockId ||
      sourceBlockId ===
        targetBlockId
    ) {
      setDraggedBlockId(null);
      return;
    }

    setDocument(
      (currentDocument) => {
        const blocks = [
          ...currentDocument.blocks,
        ];

        const sourceIndex =
          blocks.findIndex(
            (block) =>
              block._id ===
              sourceBlockId
          );

        const targetIndex =
          blocks.findIndex(
            (block) =>
              block._id ===
              targetBlockId
          );

        if (
          sourceIndex === -1 ||
          targetIndex === -1
        ) {
          return currentDocument;
        }

        const [
          movedBlock,
        ] = blocks.splice(
          sourceIndex,
          1
        );

        blocks.splice(
          targetIndex,
          0,
          movedBlock
        );

        const updatedDocument = {
          ...currentDocument,
          blocks,
        };

        // IMPORTANT:
        // Sync drag/drop order through Yjs
        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
    setDraggedBlockId(null);
  };

  // --------------------------------
  // Drag End
  // --------------------------------

  const handleDragEnd = () => {
    setDraggedBlockId(null);
  };

  // --------------------------------
  // Update Title
  // --------------------------------

  const updateTitle = (
    title: string
  ) => {
    setDocument(
      (currentDocument) => {
        const updatedDocument = {
          ...currentDocument,
          title,
        };

        updateYDocument(
          updatedDocument
        );

        return updatedDocument;
      }
    );

    setSaved(false);
    setHasChanges(true);
    setSaveError(false);
  };
// --------------------------------
// Export Document
// --------------------------------

const exportDocument = (
  format: "html" | "pdf"
) => {
  const url =
    `http://localhost:5000/api/documents/${document._id}/${format}`;

  window.open(url, "_blank");
};
  // --------------------------------
  // Save Document
  // --------------------------------

  const saveDocument = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setSaveError(false);

      const response =
        await fetch(
          `http://localhost:5000/api/documents/${document._id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                document.title,

              blocks:
                document.blocks,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Failed to save document"
        );
      }

      setSaved(true);
      setHasChanges(false);
      setSaveError(false);
      setLastSavedAt(
        new Date()
      );
    } catch (error) {
      console.error(
        "Save document error:",
        error
      );

      setSaved(false);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------
  // Auto Save
  // --------------------------------

  useEffect(() => {
    if (!document._id) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    if (
      autoSaveTimerRef.current
    ) {
      clearTimeout(
        autoSaveTimerRef.current
      );
    }

    autoSaveTimerRef.current =
      setTimeout(() => {
        void saveDocument();
      }, 1000);

    return () => {
      if (
        autoSaveTimerRef.current
      ) {
        clearTimeout(
          autoSaveTimerRef.current
        );
      }
    };
  }, [
    document.title,
    document.blocks,
    hasChanges,
  ]);

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <main className="editor-page">
      <div className="editor-container">

        {/* Top Bar */}

        <div className="editor-topbar">
          <Link
            to="/documents"
            className="back-button"
          >
            ← Documents
          </Link>

          <div>
            {/* Live Status */}

            <span
              style={{
                marginRight:
                  "15px",

                color: connected
                  ? "green"
                  : "red",

                fontWeight:
                  "600",
              }}
            >
              {connected
                ? "● Live"
                : "● Offline"}
            </span>

            {/* Online Users */}

            {onlineUsers.length >
              0 && (
              <span
                style={{
                  marginRight:
                    "15px",

                  color:
                    "#475569",

                  fontWeight:
                    "500",
                }}
              >
                {
                  onlineUsers.length
                }{" "}
                online
              </span>
            )}
<button
  type="button"
  className="export-button export-html-button"
  onClick={() => exportDocument("html")}
>
  Export HTML
</button>

<button
  type="button"
  className="export-button export-pdf-button"
  onClick={() => exportDocument("pdf")}
>
  Export PDF
</button>
            <button
              className="save-button"
              onClick={
                saveDocument
              }
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

            {saving && (
              <span
                className="saved-message"
                style={{
                  color:
                    "#2563eb",

                  marginLeft:
                    "12px",
                }}
              >
                Saving...
              </span>
            )}

            {!saving &&
              hasChanges && (
                <span
                  className="saved-message"
                  style={{
                    color:
                      "#d97706",

                    marginLeft:
                      "12px",
                  }}
                >
                  Unsaved changes
                </span>
              )}

            {!saving &&
              !hasChanges &&
              saved &&
              lastSavedAt && (
                <span
                  className="saved-message"
                  style={{
                    color:
                      "#16a34a",

                    marginLeft:
                      "12px",
                  }}
                >
                  Saved just now ✓
                </span>
              )}

            {!saving &&
              saveError && (
                <span
                  className="saved-message"
                  style={{
                    color:
                      "#dc2626",

                    marginLeft:
                      "12px",
                  }}
                >
                  Save failed
                </span>
              )}
          </div>
        </div>

        {/* Online Collaborators */}

        {onlineUsers.length >
          0 && (
          <div
            style={{
              marginBottom:
                "15px",

              display: "flex",

              gap: "8px",

              flexWrap:
                "wrap",
            }}
          >
            {onlineUsers.map(
              (user, index) => (
                <span
                  key={`${user.name}-${index}`}
                  style={{
                    padding:
                      "5px 10px",

                    borderRadius:
                      "20px",

                    background:
                      "#eff6ff",

                    color:
                      user.color ||
                      "#2563eb",

                    fontSize:
                      "13px",

                    fontWeight:
                      "600",
                  }}
                >
                  ● {user.name}
                </span>
              )
            )}
          </div>
        )}

        {/* Document Header */}

        <header className="editor-header">
          <input
            className="document-title-input"
            type="text"
            value={
              document.title
            }
            onChange={(event) =>
              updateTitle(
                event.target.value
              )
            }
          />

          <p className="document-owner">
            Owner:{" "}
            {document.owner}
          </p>
        </header>

        {/* Blocks */}

        <div>
          {document.blocks.map(
            (block) => (
              <div
                className={`editor-block ${
                  draggedBlockId ===
                  block._id
                    ? "dragging"
                    : ""
                }`}
                key={block._id}
                onDragOver={
                  handleDragOver
                }
                onDrop={(event) =>
                  handleDrop(
                    event,
                    block._id
                  )
                }

                // Block presence
                onFocusCapture={() =>
                  setEditingBlock(
                    block._id
                  )
                }

                onBlurCapture={(
                  event
                ) =>
                  handleBlockBlur(
                    event
                  )
                }
              >
                {/* --------------------------------
                    Who is editing this block?
                    -------------------------------- */}

                {onlineUsers
                  .filter(
                    (user) =>
                      user.editingBlockId ===
                      block._id
                  )
                  .map((user) => (
                    <div
                      key={
                        user.name
                      }
                      style={{
                        display:
                          "inline-flex",

                        alignItems:
                          "center",

                        gap: "6px",

                        marginBottom:
                          "8px",

                        padding:
                          "4px 9px",

                        borderRadius:
                          "12px",

                        background:
                          "#eff6ff",

                        color:
                          user.color ||
                          "#2563eb",

                        fontSize:
                          "12px",

                        fontWeight:
                          "600",
                      }}
                    >
                      <span
                        style={{
                          width:
                            "7px",

                          height:
                            "7px",

                          borderRadius:
                            "50%",

                          background:
                            user.color ||
                            "#2563eb",
                        }}
                      />

                      {
                        user.name
                      }{" "}
                      is editing
                    </div>
                  ))}

                {/* --------------------------------
                    Drag Handle
                    -------------------------------- */}

                <div
                  className="drag-handle"
                  draggable
                  onDragStart={(
                    event
                  ) =>
                    handleDragStart(
                      event,
                      block._id
                    )
                  }
                  onDragEnd={
                    handleDragEnd
                  }
                  title="Drag block"
                >
                  ⋮⋮
                </div>

                {/* --------------------------------
                    Heading
                    -------------------------------- */}

                {block.type ===
                  "heading" && (
                  <HeadingBlock
                    block={block}
                    onChange={
                      updateBlockContent
                    }
                  />
                )}

                {/* --------------------------------
                    Paragraph
                    -------------------------------- */}

                {block.type ===
                  "paragraph" && (
                  <ParagraphBlock
                    block={block}
                    onChange={
                      updateBlockContent
                    }
                  />
                )}

                {/* --------------------------------
                    Code
                    -------------------------------- */}

                {block.type ===
                  "code" && (
                  <CodeBlock
                    block={block}
                    onChange={
                      updateBlockContent
                    }
                  />
                )}

                {/* --------------------------------
                    List
                    -------------------------------- */}

                {block.type ===
                  "list" && (
                  <ListBlock
                    block={block}
                    onChange={
                      updateListItems
                    }
                  />
                )}

                {/* --------------------------------
                    Block Actions
                    -------------------------------- */}

                <div className="block-actions">
                  <button
                    className="move-block-button"
                    onClick={() =>
                      moveBlock(
                        block._id,
                        "up"
                      )
                    }
                    disabled={
                      document.blocks.findIndex(
                        (item) =>
                          item._id ===
                          block._id
                      ) === 0
                    }
                  >
                    ↑ Up
                  </button>

                  <button
                    className="move-block-button"
                    onClick={() =>
                      moveBlock(
                        block._id,
                        "down"
                      )
                    }
                    disabled={
                      document.blocks.findIndex(
                        (item) =>
                          item._id ===
                          block._id
                      ) ===
                      document
                        .blocks
                        .length - 1
                    }
                  >
                    ↓ Down
                  </button>

                  <button
                    className="delete-block-button"
                    onClick={() =>
                      deleteBlock(
                        block._id
                      )
                    }
                  >
                    Delete Block
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* --------------------------------
            Add Block
            -------------------------------- */}

        <div className="add-block">
          <h3>Add Block</h3>

          <div className="add-block-buttons">
            <button
              className="add-block-button"
              onClick={() =>
                addBlock(
                  "heading"
                )
              }
            >
              + Heading
            </button>

            <button
              className="add-block-button"
              onClick={() =>
                addBlock(
                  "paragraph"
                )
              }
            >
              + Paragraph
            </button>

            <button
              className="add-block-button"
              onClick={() =>
                addBlock(
                  "code"
                )
              }
            >
              + Code
            </button>

            <button
              className="add-block-button"
              onClick={() =>
                addBlock(
                  "list"
                )
              }
            >
              + List
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default DocumentEditor;