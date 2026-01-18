/**
 * WebSocket Server for Multiplayer Roulette
 * Handles connections, authentication, and message routing
 */

import { WebSocketServer as WSServer, WebSocket } from "ws";
import { Server } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";
import { GameRoundManager } from "./GameRoundManager";
import {
  AuthenticatedWebSocket,
  ClientMessage,
  ServerMessage,
  MULTIPLAYER_CONFIG,
  PlaceBetPayload,
  RemoveBetPayload,
} from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
  isAlive?: boolean;
}

export class WebSocketServerHandler {
  private wss: WSServer;
  private gameManager: GameRoundManager;
  private connections: Map<string, ExtendedWebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    // Create WebSocket server without attaching to HTTP server
    // Upgrade handling is done manually in server.ts
    this.wss = new WSServer({
      noServer: true,
    });

    // Initialize game manager with broadcast functions
    this.gameManager = new GameRoundManager(
      this.broadcastToRoom.bind(this),
      this.sendToUser.bind(this)
    );

    // Setup connection handler
    this.wss.on("connection", (ws: ExtendedWebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Setup ping interval for connection health
    this.pingInterval = setInterval(() => {
      this.pingConnections();
    }, MULTIPLAYER_CONFIG.PING_INTERVAL);

    console.log("🔌 WebSocket server initialized on /games/roulette/ws");
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(
    ws: ExtendedWebSocket,
    req: any
  ): Promise<void> {
    console.log("🔗 New WebSocket connection attempt");

    // Extract token from query params
    const { query } = parse(req.url || "", true);
    const token = query.token as string;

    if (!token) {
      this.sendError(ws, "AUTH_REQUIRED", "Authentication token required");
      ws.close(1008, "Authentication required");
      return;
    }

    // Verify JWT token
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        email?: string;
      };

      ws.userId = payload.userId;
      ws.username =
        payload.username || `Player_${payload.userId.substring(0, 8)}`;
      ws.isAlive = true;

      console.log(`✅ User authenticated: ${ws.username} (${ws.userId})`);

      // Check for existing connection
      const existingConn = this.connections.get(ws.userId);
      if (existingConn) {
        console.log(`⚠️ Closing existing connection for ${ws.username}`);
        existingConn.close(1000, "New connection opened");
      }

      // Store connection
      this.connections.set(ws.userId, ws);

      // Auto-join default room
      const roomId =
        (query.room as string) || MULTIPLAYER_CONFIG.DEFAULT_ROOM_ID;
      ws.roomId = roomId;

      const roomState = await this.gameManager.handlePlayerJoin(
        ws.userId,
        ws.username,
        roomId
      );

      // Send room state to client
      this.send(ws, {
        type: "ROOM_STATE",
        payload: roomState,
        timestamp: Date.now(),
      });

      // Setup message handler
      ws.on("message", async (data: Buffer) => {
        await this.handleMessage(ws, data);
      });

      // Setup close handler
      ws.on("close", () => {
        this.handleDisconnection(ws);
      });

      // Setup error handler
      ws.on("error", (error) => {
        console.error(`WebSocket error for ${ws.username}:`, error);
      });

      // Setup pong handler
      ws.on("pong", () => {
        ws.isAlive = true;
      });
    } catch (error) {
      console.error("Token verification failed:", error);
      this.sendError(ws, "AUTH_FAILED", "Invalid authentication token");
      ws.close(1008, "Invalid token");
    }
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(
    ws: ExtendedWebSocket,
    data: Buffer
  ): Promise<void> {
    if (!ws.userId || !ws.username) {
      this.sendError(ws, "NOT_AUTHENTICATED", "Not authenticated");
      return;
    }

    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "JOIN_ROOM":
          await this.handleJoinRoom(ws, message.payload as { roomId?: string });
          break;

        case "LEAVE_ROOM":
          await this.handleLeaveRoom(ws);
          break;

        case "PLACE_BET":
          await this.handlePlaceBet(ws, message.payload as PlaceBetPayload);
          break;

        case "REMOVE_BET":
          await this.handleRemoveBet(ws, message.payload as RemoveBetPayload);
          break;

        case "CLEAR_BETS":
          await this.handleClearBets(ws);
          break;

        case "LOCK_BETS":
          await this.handleLockBets(ws);
          break;

        case "PING":
          this.send(ws, { type: "PONG", timestamp: Date.now() });
          break;

        default:
          this.sendError(
            ws,
            "UNKNOWN_MESSAGE",
            `Unknown message type: ${message.type}`
          );
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      this.sendError(ws, "INVALID_MESSAGE", "Invalid message format");
    }
  }

