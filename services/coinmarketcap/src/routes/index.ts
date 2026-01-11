import { Router } from 'express';
import { getQuotes, getQuote, getSupportedCryptos, getHealth } from '../controllers';

const router = Router();

router.get('/quotes', getQuotes);

router.get('/supported', getSupportedCryptos);

router.get('/health', getHealth);

router.get('/:symbol', getQuote);

export default router;
