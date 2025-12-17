import { WebSocketServer, WebSocket } from 'ws';
import { MessageService } from './messageService.js';

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    username?: string;
}

export class WebSocketService {
    private wss: WebSocketServer;
    private connectedUsers: Set<string>; // Track unique usernames

    constructor(wss: WebSocketServer) {
        this.wss = wss;
        this.connectedUsers = new Set<string>();
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
     * Get the number of unique connected users
     */
    getClientCount(): number {
        return this.connectedUsers.size;
    }

    /**
     * Check if a user is already connected
     */
    isUserConnected(username: string): boolean {
        return this.connectedUsers.has(username);
    }

    /**
     * Add a user to the connected users set
     * Returns true if this is a new user connection
     */
    addUser(username: string): boolean {
        const wasConnected = this.connectedUsers.has(username);
        this.connectedUsers.add(username);
        return !wasConnected; // Return true if it's a new user
    }

    /**
     * Remove a user from the connected users set
     * Returns true if this was the last connection of this user
     */
    removeUser(username: string): boolean {
        // Check if user has other open connections
        const hasOtherConnections = Array.from(this.wss.clients).some(
            (client) => {
                const authClient = client as AuthenticatedWebSocket;
                return authClient.username === username && authClient.readyState === WebSocket.OPEN;
            }
        );

        if (!hasOtherConnections) {
            this.connectedUsers.delete(username);
            return true; // Last connection closed
        }
        return false; // User still has other connections
    }
}