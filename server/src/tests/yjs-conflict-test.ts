import WebSocket from "ws";
import * as Y from "yjs";

const DOCUMENT_ID = "6a82137423643d43c693f4e3";

const WS_URL =
  `ws://127.0.0.1:5000/ws?documentId=${DOCUMENT_ID}`;

const client1Doc = new Y.Doc();
const client2Doc = new Y.Doc();

const client1Map = client1Doc.getMap<string>("conflict-test");
const client2Map = client2Doc.getMap<string>("conflict-test");

const client1 = new WebSocket(WS_URL);
const client2 = new WebSocket(WS_URL);

let client1Connected = false;
let client2Connected = false;

let client1Received = 0;
let client2Received = 0;

let client1Sent = false;
let client2Sent = false;

console.log("=================================");
console.log(" SyncDoc Yjs Conflict Test");
console.log("=================================");
console.log(`Document: ${DOCUMENT_ID}`);
console.log("");


// =================================
// Convert WebSocket RawData
// =================================

const toUint8Array = (
  data: WebSocket.RawData
): Uint8Array => {
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (Array.isArray(data)) {
    return new Uint8Array(
      Buffer.concat(data)
    );
  }

  return new Uint8Array(data);
};


// =================================
// Client 1
// =================================

client1.on("open", () => {
  client1Connected = true;

  console.log("✅ Client 1 connected");

  trySendUpdates();
});

client1.on("message", (rawData) => {
  const data = toUint8Array(rawData);

  if (data.length === 0) {
    return;
  }

  const messageType = data[0];

  // 0 = Yjs update
  if (messageType === 0) {
    const update = data.slice(1);

    Y.applyUpdate(
      client1Doc,
      update
    );

    client1Received++;

    console.log(
      `📩 Client 1 received Yjs update`
    );
  }

  // 1 = Awareness
  if (messageType === 1) {
    console.log(
      `👤 Client 1 received awareness update`
    );
  }
});

client1.on("error", (error) => {
  console.error(
    "❌ Client 1 error:",
    error.message
  );
});


// =================================
// Client 2
// =================================

client2.on("open", () => {
  client2Connected = true;

  console.log("✅ Client 2 connected");

  trySendUpdates();
});

client2.on("message", (rawData) => {
  const data = toUint8Array(rawData);

  if (data.length === 0) {
    return;
  }

  const messageType = data[0];

  // 0 = Yjs update
  if (messageType === 0) {
    const update = data.slice(1);

    Y.applyUpdate(
      client2Doc,
      update
    );

    client2Received++;

    console.log(
      `📩 Client 2 received Yjs update`
    );
  }

  // 1 = Awareness
  if (messageType === 1) {
    console.log(
      `👤 Client 2 received awareness update`
    );
  }
});

client2.on("error", (error) => {
  console.error(
    "❌ Client 2 error:",
    error.message
  );
});


// =================================
// Send concurrent updates
// =================================

const trySendUpdates = () => {
  if (
    !client1Connected ||
    !client2Connected
  ) {
    return;
  }

  if (
    client1Sent &&
    client2Sent
  ) {
    return;
  }

  console.log("");
  console.log(
    "🚀 Both clients connected"
  );

  // Small delay so both clients
  // finish receiving initial state
  setTimeout(() => {

    // -----------------------------
    // User 1 update
    // -----------------------------

    client1Doc.transact(() => {
      client1Map.set(
        "user1",
        "User 1 added this change"
      );
    });

    const update1 =
      Y.encodeStateAsUpdate(
        client1Doc
      );

    const message1 =
      new Uint8Array(
        update1.length + 1
      );

    message1[0] = 0;

    message1.set(
      update1,
      1
    );

    client1.send(message1);

    client1Sent = true;

    console.log(
      "✏️ Client 1 sent update"
    );


    // -----------------------------
    // User 2 update
    // -----------------------------

    client2Doc.transact(() => {
      client2Map.set(
        "user2",
        "User 2 added another change"
      );
    });

    const update2 =
      Y.encodeStateAsUpdate(
        client2Doc
      );

    const message2 =
      new Uint8Array(
        update2.length + 1
      );

    message2[0] = 0;

    message2.set(
      update2,
      1
    );

    client2.send(message2);

    client2Sent = true;

    console.log(
      "✏️ Client 2 sent update"
    );

  }, 1000);
};


// =================================
// Verify result
// =================================

setTimeout(() => {

  console.log("");
  console.log("=================================");
  console.log(" Conflict Test Result");
  console.log("=================================");

  console.log(
    `Client 1 received: ${client1Received} Yjs updates`
  );

  console.log(
    `Client 2 received: ${client2Received} Yjs updates`
  );

  console.log("");

  const user1FromClient1 =
    client1Map.get("user1");

  const user2FromClient1 =
    client1Map.get("user2");

  const user1FromClient2 =
    client2Map.get("user1");

  const user2FromClient2 =
    client2Map.get("user2");


  console.log(
    "Client 1 state:"
  );

  console.log(
    "user1:",
    user1FromClient1
  );

  console.log(
    "user2:",
    user2FromClient1
  );

  console.log("");

  console.log(
    "Client 2 state:"
  );

  console.log(
    "user1:",
    user1FromClient2
  );

  console.log(
    "user2:",
    user2FromClient2
  );


  // =================================
  // Verify both changes exist
  // =================================

  const client1Success =
    user1FromClient1 ===
      "User 1 added this change" &&
    user2FromClient1 ===
      "User 2 added another change";

  const client2Success =
    user1FromClient2 ===
      "User 1 added this change" &&
    user2FromClient2 ===
      "User 2 added another change";


  console.log("");
  console.log(
    "================================="
  );


  if (
    client1Success &&
    client2Success
  ) {
    console.log(
      "🎉 CRDT CONFLICT TEST PASSED"
    );

    console.log(
      "✅ User 1 change preserved"
    );

    console.log(
      "✅ User 2 change preserved"
    );

    console.log(
      "✅ Both clients converged to same state"
    );
  } else {
    console.log(
      "❌ CRDT CONFLICT TEST FAILED"
    );

    console.log(
      "Some changes were not synchronized."
    );
  }


  // =================================
  // Close connections
  // =================================

  client1.close();
  client2.close();

  setTimeout(() => {
    process.exit(
      client1Success &&
      client2Success
        ? 0
        : 1
    );
  }, 500);

}, 5000);