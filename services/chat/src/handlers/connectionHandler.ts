import { WebSocket } from 'ws';
import { verifyAccessToken } from '../utils/jwtUtils.js';
import { parse } from 'url';
import { WebSocketService } from '../services/webSocketService.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
}

export class ConnectionHandler {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Handle a new WebSocket connection
   */
  async handleConnection(ws: AuthenticatedWebSocket, req: any): Promise<void> {
    console.log('New connection attempt');

    const { query } = parse(req.url || '', true);
    const token = query.token as string;

    if (!token) {
      ws.close(1008, 'Authentication required');
      console.log('Connection rejected: no token');
      return;
    }

    try {
      // Authenticate user
      const payload = verifyAccessToken(token);
      ws.userId = payload.userId;
      ws.username = payload.username;

      console.log(`User authenticated: ${ws.username} (${ws.userId})`);

      // Send recent messages to the new user
      await this.wsService.sendRecentMessages(ws);

      // Broadcast connection message (no DB save)
      this.wsService.broadcastSystemMessageNoPersist(`${ws.username} has joined the chat`);
      
      // Broadcast user count update
      this.wsService.broadcastUserCount();

      // Setup message handler
      ws.on('message', async (data: Buffer) => {
        await this.handleMessage(ws, data);
      });

      // Setup close handler
      ws.on('close', async () => {
        await this.handleDisconnection(ws);
      });

      // Setup error handler
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.log('Invalid token:', error);
      ws.close(1008, 'Invalid authentication token');
    }
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(ws: AuthenticatedWebSocket, data: Buffer): Promise<void> {
    try {
      const message = data.toString();
      
      if (ws.username) {
        await this.wsService.broadcastChatMessage(ws.username, message);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(ws: AuthenticatedWebSocket): Promise<void> {
    console.log(`User disconnected: ${ws.username}`);
    
    if (ws.username) {
      // Broadcast disconnection message (no DB save)
      this.wsService.broadcastSystemMessageNoPersist(`${ws.username} a quitté le chat`);
    }
    
    // Update user count
    this.wsService.broadcastUserCount();
  }
}