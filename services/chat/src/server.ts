import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Database } from "./config/database.js";
import { WebSocketService } from "./services/webSocketService.js";
import { ConnectionHandler } from "./handlers/connectionHandler.js";

dotenv.config();

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chat Service API",
      description: "Chat microservice for CoinCoin Casino - WebSocket-based real-time game feed",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost/api/chat",
        description: "Development server (via NGINX)",
      },
      {
        url: "http://localhost:8004",
        description: "Direct access",
      },
    ],
  },
  apis: ["./src/server.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

// Swagger documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize services
const wsService = new WebSocketService(wss);
const connectionHandler = new ConnectionHandler(wsService);

// Connect to database
Database.connect();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Chat service health check
 *     responses:
 *       200:
 *         description: Service health with client count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 clients:
 *                   type: integer
 *                   description: Number of connected WebSocket clients
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    clients: wsService.getClientCount(),
  });
});

/**
 * @openapi
 * /system-message:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Broadcast system message
 *     description: Send a system message to all connected clients (big wins, announcements)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Player123 just won 100,000 CCC!"
 *     responses:
 *       200:
 *         description: Message broadcasted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Message is required
 */
app.post("/system-message", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    await wsService.broadcastSystemMessage(message);

    res.json({
      success: true,
      message: "System message broadcasted",
    });
  } catch (error) {
    console.error("Error broadcasting system message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  connectionHandler.handleConnection(ws, req);
});

// Start server
const PORT = process.env.CHAT_PORT;
httpServer.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await Database.disconnect();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
