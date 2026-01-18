import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { RouletteLogic } from "../game-logic/RouletteLogic";
import {
  Bet,
  RouletteSession,
  EUROPEAN_ROULETTE_CONFIG,
} from "../models/RouletteTypes";
import { GameSession, GameHistory, BigWin } from "../models";
import { publishGameCompleted } from "../events/publisher"; 

// In-memory storage for sessions
const sessions = new Map<string, RouletteSession>();

// Wallet service configuration
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || "http://wallet:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "internal_service_key";

/**
 * Get user balance from wallet service
 */
async function getWalletBalance(userId: string): Promise<number> {
  try {
    const response = await fetch(`${WALLET_SERVICE_URL}/wallet/internal/balance/${userId}`, {
      method: "GET",
      headers: {
        "x-internal-api-key": INTERNAL_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Wallet service error: ${response.status}`);
      throw new Error("Failed to get balance from wallet service");
    }

    const data = await response.json();
    return data.balance;
  } catch (error) {
    console.error("Error calling wallet service:", error);
    throw error;
  }
}

/**
 * Update user balance in wallet service
 * @param userId - User ID
 * @param amount - Amount to add (win) or deduct (bet)
 * @param type - "win" to add, "bet" to deduct
 */
async function updateWalletBalance(
  userId: string,
  amount: number,
  type: "win" | "bet"
): Promise<{ success: boolean; newBalance: number }> {
  try {
    const response = await fetch(`${WALLET_SERVICE_URL}/wallet/internal/update-balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify({ userId, amount, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update balance");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    throw error;
  }
}

/**
 * Minimum multiplier to be considered a "big win" (e.g., x10 means winning 10 times the bet)
 */
const BIG_WIN_MULTIPLIER = 10;

/**
 * Type definition for random-org service response
 */
interface RandomOrgResponse {
  number: number;
  timestamp: number;
  source: string;
}

/**
 * Extract user info from JWT token in request headers
 */
function getUserFromToken(
  req: Request
): { userId: string; username: string } | null {
  const authHeader = req.headers.authorization;

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
    const userId = decoded.userId || decoded.sub || decoded.id;
    const username = decoded.username || `Player_${userId.substring(0, 8)}`;
    console.log("✅ Token decoded, username:", username);
    return { userId, username };
  } catch (error) {
    console.error("❌ Invalid token:", error);
    return null;
  }
}

/**
 * Extract userId from JWT token (backward compatibility)
 */
function getUserIdFromToken(req: Request): string | null {
  const user = getUserFromToken(req);
  return user ? user.userId : null;
}

/**
 * Get roulette configuration including payouts, red/black numbers, columns, etc.
 * @route GET /api/roulette/config
 * @returns Roulette configuration object
 */
export async function getRouletteConfig(req: Request, res: Response) {
  try {
    res.json({
      redNumbers: EUROPEAN_ROULETTE_CONFIG.RED_NUMBERS,
      blackNumbers: EUROPEAN_ROULETTE_CONFIG.BLACK_NUMBERS,
      columns: EUROPEAN_ROULETTE_CONFIG.COLUMNS,
      dozens: EUROPEAN_ROULETTE_CONFIG.DOZENS,
      payouts: EUROPEAN_ROULETTE_CONFIG.PAYOUTS,
    });
  } catch (error) {
    console.error("Error fetching roulette config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Place bets for a user session
 * @param req - Express request containing bets array
 * @param res - Express response
 */
export async function placeBets(req: Request, res: Response) {
  try {
    const user = getUserFromToken(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized - Invalid token" });
      return;
    }

    const { userId, username } = user;

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

    // Deduct balance via wallet service
    try {
      const result = await updateWalletBalance(userId, totalAmount, "bet");
      console.log(`✅ Balance deducted: ${totalAmount} CCC, new balance: ${result.newBalance}`);
    } catch (error) {
      // Check if it's insufficient balance
      if (error instanceof Error && error.message === "Insufficient balance") {
        const currentBalance = await getWalletBalance(userId);
        return res.status(400).json({
          error: "Insufficient balance",
          required: totalAmount,
          available: currentBalance,
        });
      }
      throw error;
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
    const user = getUserFromToken(req);

    if (!user) {
      res.status(401).json({ error: "Unauthorized - Invalid token" });
      return;
    }

    const { userId, username } = user;

    // Retrieve session
    const session = sessions.get(userId);
    if (!session || !session.bets || session.bets.length === 0) {
      return res
        .status(400)
        .json({ error: "No bets placed. Place bets first." });
    }

    // Get random number from random-org service
    let winningNumber: number;
    let source: string;

    try {
      const randomOrgUrl = process.env.RANDOM_ORG_SERVICE || "http://random-org:8008";
      const randomResponse = await fetch(`${randomOrgUrl}/roulette`);
      
      if (!randomResponse.ok) {
        throw new Error(`Random service error: ${randomResponse.status}`);
      }

      const randomData = await randomResponse.json() as RandomOrgResponse;
      winningNumber = randomData.number;
      source = randomData.source;

      console.log(`✅ Random number from ${source}: ${winningNumber}`);
    } catch (error) {
      console.error("⚠️ Failed to get random number from service, using fallback:", error);
      // Fallback to Math.random if service is unavailable
      winningNumber = Math.floor(Math.random() * 37);
      source = "fallback-random";
    }

    // Calculate game results
    const gameResult = RouletteLogic.calculateGameResult(
      session.bets,
      winningNumber,
      source
    );

    // Credit winnings to wallet service (if player won)
    // Note: The bet was already deducted in placeBets()
    // totalWin includes the original bet amount for winning bets
    if (gameResult.totalWin > 0) {
      try {
        const result = await updateWalletBalance(userId, gameResult.totalWin, "win");
        console.log(`✅ Winnings credited: ${gameResult.totalWin} CCC, new balance: ${result.newBalance}`);
      } catch (error) {
        console.error("❌ Failed to credit winnings:", error);
        // Don't fail the spin, but log the error
      }
    }

    // Clear session
    sessions.delete(userId);

    // Save to database (async, don't block response)
    saveGameToDatabase(userId, username, gameResult, session.bets).catch(
      (error) => {
        console.error("❌ Failed to save game to database:", error);
      }
    );

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
 * Save game result to database (async)
 * Creates GameHistory entry, updates GameSession, and saves BigWin if applicable
 */
async function saveGameToDatabase(
  userId: string,
  username: string,
  gameResult: any,
  bets: Bet[]
): Promise<void> {
  try {
    // Generate or get session ID (for now, create new session per game)
    const sessionId = uuidv4();

    // Create GameHistory entry
    const gameBets = bets.map((bet, index) => {
      const winningBet = gameResult.winningBets.find(
        (wb: any) => JSON.stringify(wb.bet) === JSON.stringify(bet)
      );

      return {
        betType: bet.type,
        numbers: bet.numbers,
        amount: bet.amount,
        payout: winningBet ? winningBet.payout : 0,
        won: !!winningBet,
        multiplier: EUROPEAN_ROULETTE_CONFIG.PAYOUTS[bet.type],
      };
    });

    const gameHistory = new GameHistory({
      userId,
      sessionId,
      gameType: "roulette",
      bets: gameBets,
      totalBet: gameResult.totalBet,
      totalWin: gameResult.totalWin,
      netResult: gameResult.netResult,
      rouletteDetails: {
        winningNumber: gameResult.spinResult.winningNumber,
        color: gameResult.spinResult.color,
        parity: gameResult.spinResult.parity,
        range: gameResult.spinResult.range,
        column: gameResult.spinResult.column,
        dozen: gameResult.spinResult.dozen,
        randomSource: gameResult.source,
      },
    });

    await gameHistory.save();
    
    console.log(`✅ GameHistory saved to DB! ID: ${gameHistory._id}, userId: ${userId}`);

    // Publish game completed event
    publishGameCompleted({
      userId,
      gameId: gameHistory._id.toString(),
      gameType: 'roulette',
      totalBet: gameResult.totalBet,
      totalWin: gameResult.totalWin,
      netResult: gameResult.netResult,
      winningNumber: gameResult.spinResult.winningNumber,
      winningColor: gameResult.spinResult.color,
      bets: gameBets,
    }).catch(err => console.error('Failed to publish game.completed:', err));

    // Create or update GameSession
    let gameSession = await GameSession.findOne({ sessionId });

    if (!gameSession) {
      gameSession = new GameSession({
        sessionId,
        gameType: "roulette",
        sessionType: "single",
        status: "completed",
        players: [
          {
            userId,
            username, // Username from JWT token
            joinedAt: new Date(),
            totalBet: gameResult.totalBet,
            totalWin: gameResult.totalWin,
            netResult: gameResult.netResult,
          },
        ],
        hostUserId: userId,
        totalRounds: 1,
        totalBets: gameResult.totalBet,
        totalWins: gameResult.totalWin,
        startedAt: new Date(),
        endedAt: new Date(),
      });
    } else {
      // Update existing session
      gameSession.totalRounds += 1;
      gameSession.totalBets += gameResult.totalBet;
      gameSession.totalWins += gameResult.totalWin;
      gameSession.players[0].totalBet += gameResult.totalBet;
      gameSession.players[0].totalWin += gameResult.totalWin;
      gameSession.players[0].netResult += gameResult.netResult;
    }

    await gameSession.save();

    // Check if this is a big win (based on multiplier)
    const actualMultiplier =
      gameResult.totalBet > 0 ? gameResult.totalWin / gameResult.totalBet : 0;

    if (actualMultiplier >= BIG_WIN_MULTIPLIER) {
      // Find the winning bet with highest payout
      const biggestWinningBet = gameResult.winningBets.reduce(
        (max: any, wb: any) => (wb.payout > max.payout ? wb : max),
        gameResult.winningBets[0]
      );

      const bigWin = new BigWin({
        userId,
        username, // Username from JWT token
        gameType: "roulette",
        betType: biggestWinningBet.bet.type,
        betAmount: gameResult.totalBet,
        winAmount: gameResult.netResult,
        multiplier: actualMultiplier,
        isPublic: true,
      });

      await bigWin.save();

      // Notify chat service about the big win
      try {
        const chatServiceUrl =
          process.env.CHAT_SERVICE_URL || "http://chat:8004";
        const message = `${bigWin.username} just won ${
          bigWin.winAmount
        } coins with a x${bigWin.multiplier.toFixed(
          2
        )} in the game European Roulette!`;

        const response = await fetch(`${chatServiceUrl}/system-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        if (response.ok) {
          console.log("✅ Big win notification sent to chat");
        } else {
          console.error(
            `❌ Failed to send big win to chat: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.error("❌ Error sending big win notification to chat:", error);
      }
    }
  } catch (error) {
    console.error("Error saving game to database:", error);
    throw error;
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
 * Get user balance from wallet service
 * @param req - Express request
 * @param res - Express response
 */
export async function getBalance(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const balance = await getWalletBalance(userId);
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
 * Calculate the realistic maximum potential win by simulating all possible outcomes (0-36)
 * This accounts for mutually exclusive bets (e.g., red and black cannot both win)
 * @param bets - Array of validated bets
 * @returns Maximum possible net win across all possible outcomes
 */
function calculateRealisticMaxWin(bets: Bet[]): number {
  let maxNetWin = -Infinity;

  // Simulate each possible outcome (0-36)
  for (let winningNumber = 0; winningNumber <= 36; winningNumber++) {
    const spinResult = RouletteLogic.analyzeWinningNumber(winningNumber);
    let totalPayout = 0;

    // Check which bets win for this outcome
    for (const bet of bets) {
      if (RouletteLogic.isBetWinning(bet, spinResult)) {
        totalPayout += RouletteLogic.calculatePayout(bet);
      }
    }

    // Calculate net win for this outcome (payout - total bet amount)
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const netWin = totalPayout - totalBet;

    // Track the maximum net win
    if (netWin > maxNetWin) {
      maxNetWin = netWin;
    }
  }

  return maxNetWin;
}

/**
 * Calculate total potential payout for a list of bets
 * Simulates all possible outcomes to find the realistic maximum win
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
    const validatedBets: Bet[] = [];

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

        validatedBets.push(bet);
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid bet in list",
        });
      }
    }

    // Calculate realistic maximum potential win by simulating all outcomes
    const maxPotentialWin = calculateRealisticMaxWin(validatedBets);

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

/**
 * Fetch user's game history with pagination
 *
 * @route GET /api/games/roulette/history
 * @param {Request} req - The Express request
 * @param {Response} res - The Express response
 * @query {number} [page=1] -  Page number for pagination
 * @query {number} [limit=20] - Number of items per page (max 100)
 * @returns {Promise<void>} - Returns the game history with pagination
 */
export async function getUserGameHistory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - Invalid token" });
      return;
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20)
    );
    const skip = (page - 1) * limit;

    // Query game history sorted by most recent first
    const [history, totalCount] = await Promise.all([
      GameHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GameHistory.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      history,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user game history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Fetch recent big wins (public only).
 *
 * @route GET /api/games/roulette/big-wins
 * @param {Request} req - The Express request
 * @param {Response} res - The Express response
 * @query {string} [gameType] - Optional game type filter (e.g., 'roulette')
 * @query {number} [limit=50] - Number of results (max 100)
 * @returns {Promise<void>} - Returns the recent big wins (public only)
 */
export async function getBigWins(req: Request, res: Response): Promise<void> {
  try {
    const gameType = req.query.gameType as string | undefined;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 50)
    );

    // Build query
    const query: any = { isPublic: true };
    if (gameType) {
      query.gameType = gameType;
    }

    // Fetch recent big wins sorted by creation date
    const bigWins = await BigWin.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      bigWins,
      count: bigWins.length,
    });
  } catch (error) {
    console.error("Error fetching big wins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