  /**
   * Handle join room request
   */
  private async handleJoinRoom(
    ws: ExtendedWebSocket,
    payload?: { roomId?: string }
  ): Promise<void> {
    if (!ws.userId || !ws.username) return;

    const roomId = payload?.roomId || MULTIPLAYER_CONFIG.DEFAULT_ROOM_ID;

    // Leave current room if different
    if (ws.roomId && ws.roomId !== roomId) {
      this.gameManager.handlePlayerLeave(ws.userId, ws.roomId);
    }

    ws.roomId = roomId;

    const roomState = await this.gameManager.handlePlayerJoin(
      ws.userId,
      ws.username,
      roomId
    );

    this.send(ws, {
      type: "ROOM_STATE",
      payload: roomState,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId || !ws.roomId) return;

    this.gameManager.handlePlayerLeave(ws.userId, ws.roomId);
    ws.roomId = undefined;

    // Don't close connection, just leave the room
    this.send(ws, {
      type: "ROOM_STATE",
      payload: {
        roomId: "",
        roundId: "",
        phase: "betting",
        timeRemaining: 0,
        players: [],
        yourBets: [],
        yourBalance: 0,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle bet placement
   */
  private async handlePlaceBet(
    ws: ExtendedWebSocket,
    payload?: PlaceBetPayload
  ): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    if (!payload) {
      this.sendError(ws, "INVALID_BET", "Bet data required");
      return;
    }

    const result = await this.gameManager.handlePlaceBet(ws.userId, ws.roomId, {
      type: payload.type,
      value: payload.value,
      amount: payload.amount,
      numbers: payload.numbers,
    });

    if (!result.success) {
      this.sendError(ws, "BET_FAILED", result.error || "Failed to place bet");
    }
    // Success is broadcast by GameRoundManager
  }

  /**
   * Handle bet removal
   */
  private async handleRemoveBet(
    ws: ExtendedWebSocket,
    payload?: RemoveBetPayload
  ): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    if (payload?.betIndex === undefined) {
      this.sendError(ws, "INVALID_REQUEST", "Bet index required");
      return;
    }

    const result = await this.gameManager.handleRemoveBet(
      ws.userId,
      ws.roomId,
      payload.betIndex
    );

    if (!result.success) {
      this.sendError(
        ws,
        "REMOVE_FAILED",
        result.error || "Failed to remove bet"
      );
    }
  }

  /**
   * Handle clear all bets
   */
  private async handleClearBets(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    const result = await this.gameManager.handleClearBets(ws.userId, ws.roomId);

    if (!result.success) {
      this.sendError(
        ws,
        "CLEAR_FAILED",
        result.error || "Failed to clear bets"
      );
    }
  }

  /**
   * Handle lock bets request
   */
  private async handleLockBets(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    const result = await this.gameManager.handleLockBets(ws.userId, ws.roomId);

    if (!result.success) {
      this.sendError(ws, "LOCK_FAILED", result.error || "Failed to lock bets");
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: ExtendedWebSocket): void {
    if (!ws.userId) return;

    console.log(`👋 User disconnected: ${ws.username}`);

    // Remove from connections
    this.connections.delete(ws.userId);

    // Handle room leave
    if (ws.roomId) {
      this.gameManager.handlePlayerLeave(ws.userId, ws.roomId);
    }
  }

  /**
   * Send message to a specific WebSocket
   */
  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to a specific WebSocket
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    this.send(ws, {
      type: "ERROR",
      payload: { code, message },
      timestamp: Date.now(),
    });
  }

  /**
   * Send message to a specific user by ID
   */
  sendToUser(userId: string, message: ServerMessage): void {
    const ws = this.connections.get(userId);
    if (ws) {
      this.send(ws, message);
    }
  }

  /**
   * Broadcast message to all users in a room
   */
  broadcastToRoom(
    roomId: string,
    message: ServerMessage,
    excludeUserId?: string
  ): void {
    for (const [userId, ws] of this.connections) {
      if (ws.roomId === roomId && userId !== excludeUserId) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Ping all connections to check health
   */
  private pingConnections(): void {
    for (const [userId, ws] of this.connections) {
      if (ws.isAlive === false) {
        console.log(`💀 Connection timeout for user ${userId}`);
        ws.terminate();
        this.connections.delete(userId);
        continue;
      }

      ws.isAlive = false;
      ws.ping();
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.connections.size;
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all connections
    for (const ws of this.connections.values()) {
      ws.close(1001, "Server shutting down");
    }

    this.connections.clear();
    this.gameManager.cleanup();

    console.log("🧹 WebSocket server cleaned up");
  }

  /**
   * Handle HTTP upgrade request
   */
  handleUpgrade(request: any, socket: any, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request);
    });
  }
}
