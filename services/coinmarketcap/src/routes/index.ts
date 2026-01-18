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

/**
 * @openapi
 * /quotes:
 *   get:
 *     tags:
 *       - Prices
 *     summary: Get all crypto prices
 *     description: Get current prices for all supported cryptocurrencies (cached)
 *     responses:
 *       200:
 *         description: Price quotes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                   example:
 *                     ETH: 3500.42
 *                     BTC: 65000.00
 *                     USDC: 1.00
 *                 cached:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/quotes', getQuotes);

/**
 * @openapi
 * /supported:
 *   get:
 *     tags:
 *       - Prices
 *     summary: List supported cryptocurrencies
 *     description: Get list of all supported cryptocurrency symbols
 *     responses:
 *       200:
 *         description: Supported symbols
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["ETH", "BTC", "USDC", "WETH"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/supported', getSupportedCryptos);

/**
 * @openapi
 * /deposit-tokens:
 *   get:
 *     tags:
 *       - Prices
 *     summary: Get deposit token info
 *     description: Get information about tokens accepted for deposits on Polygon
 *     responses:
 *       200:
 *         description: Deposit tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       address:
 *                         type: string
 *                       decimals:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 network:
 *                   type: string
 *                   example: "Polygon"
 *                 chainId:
 *                   type: integer
 *                   example: 137
 */
router.get('/deposit-tokens', getDepositTokens);

/**
 * @openapi
 * /convert/{symbol}/{amount}:
 *   get:
 *     tags:
 *       - Prices
 *     summary: Convert crypto to CCC
 *     description: Calculate CCC token amount for a given crypto amount
 *     parameters:
 *       - name: symbol
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: ETH
 *       - name: amount
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         example: 0.1
 *     responses:
 *       200:
 *         description: Conversion result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     inputSymbol:
 *                       type: string
 *                       example: "ETH"
 *                     inputAmount:
 *                       type: number
 *                       example: 0.1
 *                     priceUSD:
 *                       type: number
 *                       example: 3500.42
 *                     usdValue:
 *                       type: number
 *                       example: 350.042
 *                     cccAmount:
 *                       type: integer
 *                       example: 350042
 *                     rate:
 *                       type: integer
 *                       example: 1000
 */
router.get('/convert/:symbol/:amount', convertToCCC);

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: CoinMarketCap service health check
 *     responses:
 *       200:
 *         description: Service health with cache status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded]
 *                 cacheStatus:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', getHealth);

/**
 * @openapi
 * /{symbol}:
 *   get:
 *     tags:
 *       - Prices
 *     summary: Get single crypto price
 *     description: Get current price for a specific cryptocurrency
 *     parameters:
 *       - name: symbol
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ETH, BTC, USDC, WETH]
 *         example: ETH
 *     responses:
 *       200:
 *         description: Price data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     price:
 *                       type: number
 *                 cached:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Cryptocurrency not supported
 */
router.get('/:symbol', getQuote);

export default router;
