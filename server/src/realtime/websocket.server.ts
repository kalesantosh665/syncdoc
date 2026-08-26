import {
  WebSocketServer,
  WebSocket,
} from "ws";

import type { Server } from "http";

import * as Y from "yjs";

import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";

import {
  createDecoder,
  readVarUint,
  readVarString,
} from "lib0/decoding";

import { DocumentModel } from "../models/document.model";

// --------------------------------
// In-memory Yjs documents
// --------------------------------

const documents = new Map<
  string,
  Y.Doc
>();

// --------------------------------
// WebSocket clients by document
// --------------------------------

const clients = new Map<
  string,
  Set<WebSocket>
>();

// --------------------------------
// Awareness / Presence by document
// --------------------------------

const awarenessRooms = new Map<
  string,
  Awareness
>();

// --------------------------------
// WebSocket -> Awareness client IDs
// --------------------------------

const socketClientIds = new Map<
  WebSocket,
  Set<number>
>();

// --------------------------------
// Prevent too many MongoDB writes
// --------------------------------

const saveTimers = new Map<
  string,
  NodeJS.Timeout
>();
// --------------------------------
// Extract Awareness client IDs
// --------------------------------

const getAwarenessClientIds = (
  update: Uint8Array
): number[] => {
  const decoder =
    createDecoder(update);

  const count =
    readVarUint(decoder);

  const clientIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const clientId =
      readVarUint(decoder);

    // Awareness clock
    readVarUint(decoder);

    // Awareness state
    readVarString(decoder);

    clientIds.push(clientId);
  }

  return clientIds;
};
// ================================================
// Convert Yjs document to MongoDB
// ================================================

