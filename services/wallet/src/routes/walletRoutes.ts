import { Router } from "express";
import {
  getBalance,
  getDepositInfo,
  processDeposit,
  getTransactions,
  updateBalance,
  getBalanceInternal,
  giveTokens,
} from "../controllers/walletController.js";
import { authMiddleware, internalAuthMiddleware } from "../middleware/auth.js";

const router = Router();

/**
 * @openapi
 * /deposit-info:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get deposit information
 *     description: Get the hot wallet address and supported tokens for deposits (public endpoint)
 *     responses:
 *       200:
 *         description: Deposit configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hotWalletAddress:
 *                   type: string
 *                   example: "0x742d35Cc6634C0532925a3b844Bc9e7595f..."
 *                 supportedTokens:
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
 *                 cccPerUSD:
 *                   type: integer
 *                   example: 1000
 *                 network:
 *                   type: string
 *                   example: "Polygon"
 *                 chainId:
 *                   type: integer
 *                   example: 137
 */
router.get("/deposit-info", getDepositInfo);

/**
 * @openapi
 * /balance:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get user balance
 *     description: Retrieve the authenticated user's CCC balance
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
 *                   example: 50000
 *                 userId:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/balance", authMiddleware, getBalance);

/**
 * @openapi
 * /deposit:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Process crypto deposit
 *     description: Verify a blockchain transaction and credit CCC tokens to the user's account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - txHash
 *               - walletAddress
 *             properties:
 *               txHash:
 *                 type: string
 *                 description: Polygon transaction hash
 *                 example: "0x123abc..."
 *               walletAddress:
 *                 type: string
 *                 description: User's wallet address that sent the deposit
 *                 example: "0x742d35Cc..."
 *               cryptoSymbol:
 *                 type: string
 *                 description: Cryptocurrency symbol (default ETH)
 *                 example: "ETH"
 *     responses:
 *       200:
 *         description: Deposit processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   type: object
 *                 newBalance:
 *                   type: number
 *       400:
 *         description: Invalid transaction or already processed
 */
router.post("/deposit", authMiddleware, processDeposit);

/**
 * @openapi
 * /transactions:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get transaction history
 *     description: Retrieve the user's transaction history (last 50 transactions)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [deposit, withdrawal, bet, win]
 *                       amount:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get("/transactions", authMiddleware, getTransactions);

/**
 * @openapi
 * /give:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Give tokens (test only)
 *     description: Self-credit CCC tokens for testing purposes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 example: 10000
 *     responses:
 *       200:
 *         description: Tokens credited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 amount:
 *                   type: integer
 *                 newBalance:
 *                   type: number
 */
router.post("/give", authMiddleware, giveTokens);

/**
 * @openapi
 * /internal/update-balance:
 *   post:
 *     tags:
 *       - Internal
 *     summary: Update balance (internal)
 *     description: Internal endpoint for game engine to update user balance after bets/wins
 *     security:
 *       - internalApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Positive for wins, negative for bets
 *               type:
 *                 type: string
 *                 enum: [win, bet]
 *     responses:
 *       200:
 *         description: Balance updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 newBalance:
 *                   type: number
 */
router.post("/internal/update-balance", internalAuthMiddleware, updateBalance);

/**
 * @openapi
 * /internal/balance/{userId}:
 *   get:
 *     tags:
 *       - Internal
 *     summary: Get balance by userId (internal)
 *     description: Internal endpoint for game engine to get user balance
 *     security:
 *       - internalApiKey: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *                 userId:
 *                   type: string
 */
router.get("/internal/balance/:userId", internalAuthMiddleware, getBalanceInternal);

export default router;
