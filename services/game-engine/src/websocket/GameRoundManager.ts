/**
 * Game Round Manager
 * Manages multiplayer roulette rounds with bet-triggered countdown
 *
 * Flow:
 * 1. WAITING - No timer, waiting for first bet
 * 2. BETTING - 30s countdown (started by first bet)
 * 3. SPINNING - 3s wheel animation
 * 4. RESULTS - 5s show results
 * 5. Back to WAITING
 */

import { v4 as uuidv4 } from "uuid";
import type { WebSocket } from "ws";
import { RouletteLogic } from "../game-logic/RouletteLogic";
import { Bet, EUROPEAN_ROULETTE_CONFIG } from "../models/RouletteTypes";
import { GameHistory, BigWin } from "../models";
import { publishGameCompleted } from "../events/publisher";
import {
  GameRound,
  PlayerResult,
  MULTIPLAYER_CONFIG,
  ServerMessage,
  RoomStatePayload,
  SpinResultPayload,
  AuthenticatedWebSocket,
} from "./types";

// Wallet service configuration
const WALLET_SERVICE_URL =
  process.env.WALLET_SERVICE_URL || "http://wallet:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "internal_service_key";

/**
 * Big win multiplier threshold
 */
const BIG_WIN_MULTIPLIER = 10;

/**
 * Get user balance from wallet service
 */
