import { Router } from 'express';
import {
  getQuotes,
  getQuote,
  getSupportedCryptos,
  getDepositTokens,
  convertToCCC,
  getHealth
} from '../controllers';

const router = Router();

router.get('/quotes', getQuotes);

router.get('/supported', getSupportedCryptos);

router.get('/deposit-tokens', getDepositTokens);

router.get('/convert/:symbol/:amount', convertToCCC);

router.get('/health', getHealth);

router.get('/:symbol', getQuote);

export default router;
