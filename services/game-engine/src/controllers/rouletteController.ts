import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { RouletteLogic } from "../game-logic/RouletteLogic";
import { Bet, RouletteSession } from "../models/RouletteTypes";

// In-memory storage for sessions and wallets (mock)
const sessions = new Map<string, RouletteSession>();
const wallets = new Map<string, number>();

/**
 * Extract userId from JWT token in request headers
 */
function getUserIdFromToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  console.log(
    "🔍 Auth header:",
    authHeader ? authHeader.substring(0, 30) + "..." : "NO AUTH HEADER"
  );

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("❌ No Bearer token found");
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as any;
    console.log("✅ Token decoded, userId:", decoded.userId);
    return decoded.userId || decoded.sub || decoded.id;
  } catch (error) {
    console.error("❌ Invalid token:", error);
    return null;
  }
}

/**
 * Place bets for a user session
 * @param req - Express request containing bets array
 * @param res - Express response
 */
export async function placeBets(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const { bets } = req.body;

    if (!Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ error: "At least one bet is required" });
    }

    // Validate all bets
    for (const bet of bets) {
      const validation = RouletteLogic.validateBet(bet);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    // Calculate total bet amount
    const totalAmount = bets.reduce(
      (sum: number, bet: Bet) => sum + bet.amount,
      0
    );

    // Check balance with mock wallet
    const currentBalance = wallets.get(userId) || 1000;

    if (currentBalance < totalAmount) {
      return res.status(400).json({
        error: "Insufficient balance",
        required: totalAmount,
        available: currentBalance,
      });
    }

    // Create or update session
    sessions.set(userId, {
      userId,
      bets,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      userId,
      bets,
      totalAmount,
      message: "Bets placed successfully. Ready to spin!",
    });
  } catch (error) {
    console.error("Error placing bets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Spin the wheel and calculate results
 * @param req - Express request
 * @param res - Express response
 */
export async function spin(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    // Retrieve session
    const session = sessions.get(userId);
    if (!session || !session.bets || session.bets.length === 0) {
      return res
        .status(400)
        .json({ error: "No bets placed. Place bets first." });
    }

    // Get random number (0-36)
    const winningNumber = Math.floor(Math.random() * 37);
    const source = "mock-random";

    // Calculate game results
    const gameResult = RouletteLogic.calculateGameResult(
      session.bets,
      winningNumber,
      source
    );

    // Update mock wallet
    const currentBalance = wallets.get(userId) || 1000;
    const newBalance = currentBalance + gameResult.netResult;
    wallets.set(userId, newBalance);

    // Clear session
    sessions.delete(userId);

    // Return result
    res.json({
      success: true,
      result: gameResult,
    });
  } catch (error) {
    console.error("Error spinning wheel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Create simplified bets (compatible with frontend format)
 * @param req - Express request containing simpleBets array
 * @param res - Express response
 */
export async function createSimpleBets(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const { simpleBets } = req.body;

    if (!Array.isArray(simpleBets) || simpleBets.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one simple bet is required" });
    }

    // Convert simple bets to standard bet format
    const bets: Bet[] = [];
    for (const simpleBet of simpleBets) {
      try {
        let bet: Bet;

        // If numbers is provided, use directly (complex bets)
        if (simpleBet.numbers !== undefined) {
          bet = {
            type: simpleBet.type,
            numbers: simpleBet.numbers || [],
            amount: simpleBet.amount,
          };
        } else {
          // Use createSimpleBet for simple bets with value
          bet = RouletteLogic.createSimpleBet(
            simpleBet.type,
            simpleBet.value,
            simpleBet.amount
          );
        }

        // Validate bet
        const validation = RouletteLogic.validateBet(bet);
        if (!validation.valid) {
          return res.status(400).json({
            error: validation.error || "Invalid bet",
          });
        }

        bets.push(bet);
      } catch (error) {
        return res.status(400).json({
          error: `Invalid simple bet: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        });
      }
    }

    // Utiliser la fonction placeBets
    req.body.bets = bets;
    return placeBets(req, res);
  } catch (error) {
    console.error("Error creating simple bets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Cancel a user's bets
 * @param req - Express request with userId param
 * @param res - Express response
 */
export async function cancelBets(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    sessions.delete(userId);

    res.json({
      success: true,
      message: "Bets cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling bets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get a user's current bets
 * @param req - Express request with userId param
 * @param res - Express response
 */
export async function getCurrentBets(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const session = sessions.get(userId);

    if (!session) {
      return res.json({
        userId,
        bets: [],
        totalAmount: 0,
      });
    }

    const totalAmount = session.bets.reduce((sum, bet) => sum + bet.amount, 0);

    res.json({
      userId,
      bets: session.bets,
      totalAmount,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error("Error getting current bets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get mock wallet balance
 * @param req - Express request
 * @param res - Express response
 */
export function getBalance(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const balance = wallets.get(userId) || 1000;
    res.json({ balance });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Validate a simple bet before adding it
 * @param req - Express request with bet data
 * @param res - Express response
 */
export function validateSimpleBet(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const { type, value, amount } = req.body;

    if (!type || amount === undefined) {
      return res.status(400).json({ error: "Type and amount are required" });
    }

    if (amount <= 0) {
      return res.json({
        valid: false,
        error: "Bet amount must be positive",
      });
    }

    // Convert to standard bet format for validation
    try {
      const bet = RouletteLogic.createSimpleBet(type, value, amount);
      const validation = RouletteLogic.validateBet(bet);

      if (!validation.valid) {
        return res.json({
          valid: false,
          error: validation.error,
        });
      }

      // Calculer le payout potentiel
      const potentialPayout = RouletteLogic.calculatePayout(bet);

      res.json({
        valid: true,
        bet,
        potentialPayout,
        message: "Bet is valid",
      });
    } catch (error) {
      return res.json({
        valid: false,
        error: error instanceof Error ? error.message : "Invalid bet type",
      });
    }
  } catch (error) {
    console.error("Error validating bet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Calculate total potential payout for a list of bets
 * @param req - Express request containing simpleBets array
 * @param res - Express response
 */
export function calculatePotentialPayout(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const { simpleBets } = req.body;

    if (!Array.isArray(simpleBets) || simpleBets.length === 0) {
      return res.json({
        totalBet: 0,
        potentialPayouts: [],
        maxPotentialWin: 0,
        minPotentialWin: 0,
      });
    }

    let totalBet = 0;
    const potentialPayouts: Array<{
      bet: Bet;
      payout: number;
      netWin: number;
    }> = [];

    // Convert and calculate payout for each bet
    for (const simpleBet of simpleBets) {
      try {
        const bet: Bet =
          simpleBet.numbers !== undefined
            ? {
                type: simpleBet.type,
                numbers: simpleBet.numbers || [],
                amount: simpleBet.amount,
              }
            : RouletteLogic.createSimpleBet(
                simpleBet.type,
                simpleBet.value,
                simpleBet.amount
              );

        // Validate bet
        const validation = RouletteLogic.validateBet(bet);
        if (!validation.valid) {
          return res.json({
            valid: false,
            error: validation.error,
            message: validation.error,
          });
        }

        totalBet += bet.amount;
        const payout = RouletteLogic.calculatePayout(bet);
        const netWin = payout - bet.amount;

        potentialPayouts.push({
          bet,
          payout,
          netWin,
        });
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid bet in list",
        });
      }
    }

    // Calculate maximum potential win (if all bets win)
    const maxPotentialWin =
      potentialPayouts.reduce((sum, p) => sum + p.payout, 0) - totalBet;

    // Calculate minimum potential win (if all bets lose)
    const minPotentialWin = -totalBet;

    res.json({
      totalBet,
      potentialPayouts,
      maxPotentialWin,
      minPotentialWin,
    });
  } catch (error) {
    console.error("Error calculating potential payout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
