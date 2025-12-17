// services/chat/src/server/server.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyAccessToken } from '../utils/jwtUtils.ts';
import { parse } from 'url';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
}

/**
 * Send a system message to all connected clients. System mesages are used for notifications like user join/leave.
 * @param message  The system message to broadcast
 */
const broadcastSystemMessage = (message: string) => {
  const systemMessage = JSON.stringify({
    type: 'system',
    message,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(systemMessage);
    }
  });
};

/**
 * Forward a chat message from a user to all connected clients.
 * @param username  The username of the sender
 * @param message  The message content   
 */
const broadcastChatMessage = (username: string, message: string) => {
  const chatMessage = JSON.stringify({
    type: 'chat',
    username,
    message,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(chatMessage);
    }
  });
};

wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
  console.log('New connection attempt');

  
  const { query } = parse(req.url || '', true);
  const token = query.token as string;

  if (!token) {
    ws.close(1008, 'Authentication required');
    console.log('Connection rejected: no token');
    return;
  }

  try {
   
    const payload = verifyAccessToken(token);
    ws.userId = payload.userId;
    ws.username = payload.username;

    // Connection message
    broadcastSystemMessage(`${ws.username} has joined the chat`);

    // When a message is received from a client
    ws.on('message', (data: Buffer) => {
      try {
        const message = data.toString();
        
        // Broadcast the message with the username
        if (ws.username) {
          broadcastChatMessage(ws.username, message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`User disconnected: ${ws.username}`);
      if (ws.username) {
        broadcastSystemMessage(`${ws.username} a quitté le chat`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

  } catch (error) {
    console.log('Invalid token:', error);
    ws.close(1008, 'Invalid authentication token');
  }
});

const PORT = process.env.PORT || 8004;
httpServer.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});