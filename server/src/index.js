import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { PokerStore } from "./store.js";
import { registerSocketHandlers } from "./sockets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, "..", "..", "client", "dist");

const app = express();
app.use(cors());
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production the server also serves the pre-built React app.
app.use(express.static(CLIENT_DIST));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});

const store = new PokerStore();
registerSocketHandlers(io, store);

httpServer.listen(PORT, () => {
  console.log(`Planning Poker server listening on port ${PORT}`);
});
