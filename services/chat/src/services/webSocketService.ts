import { WebSocketServer, WebSocket } from 'ws';
import { MessageService } from './messageService.js';

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    username?: string;
}

export class WebSocketService {
    private wss: WebSocketServer;

    constructor(wss: WebSocketServer) {
        this.wss = wss;
    }

    /**
     * Broadcast a system message to all connected clients (with DB save)
     */
    async broadcastSystemMessage(message: string): Promise<void> {
        const systemMessage = {
            type: 'system' as const,
            message,
            timestamp: new Date().toISOString()
        };

        // Save to database
        await MessageService.saveSystemMessage(message);

        // Broadcast to all clients
        this.broadcast(systemMessage);
    }

    /**
     * Broadcast a system message WITHOUT saving to database
     * Used for connection/disconnection notifications
     */
    broadcastSystemMessageNoPersist(message: string): void {
        const systemMessage = {
            type: 'system' as const,
            message,
            timestamp: new Date().toISOString()
        };

        // Broadcast to all clients (no DB save)
        this.broadcast(systemMessage);
    }

    /**
     * Broadcast a chat message to all connected clients
     */
    async broadcastChatMessage(username: string, message: string): Promise<void> {
        const chatMessage = {
            type: 'chat' as const,
            username,
            message,
            timestamp: new Date().toISOString()
        };

        // Save to database
        await MessageService.saveChatMessage(username, message);

        // Broadcast to all clients
        this.broadcast(chatMessage);
    }

    /**
     * Broadcast user count to all connected clients
     */
    broadcastUserCount(): void {
        const userCountMessage = {
            type: 'userCount' as const,
            count: this.getClientCount(),
            timestamp: new Date().toISOString()
        };

        this.broadcast(userCountMessage);
    }

    /**
     * Send recent messages to a specific client
     */
    async sendRecentMessages(ws: WebSocket): Promise<void> {
        const recentMessages = await MessageService.getRecentMessages(20);

        recentMessages.forEach((msg) => {
            ws.send(JSON.stringify({
                type: msg.type,
                username: msg.username,
                message: msg.message,
                timestamp: msg.timestamp.toISOString(),
            }));
        });
    }

    /**
     * Broadcast a message to all connected clients
     */
    private broadcast(message: object): void {
        const messageStr = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    /**
     * Get the number of connected clients
     */
    getClientCount(): number {
        return this.wss.clients.size;
    }
}