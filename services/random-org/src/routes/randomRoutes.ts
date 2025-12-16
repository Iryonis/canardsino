import { Router } from 'express';
import { fetchRouletteNumber } from '../controllers/randomController';

const router = Router();

router.get('/random/roulette', fetchRouletteNumber);

export default router;