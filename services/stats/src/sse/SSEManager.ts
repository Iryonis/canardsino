import { Response } from 'express';

interface SSEClient {
    id: string;
    userId: string;
    response: Response;
}

/**
 * Manages Server-Sent Events (SSE) connections for real-time stats updates
 */
export class SSEManager {
    private clients: Map<string, SSEClient> = new Map();

    /**
     * Add a new SSE client connection
     */
    addClient(userId: string, res: Response): string {
        const clientId = `${userId}-${Date.now()}`;
        
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

        this.clients.set(clientId, { id: clientId, userId, response: res });

        // Handle client disconnect
        res.on('close', () => {
            this.removeClient(clientId);
        });

        return clientId;
    }

    /**
     * Remove a client connection
     */
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
    }

    /**
     * Send stats update to a specific user
     */
    sendToUser(userId: string, data: any): void {
        this.clients.forEach((client) => {
            if (client.userId === userId) {
                try {
                    client.response.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    console.error(`Failed to send to client ${client.id}:`, error);
                    this.removeClient(client.id);
                }
            }
        });
    }

    /**
     * Broadcast stats update to all connected clients
     */
    broadcast(data: any): void {
        this.clients.forEach((client) => {
            try {
                client.response.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error(`Failed to broadcast to client ${client.id}:`, error);
                this.removeClient(client.id);
            }
        });
    }

    /**
     * Get number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Get number of clients for a specific user
     */
    getUserClientCount(userId: string): number {
        let count = 0;
        this.clients.forEach((client) => {
            if (client.userId === userId) count++;
        });
        return count;
    }

    /**
     * Send heartbeat to all clients to keep connection alive
     */
    sendHeartbeat(): void {
        this.clients.forEach((client) => {
            try {
                client.response.write(`:heartbeat\n\n`);
            } catch (error) {
                console.error(`Failed to send heartbeat to client ${client.id}:`, error);
                this.removeClient(client.id);
            }
        });
    }
}

// Singleton instance
export const sseManager = new SSEManager();

// Send heartbeat every 30 seconds to keep connections alive
setInterval(() => {
    sseManager.sendHeartbeat();
}, 30000);
