import WebSocket from "ws";

const CLIENT_COUNT = 10;

const DOCUMENT_ID = "6a82137423643d43c693f4e3";

const WS_URL =
  `ws://127.0.0.1:5000/ws?documentId=${DOCUMENT_ID}`;

let connected = 0;
let received = 0;

const clients: WebSocket[] = [];

console.log("=================================");
console.log(" SyncDoc WebSocket Stress Test");
console.log("=================================");
console.log(`WebSocket URL: ${WS_URL}`);
console.log(`Clients: ${CLIENT_COUNT}`);
console.log(`Document: ${DOCUMENT_ID}`);
console.log("");

for (let i = 1; i <= CLIENT_COUNT; i++) {
  const client = new WebSocket(WS_URL);

  clients.push(client);

  // --------------------------------
  // Connected
  // --------------------------------

  client.on("open", () => {
    connected++;

    console.log(`✅ Client ${i} connected`);
  });

  // --------------------------------
  // Message received
  // --------------------------------

  client.on("message", () => {
    received++;

    console.log(
      `📩 Client ${i} received WebSocket message`
    );
  });

  // --------------------------------
  // Error
  // --------------------------------

  client.on("error", (error) => {
    console.error(
      `❌ Client ${i} error:`,
      error.message
    );
  });

  // --------------------------------
  // Disconnected
  // --------------------------------

  client.on("close", (code, reason) => {
    console.log(
      `🔌 Client ${i} disconnected`,
      `code=${code}`,
      `reason=${reason.toString()}`
    );
  });

  // --------------------------------
  // Unexpected HTTP response
  // --------------------------------

  client.on(
    "unexpected-response",
    (_request, response) => {
      console.error(
        `❌ Client ${i} unexpected HTTP response:`,
        response.statusCode,
        response.statusMessage
      );
    }
  );
}

// --------------------------------
// Test result
// --------------------------------

setTimeout(() => {
  console.log("");
  console.log("=================================");
  console.log(" Stress Test Result");
  console.log("=================================");

  console.log(
    `Connected clients : ${connected}/${CLIENT_COUNT}`
  );

  console.log(
    `Received messages: ${received}`
  );

  console.log("");

  if (connected === CLIENT_COUNT) {
    console.log(
      "✅ All 10 WebSocket clients connected successfully"
    );
  } else {
    console.log(
      "❌ WebSocket connection problem detected"
    );
  }

  // Close clients

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  setTimeout(() => {
    process.exit(0);
  }, 500);
}, 5000);