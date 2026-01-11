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

// Public endpoint - get deposit info (hot wallet address, etc.)
router.get("/deposit-info", getDepositInfo);

// Protected endpoints (require JWT)
router.get("/balance", authMiddleware, getBalance);
router.post("/deposit", authMiddleware, processDeposit);
router.get("/transactions", authMiddleware, getTransactions);
router.post("/give", authMiddleware, giveTokens);

// Internal endpoints (for game engine) - require internal API key
router.post("/internal/update-balance", internalAuthMiddleware, updateBalance);
router.get("/internal/balance/:userId", internalAuthMiddleware, getBalanceInternal);

export default router;
