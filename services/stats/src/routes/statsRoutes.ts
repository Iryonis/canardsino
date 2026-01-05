import { Router } from 'express';
import {
  streamStats,
} from '../controllers/statsController';

const router = Router();

// SSE endpoint
router.get('/stream', streamStats);

export default router;