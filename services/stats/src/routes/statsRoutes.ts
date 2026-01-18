import { Router } from "express";
import { streamStats } from "../controllers/statsController";
import { healthCheck } from "../server";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Stats service health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: stats
 *                 mongodb:
 *                   type: boolean
 *                 uptime:
 *                   type: number
 */
router.get("/health", healthCheck);

/**
 * @openapi
 * /stream:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Real-time stats stream (SSE)
 *     description: |
 *       Server-Sent Events stream for real-time user statistics.
 *
 *       **Events:**
 *       - `initial-stats`: Sent on connection with user's game statistics
 *       - Heartbeat comments every 30 seconds
 *
 *       **Authentication:** Use `token` query parameter (EventSource doesn't support headers)
 *     parameters:
 *       - name: token
 *         in: query
 *         required: true
 *         description: JWT access token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 event: initial-stats
 *                 data: {"totalGames": 50, "totalWins": 25, "totalLosses": 25}
 *       401:
 *         description: Invalid or missing token
 */
router.get("/stream", streamStats);

export default router;
