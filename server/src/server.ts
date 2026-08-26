import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";

import { connectDB } from "./config/db";
import documentRoutes from "./routes/document.routes";
import { setupWebSocketServer } from "./realtime/websocket.server";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "SyncDoc API is running",
  });
});

app.use(
  "/api/documents",
  documentRoutes
);

const PORT =
  process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = createServer(app);

  setupWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(
      `SyncDoc server running on port ${PORT}`
    );
  });
};

startServer();