async function getWalletBalance(userId: string): Promise<number> {
  try {
    const response = await fetch(
      `${WALLET_SERVICE_URL}/wallet/internal/balance/${userId}`,
      {
        method: "GET",
        headers: {
          "x-internal-api-key": INTERNAL_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error(`Wallet service error: ${response.status}`);
      return 0;
    }

    const data = (await response.json()) as { balance: number };
    return data.balance;
  } catch (error) {
    console.error("Error calling wallet service:", error);
    return 0;
  }
}

/**
 * Update user balance in wallet service
 */
async function updateWalletBalance(
  userId: string,
  amount: number,
  type: "win" | "bet",
): Promise<{ success: boolean; newBalance: number }> {
  try {
    const response = await fetch(
      `${WALLET_SERVICE_URL}/wallet/internal/update-balance`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify({ userId, amount, type }),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { error: string };
      throw new Error(error.error || "Failed to update balance");
    }

    return (await response.json()) as { success: boolean; newBalance: number };
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    throw error;
  }
}

export class GameRoundManager {
  /** Active game rounds by room ID */
  private rounds: Map<string, GameRound> = new Map();

  /** Connected WebSocket clients by user ID */
  private connections: Map<string, WebSocket & AuthenticatedWebSocket> =
    new Map();

  /** Timer intervals for each room */
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /** Broadcast function (injected from WebSocketServer) */
  private broadcastToRoom: (
    roomId: string,
    message: ServerMessage,
    excludeUserId?: string,
  ) => void;

  /** Send to specific user function */
  private sendToUser: (userId: string, message: ServerMessage) => void;

  constructor(
    broadcastToRoom: (
      roomId: string,
      message: ServerMessage,
      excludeUserId?: string,
    ) => void,
    sendToUser: (userId: string, message: ServerMessage) => void,
  ) {
    this.broadcastToRoom = broadcastToRoom;
    this.sendToUser = sendToUser;
  }

  /**
   * Get or create a game round for a room (starts in WAITING phase)
   */
  private getOrCreateRound(roomId: string): GameRound {
    let round = this.rounds.get(roomId);

    if (!round) {
      round = {
        roundId: uuidv4(),
        roomId,
        phase: "waiting", // Start in waiting phase
        players: new Map(),
        timeRemaining: 0, // No countdown in waiting phase
        bettingStartedAt: 0,
      };
      this.rounds.set(roomId, round);
      console.log(`🎰 Created new room ${roomId} in WAITING phase`);
    }

    return round;
  }

  /**
   * Start the countdown timer when first bet is placed
   */
  private startBettingCountdown(
    roomId: string,
    triggeredBy: { userId: string; username: string },
  ): void {
    const round = this.rounds.get(roomId);
    if (!round) return;

    // Don't start if already in betting phase
    if (round.phase !== "waiting") return;

    // Transition to betting phase
    round.phase = "betting";
    round.timeRemaining = MULTIPLAYER_CONFIG.BETTING_PHASE_DURATION;
    round.bettingStartedAt = Date.now();

    console.log(
      `⏱️ Betting countdown started by ${triggeredBy.username} in room ${roomId}`,
    );

    // Broadcast that betting phase has started
    this.broadcastToRoom(roomId, {
      type: "BETTING_STARTED",
      payload: {
        roundId: round.roundId,
        phase: "betting",
        timeRemaining: round.timeRemaining,
        triggeredBy,
      },
      timestamp: Date.now(),
    });

    // Start the countdown timer
    this.startRoundTimer(roomId);
  }

  /**
   * Start the round timer for a room
   */
  private startRoundTimer(roomId: string): void {
    // Clear any existing timer
    this.stopRoundTimer(roomId);

    const timer = setInterval(() => {
      this.tickRound(roomId);
    }, 1000);

    this.timers.set(roomId, timer);
  }

  /**
   * Stop the round timer for a room
   */
  private stopRoundTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomId);
    }
  }

  /**
   * Process one tick of the round timer
   */
  private async tickRound(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round || round.phase === "waiting") return;

    round.timeRemaining--;

    // Broadcast countdown
    this.broadcastToRoom(roomId, {
      type: "ROUND_COUNTDOWN",
      payload: {
        phase: round.phase,
        timeRemaining: round.timeRemaining,
      },
      timestamp: Date.now(),
    });

    // Check if phase should transition
    if (round.timeRemaining <= 0) {
      await this.transitionPhase(roomId);
    }
  }

  /**
   * Transition to the next phase
   */
  private async transitionPhase(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    switch (round.phase) {
      case "betting":
        await this.startSpinningPhase(roomId);
        break;
      case "spinning":
        await this.executeSpinAndShowResults(roomId);
        break;
      case "results":
        await this.goBackToWaiting(roomId);
        break;
    }
  }

  /**
   * Start the spinning phase (no more bets accepted)
   */
  private async startSpinningPhase(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    // Get players with bets
    const playersWithBets = Array.from(round.players.values()).filter(
      (p) => p.bets.length > 0,
    );

    // If no one has bets (all cancelled), go back to waiting
    if (playersWithBets.length === 0) {
      console.log(`🔄 No bets in room ${roomId}, going back to waiting`);
      await this.goBackToWaiting(roomId);
      return;
    }

    // Generate winning number NOW (before animation starts)
    const winningNumber = Math.floor(Math.random() * 37);
    const source = "mock-random";
    const spinResult = RouletteLogic.analyzeWinningNumber(winningNumber);

    // Store it in the round
    round.spinResult = spinResult;

    // Transition to spinning
    round.phase = "spinning";
    round.timeRemaining = MULTIPLAYER_CONFIG.SPINNING_PHASE_DURATION;

    const totalBetsAllPlayers = playersWithBets.reduce(
      (sum, p) => sum + p.totalBet,
      0,
    );

    this.broadcastToRoom(roomId, {
      type: "SPIN_STARTING",
      payload: {
        roundId: round.roundId,
        phase: "spinning",
        totalBetsAllPlayers,
        playersWithBets: playersWithBets.length,
        winningNumber,
      },
      timestamp: Date.now(),
    });

    console.log(
      `🎡 Spinning phase started for room ${roomId} with ${playersWithBets.length} players - winning number: ${winningNumber}`,
    );
  }

  /**
   * Execute the spin and calculate results for all players
   */
  private async executeSpinAndShowResults(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    // Use the winning number already generated in startSpinningPhase
    if (!round.spinResult) {
      console.error("No spin result found - this should not happen!");
      return;
    }

    const spinResult = round.spinResult;
    const winningNumber = spinResult.winningNumber;
    const source = "mock-random";

    round.playerResults = new Map();

    console.log(`🎯 Revealing results: ${winningNumber} (${spinResult.color})`);

    // First pass: Calculate results for ALL players with bets
    // This builds the complete allPlayerResults array that ALL players will see
    const allPlayerResults: SpinResultPayload["allPlayerResults"] = [];
    const sessionId = uuidv4();
    const playerGameResults = new Map<
      string,
      { gameResult: any; newBalance: number }
    >();

    for (const [userId, player] of round.players) {
      if (player.bets.length === 0) continue;

      const gameResult = RouletteLogic.calculateGameResult(
        player.bets,
        winningNumber,
        source,
      );

      const playerResult: PlayerResult = {
        userId,
        username: player.username,
        bets: player.bets,
        totalBet: gameResult.totalBet,
        totalWin: gameResult.totalWin,
        netResult: gameResult.netResult,
        winningBets: gameResult.winningBets,
      };

      round.playerResults.set(userId, playerResult);

      // Add to complete results list with bets for display
      allPlayerResults.push({
        userId,
        username: player.username,
        bets: player.bets,
        totalBet: gameResult.totalBet,
        totalWin: gameResult.totalWin,
        netResult: gameResult.netResult,
        winningBetsCount: gameResult.winningBets.length,
      });

      // Credit winnings to player
      let newBalance = 0;
      if (gameResult.totalWin > 0) {
        try {
          const result = await updateWalletBalance(
            userId,
            gameResult.totalWin,
            "win",
          );
          newBalance = result.newBalance;
          console.log(
            `✅ Credited ${gameResult.totalWin} CCC to ${player.username}`,
          );
        } catch (error) {
          console.error(
            `❌ Failed to credit winnings to ${player.username}:`,
            error,
          );
        }
      } else {
        newBalance = await getWalletBalance(userId);
      }

      // Store results for second pass
      playerGameResults.set(userId, { gameResult, newBalance });
    }

    // Second pass: Send results to all players with the COMPLETE allPlayerResults
    for (const [userId, player] of round.players) {
      if (player.bets.length === 0) continue;

      const { gameResult, newBalance } = playerGameResults.get(userId)!;

      this.sendToUser(userId, {
        type: "SPIN_RESULT",
        payload: {
          roundId: round.roundId,
          phase: "results",
          spinResult,
          allPlayerResults, // Now contains ALL players' results
          yourResult: {
            bets: player.bets,
            totalBet: gameResult.totalBet,
            totalWin: gameResult.totalWin,
            netResult: gameResult.netResult,
            winningBets: gameResult.winningBets,
            newBalance,
          },
          timeUntilNextRound: MULTIPLAYER_CONFIG.RESULTS_PHASE_DURATION,
        },
        timestamp: Date.now(),
      });

      // Save to database (async)
      this.saveGameToDatabase(
        userId,
        player.username,
        sessionId,
        gameResult,
        player.bets,
        roomId,
      ).catch((err) => console.error("Failed to save game:", err));
    }

    // Send results to players without bets (spectators)
    for (const [userId, player] of round.players) {
      if (player.bets.length === 0) {
        const balance = await getWalletBalance(userId);
        this.sendToUser(userId, {
          type: "SPIN_RESULT",
          payload: {
            roundId: round.roundId,
            phase: "results",
            spinResult,
            allPlayerResults, // Send complete results to spectators too
            yourResult: {
              bets: [],
              totalBet: 0,
              totalWin: 0,
              netResult: 0,
              winningBets: [],
              newBalance: balance,
            },
            timeUntilNextRound: MULTIPLAYER_CONFIG.RESULTS_PHASE_DURATION,
          },
          timestamp: Date.now(),
        });
      }
    }

    // Update phase
    round.phase = "results";
    round.timeRemaining = MULTIPLAYER_CONFIG.RESULTS_PHASE_DURATION;
  }

  /**
   * Go back to waiting phase after results
   */
  private async goBackToWaiting(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    // Stop the timer
    this.stopRoundTimer(roomId);

    // Reset for new round
    const newRoundId = uuidv4();
    round.roundId = newRoundId;
    round.phase = "waiting";
    round.timeRemaining = 0;
    round.bettingStartedAt = 0;
    round.spinResult = undefined;
    round.playerResults = undefined;

    // Clear all player bets and reset lock status
    for (const player of round.players.values()) {
      player.bets = [];
      player.totalBet = 0;
      player.isLocked = false;
    }

    // Broadcast waiting phase
    this.broadcastToRoom(roomId, {
      type: "WAITING_FOR_BETS",
      payload: {
        roundId: newRoundId,
        phase: "waiting",
        message: "Place a bet to start the countdown!",
      },
      timestamp: Date.now(),
    });

    console.log(`⏸️ Room ${roomId} is now WAITING for first bet`);
  }

  /**
   * Handle player joining a room
   */
  async handlePlayerJoin(
    userId: string,
    username: string,
    roomId: string = MULTIPLAYER_CONFIG.DEFAULT_ROOM_ID,
  ): Promise<RoomStatePayload> {
    const round = this.getOrCreateRound(roomId);

    // Check if player already exists in round
    let player = round.players.get(userId);

    if (player) {
      // Reconnecting player
      player.isConnected = true;
      console.log(`🔄 Player ${username} reconnected to room ${roomId}`);
    } else {
      // New player
      player = {
        userId,
        username,
        joinedAt: Date.now(),
        bets: [],
        totalBet: 0,
        isConnected: true,
        isLocked: false,
      };
      round.players.set(userId, player);
      console.log(`👋 Player ${username} joined room ${roomId}`);
    }

    // Broadcast join to others
    this.broadcastToRoom(
      roomId,
      {
        type: "PLAYER_JOINED",
        payload: {
          userId,
          username,
          playerCount: round.players.size,
        },
        timestamp: Date.now(),
      },
      userId, // Exclude the joining player
    );

    // Get player balance
    const balance = await getWalletBalance(userId);

    // Build room state
    const playersArray = Array.from(round.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      bets: p.bets,
      totalBet: p.totalBet,
      isConnected: p.isConnected,
      isLocked: p.isLocked,
    }));

    return {
      roomId,
      roundId: round.roundId,
      phase: round.phase,
      timeRemaining: round.timeRemaining,
      players: playersArray,
      yourBets: player.bets,
      yourBalance: balance,
      yourUserId: userId,
    };
  }

  /**
   * Handle player leaving a room
   */
  handlePlayerLeave(userId: string, roomId: string): void {
    const round = this.rounds.get(roomId);
    if (!round) return;

    const player = round.players.get(userId);
    if (!player) return;

    // Mark as disconnected but keep in round if they have bets during active game
    if (
      player.bets.length > 0 &&
      round.phase !== "waiting" &&
      round.phase !== "results"
    ) {
      player.isConnected = false;
      console.log(
        `⚠️ Player ${player.username} disconnected but has active bets`,
      );
    } else {
      round.players.delete(userId);
      console.log(`👋 Player ${player.username} left room ${roomId}`);
    }

    // Broadcast leave to others
    this.broadcastToRoom(roomId, {
      type: "PLAYER_LEFT",
      payload: {
        userId,
        username: player.username,
        playerCount: round.players.size,
      },
      timestamp: Date.now(),
    });

    // If no players left and we're in waiting phase, clean up the room
    if (round.players.size === 0 && round.phase === "waiting") {
      this.stopRoundTimer(roomId);
      this.rounds.delete(roomId);
      console.log(`🗑️ Room ${roomId} removed (no players)`);
    }
  }

  /**
   * Handle bet placement
   */
  async handlePlaceBet(
    userId: string,
    roomId: string,
    betData: {
      type: string;
      value?: string | number;
      amount: number;
      numbers?: number[];
    },
  ): Promise<{
    success: boolean;
    error?: string;
    bet?: Bet;
    newBalance?: number;
  }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    // Check if betting is allowed (waiting or betting phase)
    if (round.phase !== "waiting" && round.phase !== "betting") {
      return {
        success: false,
        error: `Cannot place bets during ${round.phase} phase. Wait for next round.`,
      };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }

    // Convert to standard bet format
    let bet: Bet;
    try {
      if (betData.numbers !== undefined) {
        bet = {
          type: betData.type as Bet["type"],
          numbers: betData.numbers,
          amount: betData.amount,
        };
      } else {
        bet = RouletteLogic.createSimpleBet(
          betData.type,
          betData.value ?? "",
          betData.amount,
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Invalid bet format",
      };
    }

    // Validate bet
    const validation = RouletteLogic.validateBet(bet);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Deduct from wallet
    try {
      const result = await updateWalletBalance(userId, bet.amount, "bet");

      // Add bet to player
      player.bets.push(bet);
      player.totalBet += bet.amount;

      // Don't start countdown here anymore - wait for LOCK_BETS message

      // Broadcast to room
      this.broadcastToRoom(
        roomId,
        {
          type: "BET_PLACED",
          payload: {
            userId,
            username: player.username,
            bet,
            totalBet: player.totalBet,
          },
          timestamp: Date.now(),
        },
        userId, // Exclude the player who placed the bet
      );

      // Send confirmation to player with balance
      this.sendToUser(userId, {
        type: "BET_PLACED",
        payload: {
          userId,
          username: player.username,
          bet,
          totalBet: player.totalBet,
          newBalance: result.newBalance,
        },
        timestamp: Date.now(),
      });

      console.log(
        `💰 ${player.username} placed bet: ${bet.type} for ${bet.amount} CCC`,
      );

      return { success: true, bet, newBalance: result.newBalance };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to place bet";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle bet removal
   */
  async handleRemoveBet(
    userId: string,
    roomId: string,
    betIndex: number,
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    // Check if betting is allowed
    if (round.phase !== "waiting" && round.phase !== "betting") {
      return {
        success: false,
        error: `Cannot remove bets during ${round.phase} phase`,
      };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }

    if (betIndex < 0 || betIndex >= player.bets.length) {
      return { success: false, error: "Invalid bet index" };
    }

    const removedBet = player.bets[betIndex];

    // Refund to wallet
    try {
      const result = await updateWalletBalance(
        userId,
        removedBet.amount,
        "win",
      );

      // Remove bet from player
      player.bets.splice(betIndex, 1);
      player.totalBet -= removedBet.amount;

      // Broadcast to room
      this.broadcastToRoom(
        roomId,
        {
          type: "BET_REMOVED",
          payload: {
            userId,
            username: player.username,
            betIndex,
            removedBet,
            totalBet: player.totalBet,
          },
          timestamp: Date.now(),
        },
        userId,
      );

      // Send confirmation to player
      this.sendToUser(userId, {
        type: "BET_REMOVED",
        payload: {
          userId,
          username: player.username,
          betIndex,
          removedBet,
          totalBet: player.totalBet,
          newBalance: result.newBalance,
        },
        timestamp: Date.now(),
      });

      console.log(`🔙 ${player.username} removed bet: ${removedBet.type}`);

      return { success: true, newBalance: result.newBalance };
    } catch (error) {
      return { success: false, error: "Failed to refund bet" };
    }
  }

  /**
   * Handle clearing all bets
   */
  async handleClearBets(
    userId: string,
    roomId: string,
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    if (round.phase !== "waiting" && round.phase !== "betting") {
      return {
        success: false,
        error: `Cannot clear bets during ${round.phase} phase`,
      };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }

    if (player.bets.length === 0) {
      return { success: true, newBalance: await getWalletBalance(userId) };
    }

    // Refund all bets
    try {
      const result = await updateWalletBalance(userId, player.totalBet, "win");

      // Clear player bets
      player.bets = [];
      player.totalBet = 0;

      // Broadcast to room
      this.broadcastToRoom(
        roomId,
        {
          type: "BETS_CLEARED",
          payload: {
            userId,
            username: player.username,
          },
          timestamp: Date.now(),
        },
        userId,
      );

      // Send confirmation to player
      this.sendToUser(userId, {
        type: "BETS_CLEARED",
        payload: {
          userId,
          username: player.username,
          newBalance: result.newBalance,
        },
        timestamp: Date.now(),
      });

      console.log(`🗑️ ${player.username} cleared all bets`);

      return { success: true, newBalance: result.newBalance };
    } catch (error) {
      return { success: false, error: "Failed to refund bets" };
    }
  }

  /**
   * Get current room state for a player
   */
  async getRoomState(
    userId: string,
    roomId: string,
  ): Promise<RoomStatePayload | null> {
    const round = this.rounds.get(roomId);
    if (!round) return null;

    const player = round.players.get(userId);
    const balance = await getWalletBalance(userId);

    const playersArray = Array.from(round.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      bets: p.bets,
      totalBet: p.totalBet,
      isConnected: p.isConnected,
      isLocked: p.isLocked,
    }));

    return {
      roomId,
      roundId: round.roundId,
      phase: round.phase,
      timeRemaining: round.timeRemaining,
      players: playersArray,
      yourBets: player?.bets ?? [],
      yourBalance: balance,
      yourUserId: userId,
    };
  }

  /**
   * Save game to database
   */
  private async saveGameToDatabase(
    userId: string,
    username: string,
    sessionId: string,
    gameResult: ReturnType<typeof RouletteLogic.calculateGameResult>,
    bets: Bet[],
    roomId: string,
  ): Promise<void> {
    try {
      const gameBets = bets.map((bet) => {
        const winningBet = gameResult.winningBets.find(
          (wb) => JSON.stringify(wb.bet) === JSON.stringify(bet),
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

      // Publish game completed event
      publishGameCompleted({
        userId,
        gameId: gameHistory._id.toString(),
        gameType: "roulette",
        totalBet: gameResult.totalBet,
        totalWin: gameResult.totalWin,
        netResult: gameResult.netResult,
        winningNumber: gameResult.spinResult.winningNumber,
      }).catch((err) =>
        console.error("Failed to publish game.completed:", err),
      );

      // Check for big win
      const actualMultiplier =
        gameResult.totalBet > 0 ? gameResult.totalWin / gameResult.totalBet : 0;

      if (
        actualMultiplier >= BIG_WIN_MULTIPLIER &&
        gameResult.winningBets.length > 0
      ) {
        const biggestWinningBet = gameResult.winningBets.reduce(
          (max, wb) => (wb.payout > max.payout ? wb : max),
          gameResult.winningBets[0],
        );

        const bigWin = new BigWin({
          userId,
          username,
          gameType: "roulette",
          betType: biggestWinningBet.bet.type,
          betAmount: gameResult.totalBet,
          winAmount: gameResult.netResult,
          multiplier: actualMultiplier,
          isPublic: true,
        });

        await bigWin.save();

        // Notify chat service
        try {
          const chatServiceUrl =
            process.env.CHAT_SERVICE_URL || "http://chat:8004";
          const message = `🎉 ${username} just won ${
            gameResult.netResult
          } CCC with a x${actualMultiplier.toFixed(
            2,
          )} multiplier in Multiplayer Roulette!`;

          await fetch(`${chatServiceUrl}/system-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
          });
        } catch (error) {
          console.error("Failed to send big win notification:", error);
        }
      }
    } catch (error) {
      console.error("Error saving game to database:", error);
    }
  }

  /**
   * Handle lock bets request - starts the countdown
   */
  async handleLockBets(
    userId: string,
    roomId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }

    // Only allow locking if in waiting or betting phase
    if (round.phase !== "waiting" && round.phase !== "betting") {
      return {
        success: false,
        error: `Can only lock bets in waiting or betting phase, not in ${round.phase}`,
      };
    }

    // Check if player has bets
    if (player.bets.length === 0) {
      return { success: false, error: "No bets to lock" };
    }

    // Mark player as locked
    player.isLocked = true;

    // Broadcast that player locked their bets BEFORE starting countdown
    // This ensures PLAYER_LOCKED is received before BETTING_STARTED
    this.broadcastToRoom(roomId, {
      type: "PLAYER_LOCKED",
      payload: {
        userId,
        username: player.username,
      },
      timestamp: Date.now(),
    });

    // Start the countdown (broadcasts BETTING_STARTED)
    this.startBettingCountdown(roomId, { userId, username: player.username });

    return { success: true };
  }

  /**
   * Clean up on shutdown
   */
  cleanup(): void {
    for (const roomId of this.timers.keys()) {
      this.stopRoundTimer(roomId);
    }
    this.rounds.clear();
    this.connections.clear();
    console.log("🧹 GameRoundManager cleaned up");
  }
}