const saveDocumentToMongoDB = async (
  documentId: string,
  ydoc: Y.Doc
) => {
  try {
    const yDocument =
      ydoc.getMap<string>("document");

    const data =
      yDocument.get("data");

    if (!data) {
      return;
    }

    const parsedDocument =
      JSON.parse(data);

    await DocumentModel.findByIdAndUpdate(
      documentId,
      {
        title: parsedDocument.title,
        blocks: parsedDocument.blocks,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    console.log(
      `💾 Document saved to MongoDB: ${documentId}`
    );
  } catch (error) {
    console.error(
      "MongoDB persistence error:",
      error
    );
  }
};

// ================================================
// Debounced MongoDB save
// ================================================

const scheduleDocumentSave = (
  documentId: string,
  ydoc: Y.Doc
) => {
  const existingTimer =
    saveTimers.get(documentId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(
    async () => {
      saveTimers.delete(documentId);

      await saveDocumentToMongoDB(
        documentId,
        ydoc
      );
    },
    500
  );

  saveTimers.set(
    documentId,
    timer
  );
};

// ================================================
// Load document from MongoDB
// ================================================

const loadDocumentFromMongoDB =
  async (
    documentId: string,
    ydoc: Y.Doc
  ) => {
    try {
      const document =
        await DocumentModel.findById(
          documentId
        ).lean();

      if (!document) {
        console.log(
          `Document not found: ${documentId}`
        );

        return;
      }

      const yDocument =
        ydoc.getMap<string>(
          "document"
        );

      const currentData =
        yDocument.get("data");

      // Only initialize Yjs
      // if it is empty
      if (!currentData) {
        yDocument.set(
          "data",
          JSON.stringify({
            _id: document._id.toString(),
            title: document.title,
            owner: document.owner,
            blocks: document.blocks,
            createdAt:
              document.createdAt,
            updatedAt:
              document.updatedAt,
          })
        );
      }

      console.log(
        `📥 Document loaded from MongoDB: ${documentId}`
      );
    } catch (error) {
      console.error(
        "MongoDB load error:",
        error
      );
    }
  };

// ================================================
// WebSocket server
// ================================================

export function setupWebSocketServer(
  server: Server
) {
  const wss =
    new WebSocketServer({
      server,
      path: "/ws",
    });

  wss.on(
    "connection",
    async (socket, request) => {
      // ==========================================
      // Read document ID
      // ==========================================

      const url = new URL(
        request.url || "",
        "http://localhost"
      );

      const documentId =
        url.searchParams.get(
          "documentId"
        );

      // ==========================================
      // Validate document ID
      // ==========================================

      if (!documentId) {
        console.log(
          "WebSocket rejected: documentId missing"
        );

        socket.close();

        return;
      }

      console.log(
        `WebSocket connected for document: ${documentId}`
      );

      // ==========================================
      // Get or create Yjs document
      // ==========================================

      let ydoc =
        documents.get(documentId);

      if (!ydoc) {
        ydoc = new Y.Doc();

        documents.set(
          documentId,
          ydoc
        );

        // Load MongoDB data
        await loadDocumentFromMongoDB(
          documentId,
          ydoc
        );
      }

      // ==========================================
      // Create document room
      // ==========================================

      let room =
        clients.get(documentId);

      if (!room) {
        room =
          new Set<WebSocket>();

        clients.set(
          documentId,
          room
        );
      }

      room.add(socket);

      // ==========================================
      // Create Awareness room
      // ==========================================

      let awareness =
        awarenessRooms.get(
          documentId
        );

      if (!awareness) {
        awareness =
          new Awareness(ydoc);

        awarenessRooms.set(
          documentId,
          awareness
        );
      }

      // ==========================================
      // Initialize socket client ID set
      // ==========================================

      socketClientIds.set(
        socket,
        new Set<number>()
      );

      // ==========================================
      // Send current Awareness state
      // ==========================================

      const awarenessStates =
        Array.from(
          awareness.getStates().keys()
        );

      if (
        awarenessStates.length > 0 &&
        socket.readyState ===
          WebSocket.OPEN
      ) {
        const awarenessUpdate =
          encodeAwarenessUpdate(
            awareness,
            awarenessStates
          );

        const awarenessMessage =
          new Uint8Array(
            awarenessUpdate.length + 1
          );

        // 1 = Awareness update
        awarenessMessage[0] = 1;

        awarenessMessage.set(
          awarenessUpdate,
          1
        );

        socket.send(
          awarenessMessage
        );
      }

      // ==========================================
      // Send current Yjs document state
      // ==========================================

      const initialUpdate =
        Y.encodeStateAsUpdate(
          ydoc
        );

      if (
        socket.readyState ===
        WebSocket.OPEN
      ) {
        const message =
          new Uint8Array(
            initialUpdate.length + 1
          );

        // 0 = Yjs update
        message[0] = 0;

        message.set(
          initialUpdate,
          1
        );

        socket.send(message);
      }

      // ==========================================
      // Receive WebSocket messages
      // ==========================================

      socket.on(
        "message",
        (message) => {
          try {
            const data =
              new Uint8Array(
                message as Buffer
              );

            if (
              data.length === 0
            ) {
              return;
            }

            // --------------------------------------
            // Message types
            //
            // 0 = Yjs document update
            // 1 = Awareness / Presence update
            // --------------------------------------

            const messageType =
              data[0];

            const update =
              data.slice(1);

            // ======================================
            // Yjs document update
            // ======================================

            if (
              messageType === 0
            ) {
              Y.applyUpdate(
                ydoc!,
                update
              );

              // Save document after 500ms
              scheduleDocumentSave(
                documentId,
                ydoc!
              );

              // Broadcast update
              // to other clients
              room?.forEach(
                (client) => {
                  if (
                    client !== socket &&
                    client.readyState ===
                      WebSocket.OPEN
                  ) {
                    client.send(
                      data
                    );
                  }
                }
              );

              return;
            }

            // ======================================
            // Awareness / Presence update
            // ======================================

            if (
              messageType === 1
            ) {
              // ------------------------------------
              // Find client IDs contained
              // in this awareness update
              // ------------------------------------
const clientIds =
  getAwarenessClientIds(
    update
  );
            

              // ------------------------------------
              // Remember which awareness clients
              // belong to this WebSocket
              // ------------------------------------

              const socketIds =
                socketClientIds.get(
                  socket
                );

              if (socketIds) {
                clientIds.forEach(
                  (clientId) => {
                    socketIds.add(
                      clientId
                    );
                  }
                );
              }

              // ------------------------------------
              // Apply awareness update
              // ------------------------------------

              applyAwarenessUpdate(
                awareness!,
                update,
                socket
              );

              // ------------------------------------
              // Broadcast awareness
              // to other clients
              // ------------------------------------

              room?.forEach(
                (client) => {
                  if (
                    client !== socket &&
                    client.readyState ===
                      WebSocket.OPEN
                  ) {
                    client.send(
                      data
                    );
                  }
                }
              );

              return;
            }

            // ======================================
            // Unknown message type
            // ======================================

            console.warn(
              `Unknown WebSocket message type: ${messageType}`
            );
          } catch (error) {
            console.error(
              "WebSocket message error:",
              error
            );
          }
        }
      );

      // ==========================================
      // Client disconnected
      // ==========================================

      socket.on(
        "close",
        async () => {
          console.log(
            `WebSocket disconnected from document: ${documentId}`
          );

          // --------------------------------------
          // Remove user's awareness state
          // --------------------------------------

          const socketIds =
            socketClientIds.get(
              socket
            );

          if (
            socketIds &&
            socketIds.size > 0
          ) {
            const clientIds =
              Array.from(
                socketIds
              );

            removeAwarenessStates(
              awareness!,
              clientIds,
              "disconnect"
            );

            // ------------------------------------
            // Broadcast removal
            // to remaining clients
            // ------------------------------------

            if (
              clientIds.length > 0
            ) {
              const awarenessUpdate =
                encodeAwarenessUpdate(
                  awareness!,
                  clientIds
                );

              const awarenessMessage =
                new Uint8Array(
                  awarenessUpdate.length + 1
                );

              // 1 = Awareness update
              awarenessMessage[0] = 1;

              awarenessMessage.set(
                awarenessUpdate,
                1
              );

              room?.forEach(
                (client) => {
                  if (
                    client !== socket &&
                    client.readyState ===
                      WebSocket.OPEN
                  ) {
                    client.send(
                      awarenessMessage
                    );
                  }
                }
              );
            }
          }

          // Remove socket tracking
          socketClientIds.delete(
            socket
          );

          // Remove socket from room
          room?.delete(socket);

          // ======================================
          // Last client left
          // ======================================

          if (
            room?.size === 0
          ) {
            // Save latest state
            await saveDocumentToMongoDB(
              documentId,
              ydoc!
            );

            // Remove room
            clients.delete(
              documentId
            );

            // Remove Yjs document
            documents.delete(
              documentId
            );

            // Remove awareness room
            awarenessRooms.delete(
              documentId
            );

            // Clear pending save timer
            const timer =
              saveTimers.get(
                documentId
              );

            if (timer) {
              clearTimeout(
                timer
              );

              saveTimers.delete(
                documentId
              );
            }

            console.log(
              `🧹 Document room cleaned: ${documentId}`
            );
          }
        }
      );

      // ==========================================
      // WebSocket error
      // ==========================================

      socket.on(
        "error",
        (error) => {
          console.error(
            "WebSocket error:",
            error
          );
        }
      );
    }
  );

  console.log(
    "SyncDoc WebSocket server ready on /ws"
  );

  return wss;
}