import express from 'express';
import { StatsController } from '../controllers';

const router = express.Router();

// SSE endpoint for streaming stats updates
router.get('/stream/:userId', StatsController.streamStats);

// Regular REST endpoints
router.get('/:userId', StatsController.getStats);
router.post('/:userId/update', StatsController.updateStats);

// Connection info
router.get('/connections/info', StatsController.getConnectionInfo);

export default router;
