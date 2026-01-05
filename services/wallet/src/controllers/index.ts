import { Request, Response } from "express";
import { Wallet, Transaction } from "../models/index.js";
import {
  verifyDeposit,
  getHotWalletAddress,
  getUsdcAddress,
  getExchangeRate,
} from "../blockchains/index.js";

// Extended request with user info from JWT
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Get user's CCC balance
 */
export async function getBalance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let wallet = await Wallet.findOne({ userId });

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    return res.json({
      balance: wallet.balance,
      userId: wallet.userId,
    });
  } catch (error) {
    console.error("Error getting balance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get deposit info (hot wallet address, exchange rate)
 */
export async function getDepositInfo(req: AuthRequest, res: Response) {
  try {
    const hotWalletAddress = getHotWalletAddress();
    const usdcAddress = getUsdcAddress();
    const exchangeRate = getExchangeRate();

    if (!hotWalletAddress) {
      return res.status(500).json({ error: "Hot wallet not configured" });
    }

    return res.json({
      hotWalletAddress,
      usdcAddress,
      exchangeRate,
      network: "polygon",
      chainId: 137,
    });
  } catch (error) {
    console.error("Error getting deposit info:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Verify and process a deposit
 */
export async function processDeposit(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { txHash, walletAddress } = req.body;

    if (!txHash || !walletAddress) {
      return res.status(400).json({ error: "txHash and walletAddress required" });
    }

    // Check if transaction already processed
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(400).json({ error: "Transaction already processed" });
    }

    // Verify the deposit on-chain
    const verification = await verifyDeposit(txHash as `0x${string}`);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Verify sender matches provided wallet address
    if (verification.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: "Wallet address mismatch" });
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      type: "deposit",
      amount: verification.cccAmount,
      usdcAmount: verification.amount,
      txHash,
      status: "confirmed",
      walletAddress,
    });

    // Update wallet balance
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: verification.cccAmount } },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        usdcAmount: transaction.usdcAmount,
        status: transaction.status,
      },
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error("Error processing deposit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get transaction history
 */
export async function getTransactions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ transactions });
  } catch (error) {
    console.error("Error getting transactions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Internal endpoint: Update balance (for game engine)
 * This should only be called by internal services
 */
export async function updateBalance(req: Request, res: Response) {
  try {
    const { userId, amount, type } = req.body;

    if (!userId || amount === undefined || !type) {
      return res.status(400).json({ error: "userId, amount, and type required" });
    }

    if (type !== "win" && type !== "bet") {
      return res.status(400).json({ error: "Invalid type" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // For bets, check if user has enough balance
    if (type === "bet" && wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalance =
      type === "win" ? wallet.balance + amount : wallet.balance - amount;

    wallet.balance = newBalance;
    await wallet.save();

    return res.json({
      success: true,
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error("Error updating balance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Internal endpoint: Get balance by userId (for game engine)
 */
export async function getBalanceInternal(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    let wallet = await Wallet.findOne({ userId });

    // Create wallet with default balance if doesn't exist
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 1000 }); // Default 1000 CCC for new users
    }

    return res.json({
      balance: wallet.balance,
      userId: wallet.userId,
    });
  } catch (error) {
    console.error("Error getting internal balance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
