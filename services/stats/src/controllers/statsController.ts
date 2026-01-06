// services/stats/src/controllers/statsController.ts
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { sseManager } from '../sse/manager';
import { StatsAggregator } from '../aggregators/statsAggregator';

export async function streamStats(req: Request, res: Response): Promise<void> {
  let userId: string | null = null;

  // Parse URL to get query params
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  

  // Try to get token from query param (EventSource doesn't support headers)
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.userId || decoded.sub || decoded.id;
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  }

  // Fallback: try to get from Authorization header
  if (!userId) {
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.userId || decoded.sub || decoded.id;
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    }
  }

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log(`🔌 SSE client connecting for userId: ${userId}`);

  // Register SSE client
  sseManager.addClient(userId, res);
  
  console.log(`✅ SSE client registered for userId: ${userId}`);

  // Send initial stats
  try {
    const stats = await StatsAggregator.getUserStats(userId);
    console.log(`📊 Sending initial stats for userId: ${userId}`);
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