import { Router } from 'express';
import {
  streamStats,
  getUserStats,
  getUserHistory,
  getDashboard,
} from '../controllers/statsController';

const router = Router();

// SSE endpoint
router.get('/stream', streamStats);

router.get('/user/:userId', getUserStats);
router.get('/history/:userId', getUserHistory);
router.get('/dashboard', getDashboard);

export default router;