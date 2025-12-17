import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './config/database.js';
import { WebSocketService } from './services/webSocketService.js';
import { ConnectionHandler } from './handlers/connectionHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

// Initialize services
const wsService = new WebSocketService(wss);
const connectionHandler = new ConnectionHandler(wsService);

// Connect to database
Database.connect();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    clients: wsService.getClientCount()
  });
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  connectionHandler.handleConnection(ws, req);
});

// Start server
const PORT = process.env.PORT || 8004;
httpServer.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await Database.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});