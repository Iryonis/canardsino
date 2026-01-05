import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sseManager } from '../sse/manager';
import { StatsAggregator } from '../aggregators/statsAggregator';

function getUserIdFromToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded.userId || decoded.sub || decoded.id;
  } catch (error) {
    return null;
  }
}

/**
 * SSE Stream endpoint
 */
export async function streamStats(req: Request, res: Response): Promise<void> {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Register SSE client
  sseManager.addClient(userId, res);

  // Send initial stats
  try {
    const stats = await StatsAggregator.getUserStats(userId);
    sseManager.sendEvent(userId, 'initial-stats', stats);
  } catch (error) {
    console.error('Error fetching initial stats:', error);
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
}

/**
 * Get user stats (REST endpoint)
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const stats = await StatsAggregator.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user history (REST endpoint)
 */
export async function getUserHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const history = await StatsAggregator.getUserHistory(
      userId,
      Number(limit),
      Number(skip)
    );

    res.json({ history, total: history.length });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Dashboard: SSE connection status
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  res.json(sseManager.getStats());
}