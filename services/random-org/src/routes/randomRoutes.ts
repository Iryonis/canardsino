import { Router } from 'express';
import { fetchRouletteNumber } from '../controllers/randomController';
import { internalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/roulette', internalAuthMiddleware, fetchRouletteNumber);

export default router;