import { Response } from 'express';

interface SSEClient {
  userId: string;
  res: Response;
  connectedAt: Date;
}

class StatsSSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, res: Response): void {
    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const client: SSEClient = {
      userId,
      res,
      connectedAt: new Date(),
    };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(client);

    console.log(`📊 SSE client connected: ${userId} (Total: ${this.getClientCount()})`);

    // Send connection confirmation
    this.sendEvent(userId, 'connected', {
      message: 'Connected to stats stream',
      timestamp: new Date().toISOString(),
    });

    // Handle disconnect
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  private removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const index = userClients.findIndex(c => c.res === res);
    if (index !== -1) {
      userClients.splice(index, 1);
      console.log(`📊 SSE client disconnected: ${userId} (Remaining: ${this.getClientCount()})`);
    }

    if (userClients.length === 0) {
      this.clients.delete(userId);
    }
  }

  sendEvent(userId: string, eventName: string, data: any): void {
    const userClients = this.clients.get(userId);
    
    console.log(`📡 Attempting to send event "${eventName}" to userId: ${userId}`);
    console.log(`   Connected clients for this user: ${userClients?.length || 0}`);
    
    if (!userClients || userClients.length === 0) {
      console.log(`⚠️ No clients connected for userId: ${userId}`);
      return;
    }

    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    userClients.forEach(client => {
      try {
        client.res.write(message);
        console.log(`✅ Event "${eventName}" sent to userId: ${userId}`);
      } catch (error) {
        console.error(`❌ Error sending SSE to ${userId}:`, error);
        this.removeClient(userId, client.res);
      }
    });
  }

  broadcast(eventName: string, data: any): void {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((clients, userId) => {
      clients.forEach(client => {
        try {
          client.res.write(message);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${userId}:`, error);
          this.removeClient(userId, client.res);
        }
      });
    });
  }

  getClientCount(): number {
    let count = 0;
    this.clients.forEach(clients => count += clients.length);
    return count;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  getStats(): any {
    const stats: any = {
      totalClients: this.getClientCount(),
      totalUsers: this.clients.size,
      users: [],
    };

    this.clients.forEach((clients, userId) => {
      stats.users.push({
        userId,
        connections: clients.length,
        connectedAt: clients[0]?.connectedAt,
      });
    });

    return stats;
  }
}

export const sseManager = new StatsSSEManager();