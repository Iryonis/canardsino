/**
 * WebSocket Server for Duck Race
 * Handles connections, authentication, and message routing for duck racing
 * Users start in lobby and can create/join rooms
 */

import { WebSocketServer as WSServer, WebSocket } from "ws";
import { Server } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";
import { DuckRaceManager } from "./DuckRaceManager";
import {
  DuckRaceClientMessage,
  DuckRaceServerMessage,
  CreateRoomPayload,
  JoinRoomPayload,
  SetReadyPayload,
} from "./duckRaceTypes";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
  isAlive?: boolean;
}

export class DuckRaceWebSocketServer {
  private wss: WSServer;
  private gameManager: DuckRaceManager;
  private connections: Map<string, ExtendedWebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    // Create WebSocket server without attaching to HTTP server
    // Upgrade handling is done manually in server.ts
    this.wss = new WSServer({
      noServer: true,
    });

    // Initialize game manager with broadcast functions
    this.gameManager = new DuckRaceManager(
      this.broadcastToRoom.bind(this),
      this.sendToUser.bind(this),
      this.broadcastToLobby.bind(this)
    );

    // Setup connection handler
    this.wss.on("connection", (ws: ExtendedWebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Setup ping interval for connection health
    this.pingInterval = setInterval(() => {
      this.pingConnections();
    }, 30000);

    console.log("🦆 Duck Race WebSocket server initialized on /games/duck-race/ws");
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: ExtendedWebSocket, req: any): Promise<void> {
    console.log("🔗 New Duck Race WebSocket connection attempt");

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
      ws.username = payload.username || `Player_${payload.userId.substring(0, 8)}`;
      ws.isAlive = true;
      ws.roomId = undefined; // Start in lobby (no room)

      console.log(`✅ Duck Race user authenticated: ${ws.username} (${ws.userId})`);

      // Check for existing connection
      const existingConn = this.connections.get(ws.userId);
      if (existingConn) {
        console.log(`⚠️ Closing existing Duck Race connection for ${ws.username}`);
        existingConn.close(1000, "New connection opened");
      }

      // Store connection
      this.connections.set(ws.userId, ws);

      // Send room list with balance (user starts in lobby)
      const rooms = this.gameManager.getRoomList();
      const yourBalance = await this.gameManager.getUserBalance(ws.userId);
      this.send(ws, {
        type: "ROOM_LIST",
        payload: { rooms, yourBalance },
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
        console.error(`Duck Race WebSocket error for ${ws.username}:`, error);
      });

      // Setup pong handler
      ws.on("pong", () => {
        ws.isAlive = true;
      });
    } catch (error) {
      console.error("Duck Race token verification failed:", error);
      this.sendError(ws, "AUTH_FAILED", "Invalid authentication token");
      ws.close(1008, "Invalid token");
    }
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(ws: ExtendedWebSocket, data: Buffer): Promise<void> {
    if (!ws.userId || !ws.username) {
      this.sendError(ws, "NOT_AUTHENTICATED", "Not authenticated");
      return;
    }

    try {
      const message: DuckRaceClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "GET_ROOMS":
          await this.handleGetRooms(ws);
          break;

        case "CREATE_ROOM":
          await this.handleCreateRoom(ws, message.payload as CreateRoomPayload);
          break;

        case "JOIN_ROOM":
          await this.handleJoinRoom(ws, message.payload as JoinRoomPayload);
          break;

        case "LEAVE_ROOM":
          await this.handleLeaveRoom(ws);
          break;

        case "SET_READY":
          await this.handleSetReady(ws, message.payload as SetReadyPayload);
          break;

        case "PING":
          this.send(ws, { type: "PONG", timestamp: Date.now() });
          break;

        default:
          this.sendError(ws, "UNKNOWN_MESSAGE", `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error parsing Duck Race message:", error);
      this.sendError(ws, "INVALID_MESSAGE", "Invalid message format");
    }
  }

  /**
   * Handle get rooms request
   */
  private async handleGetRooms(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId) return;
    const rooms = this.gameManager.getRoomList();
    const yourBalance = await this.gameManager.getUserBalance(ws.userId);
    this.send(ws, {
      type: "ROOM_LIST",
      payload: { rooms, yourBalance },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle create room request
   */
  private async handleCreateRoom(
    ws: ExtendedWebSocket,
    payload?: CreateRoomPayload
  ): Promise<void> {
    if (!ws.userId || !ws.username) return;

    if (!payload || !payload.betAmount) {
      this.sendError(ws, "INVALID_PAYLOAD", "Bet amount is required");
      return;
    }

    // If already in a room, leave it first
    if (ws.roomId) {
      await this.gameManager.handleLeaveRoom(ws.userId, ws.roomId);
    }

    const result = await this.gameManager.handleCreateRoom(
      ws.userId,
      ws.username,
      payload.betAmount,
      payload.isPersistent ?? false,
      payload.roomName
    );

    if (!result.success) {
      this.sendError(ws, "CREATE_FAILED", result.error || "Failed to create room");
      return;
    }

    // Update the WebSocket's room
    ws.roomId = result.roomState?.roomId;

    // Send room state to creator
    this.send(ws, {
      type: "RACE_STATE",
      payload: result.roomState!,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle join room request
   */
  private async handleJoinRoom(
    ws: ExtendedWebSocket,
    payload?: JoinRoomPayload
  ): Promise<void> {
    if (!ws.userId || !ws.username) return;

    if (!payload || !payload.roomId) {
      this.sendError(ws, "INVALID_PAYLOAD", "Room ID is required");
      return;
    }

    // If already in a room, leave it first
    if (ws.roomId) {
      await this.gameManager.handleLeaveRoom(ws.userId, ws.roomId);
    }

    const result = await this.gameManager.handleJoinRoom(
      ws.userId,
      ws.username,
      payload.roomId
    );

    if (!result.success) {
      this.sendError(ws, "JOIN_FAILED", result.error || "Failed to join room");
      return;
    }

    // Update the WebSocket's room
    ws.roomId = payload.roomId;

    // Send room state to player
    this.send(ws, {
      type: "RACE_STATE",
      payload: result.roomState!,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      // Already in lobby
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    await this.gameManager.handleLeaveRoom(ws.userId, ws.roomId);
    ws.roomId = undefined;

    // Send room list with balance (back to lobby)
    const rooms = this.gameManager.getRoomList();
    const yourBalance = await this.gameManager.getUserBalance(ws.userId);
    this.send(ws, {
      type: "ROOM_LIST",
      payload: { rooms, yourBalance },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle set ready request
   */
  private async handleSetReady(
    ws: ExtendedWebSocket,
    payload?: SetReadyPayload
  ): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      this.sendError(ws, "NOT_IN_ROOM", "Not in a room");
      return;
    }

    if (payload === undefined || payload.isReady === undefined) {
      this.sendError(ws, "INVALID_PAYLOAD", "Ready status is required");
      return;
    }

    const result = await this.gameManager.handleSetReady(
      ws.userId,
      ws.roomId,
      payload.isReady
    );

    if (!result.success) {
      this.sendError(ws, "READY_FAILED", result.error || "Failed to set ready status");
    }
    // Success is broadcast by DuckRaceManager
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.userId) return;

    console.log(`👋 Duck Race user disconnected: ${ws.username}`);

    // Remove from connections
    this.connections.delete(ws.userId);

    // Handle room leave
    if (ws.roomId) {
      await this.gameManager.handleLeaveRoom(ws.userId, ws.roomId);
    }
  }

  /**
   * Send message to a specific WebSocket
   */
  private send(ws: WebSocket, message: DuckRaceServerMessage): void {
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
  sendToUser(userId: string, message: DuckRaceServerMessage): void {
    const ws = this.connections.get(userId);
    if (ws) {
      this.send(ws, message);
    }
  }

  /**
   * Broadcast message to all users in a room
   */
  broadcastToRoom(roomId: string, message: DuckRaceServerMessage, excludeUserId?: string): void {
    for (const [userId, ws] of this.connections) {
      if (ws.roomId === roomId && userId !== excludeUserId) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Broadcast message to all users in lobby (not in any room)
   */
  broadcastToLobby(message: DuckRaceServerMessage): void {
    for (const [, ws] of this.connections) {
      if (!ws.roomId) {
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
        console.log(`💀 Duck Race connection timeout for user ${userId}`);
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

    console.log("🧹 Duck Race WebSocket server cleaned up");
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
