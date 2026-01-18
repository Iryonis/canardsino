import { Router } from "express";
import {
  placeBets,
  spin,
  createSimpleBets,
  cancelBets,
  getCurrentBets,
  getBalance,
  validateSimpleBet,
  calculatePotentialPayout,
  getRouletteConfig,
  getUserGameHistory,
  getBigWins,
} from "../controllers/rouletteController";

const router = Router();

/**
 * @openapi
 * /roulette/config:
 *   get:
 *     tags:
 *       - Roulette
 *     summary: Get roulette configuration
 *     description: Get roulette wheel layout, colors, and payout rates
 *     responses:
 *       200:
 *         description: Roulette configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redNumbers:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 blackNumbers:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 payouts:
 *                   type: object
 *                   properties:
 *                     straight:
 *                       type: integer
 *                       example: 35
 *                     red:
 *                       type: integer
 *                       example: 1
 */
router.get("/config", getRouletteConfig);

/**
 * @openapi
 * /roulette/history:
 *   get:
 *     tags:
 *       - Roulette
 *     summary: Get game history
 *     description: Get the user's roulette game history with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: token
 *         in: query
 *         description: JWT token (alternative to Authorization header)
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Game history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 */
router.get("/history", getUserGameHistory);

/**
 * @openapi
 * /roulette/big-wins:
 *   get:
 *     tags:
 *       - Roulette
 *     summary: Get big wins
 *     description: Get recent big wins (10x multiplier or higher)
 *     responses:
 *       200:
 *         description: Big wins list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bigWins:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
router.get("/big-wins", getBigWins);

/**
 * @openapi
 * /roulette/bets:
 *   post:
 *     tags:
 *       - Roulette
 *     summary: Place bets (raw format)
 *     description: Place one or more bets on the roulette table using raw bet format
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bets
 *             properties:
 *               bets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [straight, split, street, corner, line, column, dozen, red, black, odd, even, high, low]
 *                     numbers:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     amount:
 *                       type: integer
 *                       minimum: 2000
 *     responses:
 *       200:
 *         description: Bets placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 totalAmount:
 *                   type: number
 *       400:
 *         description: Invalid bet or insufficient balance
 */
router.post("/bets", placeBets);

/**
 * @openapi
 * /roulette/simple-bets:
 *   post:
 *     tags:
 *       - Roulette
 *     summary: Place bets (simplified format)
 *     description: Place bets using a simplified format compatible with the frontend
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - simpleBets
 *             properties:
 *               simpleBets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - amount
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [straight, red, black, odd, even, high, low, column, dozen]
 *                     value:
 *                       oneOf:
 *                         - type: integer
 *                         - type: string
 *                     amount:
 *                       type: integer
 *                       minimum: 2000
 *     responses:
 *       200:
 *         description: Bets placed successfully
 */
router.post("/simple-bets", createSimpleBets);

/**
 * @openapi
 * /roulette/spin:
 *   post:
 *     tags:
 *       - Roulette
 *     summary: Spin the wheel
 *     description: Spin the roulette wheel, calculate results, and credit winnings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spin result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   properties:
 *                     totalBet:
 *                       type: number
 *                     totalWin:
 *                       type: number
 *                     netResult:
 *                       type: number
 *                     spinResult:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 36
 *       400:
 *         description: No bets placed
 */
router.post("/spin", spin);

/**
 * @openapi
 * /roulette/bets/{userId}:
 *   delete:
 *     tags:
 *       - Roulette
 *     summary: Cancel bets
 *     description: Cancel all current bets for a user
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bets cancelled
 *   get:
 *     tags:
 *       - Roulette
 *     summary: Get current bets
 *     description: Get the user's currently placed bets (before spin)
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current bets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 bets:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalAmount:
 *                   type: number
 */
router.delete("/bets/:userId", cancelBets);
router.get("/bets/:userId", getCurrentBets);

/**
 * @openapi
 * /roulette/balance:
 *   get:
 *     tags:
 *       - Roulette
 *     summary: Get balance via game engine
 *     description: Get user balance through the game engine (proxied from wallet service)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 */
router.get("/balance", getBalance);

/**
 * @openapi
 * /roulette/validate-bet:
 *   post:
 *     tags:
 *       - Roulette
 *     summary: Validate a bet
 *     description: Validate a single bet before placing it
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               value:
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *               amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 potentialPayout:
 *                   type: number
 *                 error:
 *                   type: string
 */
router.post("/validate-bet", validateSimpleBet);

/**
 * @openapi
 * /roulette/calculate-potential-payout:
 *   post:
 *     tags:
 *       - Roulette
 *     summary: Calculate potential payout
 *     description: Calculate the realistic maximum potential win for a list of bets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               simpleBets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Payout calculation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBet:
 *                   type: number
 *                 maxPotentialWin:
 *                   type: number
 *                 minPotentialWin:
 *                   type: number
 */
router.post("/calculate-potential-payout", calculatePotentialPayout);

export default router;
