import { Request, Response } from 'express';
import { sseManager } from '../sse';
import { StatsService } from '../services/StatsService';

export class StatsController {
    /**
     * Establish SSE connection for a user
     * GET /stats/stream/:userId
     */
    static async streamStats(req: Request, res: Response): Promise<void> {
        const { userId } = req.params;

        if (!userId) {
            res.status(400).json({ error: 'User ID is required' });
            return;
        }

        try {
            // Add client to SSE manager
            const clientId = sseManager.addClient(userId, res);
            console.log(`SSE client connected: ${clientId} for user: ${userId}`);

            // Send initial stats
            const stats = await StatsService.getStatsByUserId(userId);
            if (stats) {
                res.write(`data: ${JSON.stringify({ type: 'initial_stats', stats })}\n\n`);
            }
        } catch (error) {
            console.error('Error establishing SSE connection:', error);
            res.status(500).json({ error: 'Failed to establish connection' });
        }
    }

    /**
     * Get stats for a specific user
     * GET /stats/:userId
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        const { userId } = req.params;

        try {
            const stats = await StatsService.getStatsByUserId(userId);
            
            if (!stats) {
                res.status(404).json({ error: 'Stats not found' });
                return;
            }

            res.json(stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    }

    /**
     * Manual update for testing purposes
     * POST /stats/:userId/update
     */
    static async updateStats(req: Request, res: Response): Promise<void> {
        const { userId } = req.params;
        const { statField, incrementBy } = req.body;

        try {
            await StatsService.incrementStat(userId, statField, incrementBy || 1);
            res.json({ success: true, message: 'Stats updated' });
        } catch (error) {
            console.error('Error updating stats:', error);
            res.status(500).json({ error: 'Failed to update stats' });
        }
    }

    /**
     * Get SSE connection info
     * GET /stats/connections/info
     */
    static getConnectionInfo(req: Request, res: Response): void {
        const totalClients = sseManager.getClientCount();
        res.json({ 
            totalConnections: totalClients,
            timestamp: new Date().toISOString()
        });
    }
}
