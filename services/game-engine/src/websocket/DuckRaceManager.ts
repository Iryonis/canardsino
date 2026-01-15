/**
 * Duck Race Manager
 * Manages multiplayer duck racing where players bet and race to the finish line
 *
 * Flow:
 * 1. WAITING - Waiting for players to join (min 2, max 5)
 * 2. BETTING - First player sets bet amount, others must match (15s)
 * 3. COUNTDOWN - 3s countdown before race starts
 * 4. RACING - Ducks advance based on random numbers until one crosses finish
 * 5. FINISHED - Show results, winner takes all
 * 6. Back to WAITING
 */

import { v4 as uuidv4 } from "uuid";
import {
  DUCK_RACE_CONFIG,
  DUCK_COLORS,
  DuckRacePhase,
  DuckPlayer,
  DuckRaceRound,
  DuckRaceServerMessage,
  RaceStatePayload,
  DuckColor,
} from "./duckRaceTypes";

// Wallet service configuration
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || "http://wallet:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "internal_service_key";

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
      }
    );

    if (!response.ok) {
      console.error(`Wallet service error: ${response.status}`);
      return 0;
    }

    const data = await response.json();
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
  type: "win" | "bet"
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
      }
    );

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
 * Generate random numbers for duck advancement
 * TODO: Use Random.org in production
 */
async function generateRandomAdvances(count: number): Promise<number[]> {
  const advances: number[] = [];
  for (let i = 0; i < count; i++) {
    advances.push(
      Math.floor(Math.random() * (DUCK_RACE_CONFIG.RANDOM_MAX - DUCK_RACE_CONFIG.RANDOM_MIN + 1)) +
        DUCK_RACE_CONFIG.RANDOM_MIN
    );
  }
  return advances;
}

export class DuckRaceManager {
  /** Active race rounds by room ID */
  private rounds: Map<string, DuckRaceRound> = new Map();

  /** Timer intervals for each room */
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /** Race tick intervals for each room */
  private raceTimers: Map<string, NodeJS.Timeout> = new Map();

  /** Broadcast function (injected from WebSocketServer) */
  private broadcastToRoom: (
    roomId: string,
    message: DuckRaceServerMessage,
    excludeUserId?: string
  ) => void;

  /** Send to specific user function */
  private sendToUser: (userId: string, message: DuckRaceServerMessage) => void;

  constructor(
    broadcastToRoom: (roomId: string, message: DuckRaceServerMessage, excludeUserId?: string) => void,
    sendToUser: (userId: string, message: DuckRaceServerMessage) => void
  ) {
    this.broadcastToRoom = broadcastToRoom;
    this.sendToUser = sendToUser;
  }

  /**
   * Get or create a race round for a room
   */
  private getOrCreateRound(roomId: string): DuckRaceRound {
    let round = this.rounds.get(roomId);

    if (!round) {
      round = {
        roundId: uuidv4(),
        roomId,
        phase: "waiting",
        players: new Map(),
        betAmount: 0,
        timeRemaining: 0,
        totalPot: 0,
        raceHistory: [],
      };
      this.rounds.set(roomId, round);
      console.log(`🦆 Created new duck race room ${roomId} in WAITING phase`);
    }

    return round;
  }

  /**
   * Get next available lane (1-5)
   */
  private getNextLane(round: DuckRaceRound): number {
    const usedLanes = new Set(Array.from(round.players.values()).map((p) => p.lane));
    for (let lane = 1; lane <= DUCK_RACE_CONFIG.MAX_PLAYERS; lane++) {
      if (!usedLanes.has(lane)) return lane;
    }
    return 0; // No lane available
  }

  /**
   * Get duck color for a lane
   */
  private getColorForLane(lane: number): DuckColor {
    return DUCK_COLORS[(lane - 1) % DUCK_COLORS.length];
  }

  /**
   * Start betting countdown when first player places bet
   */
  private startBettingCountdown(
    roomId: string,
    triggeredBy: { userId: string; username: string },
    betAmount: number
  ): void {
    const round = this.rounds.get(roomId);
    if (!round) return;

    if (round.phase !== "waiting") return;

    round.phase = "betting";
    round.betAmount = betAmount;
    round.timeRemaining = DUCK_RACE_CONFIG.BETTING_DURATION;

    console.log(
      `⏱️ Duck race betting started by ${triggeredBy.username} with ${betAmount} CCC`
    );

    this.broadcastToRoom(roomId, {
      type: "BETTING_STARTED",
      payload: {
        roundId: round.roundId,
        phase: "betting",
        betAmount,
        timeRemaining: round.timeRemaining,
        triggeredBy,
      },
      timestamp: Date.now(),
    });

    this.startPhaseTimer(roomId);
  }

  /**
   * Start phase timer for countdown phases
   */
  private startPhaseTimer(roomId: string): void {
    this.stopPhaseTimer(roomId);

    const timer = setInterval(() => {
      this.tickPhase(roomId);
    }, 1000);

    this.timers.set(roomId, timer);
  }

  /**
   * Stop phase timer
   */
  private stopPhaseTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomId);
    }
  }

  /**
   * Stop race timer
   */
  private stopRaceTimer(roomId: string): void {
    const timer = this.raceTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.raceTimers.delete(roomId);
    }
  }

  /**
   * Process one tick of the phase timer
   */
  private async tickPhase(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    round.timeRemaining--;

    if (round.phase === "betting" || round.phase === "finished") {
      // Broadcast countdown
      this.broadcastToRoom(roomId, {
        type: "COUNTDOWN_TICK",
        payload: {
          phase: "countdown",
          timeRemaining: round.timeRemaining,
        },
        timestamp: Date.now(),
      });
    } else if (round.phase === "countdown") {
      this.broadcastToRoom(roomId, {
        type: "COUNTDOWN_TICK",
        payload: {
          phase: "countdown",
          timeRemaining: round.timeRemaining,
        },
        timestamp: Date.now(),
      });
    }

    if (round.timeRemaining <= 0) {
      await this.transitionPhase(roomId);
    }
  }

  /**
   * Transition to next phase
   */
  private async transitionPhase(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    switch (round.phase) {
      case "betting":
        await this.startCountdownOrCancel(roomId);
        break;
      case "countdown":
        await this.startRacing(roomId);
        break;
      case "finished":
        await this.goBackToWaiting(roomId);
        break;
    }
  }

  /**
   * Start countdown if enough players, or cancel if not
   */
  private async startCountdownOrCancel(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    const playersWithBets = Array.from(round.players.values()).filter((p) => p.hasBet);

    if (playersWithBets.length < DUCK_RACE_CONFIG.MIN_PLAYERS) {
      // Not enough players, refund and go back to waiting
      console.log(`🦆 Not enough players in room ${roomId}, cancelling race`);

      for (const player of playersWithBets) {
        try {
          const result = await updateWalletBalance(player.userId, round.betAmount, "win");
          this.sendToUser(player.userId, {
            type: "BALANCE_UPDATE",
            payload: {
              balance: result.newBalance,
              reason: "refund",
            },
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error(`Failed to refund ${player.username}:`, error);
        }
      }

      await this.goBackToWaiting(roomId);
      return;
    }

    // Start countdown
    round.phase = "countdown";
    round.timeRemaining = DUCK_RACE_CONFIG.COUNTDOWN_DURATION;

    console.log(`🦆 Countdown starting for room ${roomId}`);

    this.broadcastToRoom(roomId, {
      type: "COUNTDOWN_TICK",
      payload: {
        phase: "countdown",
        timeRemaining: round.timeRemaining,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Start the race
   */
  private async startRacing(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    this.stopPhaseTimer(roomId);

    round.phase = "racing";
    round.raceHistory = [];

    const players = Array.from(round.players.values())
      .filter((p) => p.hasBet)
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        lane: p.lane,
        color: p.color,
      }));

    console.log(`🏁 Race starting in room ${roomId} with ${players.length} ducks!`);

    this.broadcastToRoom(roomId, {
      type: "RACE_STARTED",
      payload: {
        roundId: round.roundId,
        phase: "racing",
        totalPot: round.totalPot,
        players,
      },
      timestamp: Date.now(),
    });

    // Start race tick loop
    const raceTimer = setInterval(() => {
      this.tickRace(roomId);
    }, DUCK_RACE_CONFIG.TICK_INTERVAL);

    this.raceTimers.set(roomId, raceTimer);
  }

  /**
   * Process one tick of the race
   */
  private async tickRace(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round || round.phase !== "racing") return;

    const activePlayers = Array.from(round.players.values()).filter((p) => p.hasBet);

    // Generate random advances for each duck
    const advances = await generateRandomAdvances(activePlayers.length);

    // Update positions
    const positions: Array<{ userId: string; position: number; advance: number }> = [];
    let leaderId = "";
    let leaderPosition = -1;

    activePlayers.forEach((player, index) => {
      const advance = advances[index];
      player.position += advance;

      positions.push({
        userId: player.userId,
        position: player.position,
        advance,
      });

      if (player.position > leaderPosition) {
        leaderPosition = player.position;
        leaderId = player.userId;
      }
    });

    // Record snapshot
    round.raceHistory.push({
      timestamp: Date.now(),
      positions: positions.map((p) => ({ userId: p.userId, position: p.position })),
    });

    // Broadcast update
    this.broadcastToRoom(roomId, {
      type: "RACE_UPDATE",
      payload: {
        positions,
        leaderId,
      },
      timestamp: Date.now(),
    });

    // Check for winner
    const winner = activePlayers.find(
      (p) => p.position >= DUCK_RACE_CONFIG.TRACK_LENGTH
    );

    if (winner) {
      await this.finishRace(roomId, winner);
    }
  }

  /**
   * Finish the race and distribute winnings
   */
  private async finishRace(roomId: string, winner: DuckPlayer): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    this.stopRaceTimer(roomId);

    round.phase = "finished";
    round.winnerId = winner.userId;
    round.winnerUsername = winner.username;
    round.timeRemaining = DUCK_RACE_CONFIG.RESULTS_DURATION;

    console.log(`🏆 ${winner.username} won the race in room ${roomId}!`);

    // Calculate final positions
    const activePlayers = Array.from(round.players.values())
      .filter((p) => p.hasBet)
      .sort((a, b) => b.position - a.position);

    const finalPositions = activePlayers.map((p, index) => ({
      userId: p.userId,
      username: p.username,
      position: p.position,
      lane: p.lane,
      rank: index + 1,
    }));

    // Credit winnings to winner
    let winnerNewBalance = 0;
    try {
      const result = await updateWalletBalance(winner.userId, round.totalPot, "win");
      winnerNewBalance = result.newBalance;
      console.log(`✅ Credited ${round.totalPot} CCC to ${winner.username}`);
    } catch (error) {
      console.error(`❌ Failed to credit winnings to ${winner.username}:`, error);
    }

    // Send results to each player
    for (const player of activePlayers) {
      const isWinner = player.userId === winner.userId;
      const playerRank = finalPositions.find((p) => p.userId === player.userId)?.rank ?? 0;

      let newBalance: number;
      if (isWinner) {
        newBalance = winnerNewBalance;
      } else {
        newBalance = await getWalletBalance(player.userId);
      }

      this.sendToUser(player.userId, {
        type: "RACE_FINISHED",
        payload: {
          roundId: round.roundId,
          phase: "finished",
          winner: {
            userId: winner.userId,
            username: winner.username,
            lane: winner.lane,
            color: winner.color,
            winnings: round.totalPot,
          },
          finalPositions,
          totalPot: round.totalPot,
          yourResult: {
            rank: playerRank,
            betAmount: round.betAmount,
            winnings: isWinner ? round.totalPot : 0,
            netResult: isWinner ? round.totalPot - round.betAmount : -round.betAmount,
            newBalance,
          },
          timeUntilNextRace: DUCK_RACE_CONFIG.RESULTS_DURATION,
        },
        timestamp: Date.now(),
      });
    }

    // Send to spectators (players who joined but didn't bet)
    for (const [userId, player] of round.players) {
      if (!player.hasBet) {
        const balance = await getWalletBalance(userId);
        this.sendToUser(userId, {
          type: "RACE_FINISHED",
          payload: {
            roundId: round.roundId,
            phase: "finished",
            winner: {
              userId: winner.userId,
              username: winner.username,
              lane: winner.lane,
              color: winner.color,
              winnings: round.totalPot,
            },
            finalPositions,
            totalPot: round.totalPot,
            yourResult: {
              rank: 0,
              betAmount: 0,
              winnings: 0,
              netResult: 0,
              newBalance: balance,
            },
            timeUntilNextRace: DUCK_RACE_CONFIG.RESULTS_DURATION,
          },
          timestamp: Date.now(),
        });
      }
    }

    // Save to database (async)
    this.saveRaceToDatabase(round, winner, finalPositions).catch((err) =>
      console.error("Failed to save race:", err)
    );

    // Start results timer
    this.startPhaseTimer(roomId);
  }

  /**
   * Go back to waiting phase
   */
  private async goBackToWaiting(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    this.stopPhaseTimer(roomId);
    this.stopRaceTimer(roomId);

    // Reset round
    const newRoundId = uuidv4();
    round.roundId = newRoundId;
    round.phase = "waiting";
    round.timeRemaining = 0;
    round.betAmount = 0;
    round.totalPot = 0;
    round.winnerId = undefined;
    round.winnerUsername = undefined;
    round.raceHistory = [];

    // Reset player state but keep them in the room
    for (const player of round.players.values()) {
      player.hasBet = false;
      player.position = 0;
    }

    this.broadcastToRoom(roomId, {
      type: "WAITING_FOR_PLAYERS",
      payload: {
        roundId: newRoundId,
        phase: "waiting",
        playerCount: round.players.size,
        minPlayers: DUCK_RACE_CONFIG.MIN_PLAYERS,
        message: "Waiting for players to join and place bets...",
      },
      timestamp: Date.now(),
    });

    console.log(`⏸️ Room ${roomId} is now WAITING for players`);
  }

  /**
   * Handle player joining a room
   */
  async handlePlayerJoin(
    userId: string,
    username: string,
    roomId: string = DUCK_RACE_CONFIG.DEFAULT_ROOM_ID
  ): Promise<RaceStatePayload> {
    const round = this.getOrCreateRound(roomId);

    // Check if player already exists
    let player = round.players.get(userId);

    if (player) {
      // Reconnecting
      player.isConnected = true;
      console.log(`🔄 Player ${username} reconnected to duck race ${roomId}`);
    } else {
      // Check max players
      if (round.players.size >= DUCK_RACE_CONFIG.MAX_PLAYERS) {
        throw new Error("Room is full (maximum 5 players)");
      }

      const lane = this.getNextLane(round);
      if (lane === 0) {
        throw new Error("No lanes available");
      }

      player = {
        userId,
        username,
        joinedAt: Date.now(),
        betAmount: 0,
        hasBet: false,
        position: 0,
        lane,
        isConnected: true,
        color: this.getColorForLane(lane),
      };

      round.players.set(userId, player);
      console.log(`🦆 Player ${username} joined duck race room ${roomId} in lane ${lane}`);
    }

    // Broadcast join
    this.broadcastToRoom(
      roomId,
      {
        type: "PLAYER_JOINED",
        payload: {
          userId,
          username,
          lane: player.lane,
          color: player.color,
          playerCount: round.players.size,
        },
        timestamp: Date.now(),
      },
      userId
    );

    // Get balance
    const balance = await getWalletBalance(userId);

    // Build room state
    const playersArray = Array.from(round.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      hasBet: p.hasBet,
      position: p.position,
      lane: p.lane,
      color: p.color,
      isConnected: p.isConnected,
    }));

    return {
      roomId,
      roundId: round.roundId,
      phase: round.phase,
      timeRemaining: round.timeRemaining,
      betAmount: round.betAmount,
      totalPot: round.totalPot,
      players: playersArray,
      yourBalance: balance,
      yourHasBet: player.hasBet,
      yourLane: player.lane,
    };
  }

  /**
   * Handle player leaving
   */
  async handlePlayerLeave(userId: string, roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    const player = round.players.get(userId);
    if (!player) return;

    // If player has bet and race is in progress, just mark as disconnected
    if (player.hasBet && (round.phase === "racing" || round.phase === "countdown")) {
      player.isConnected = false;
      console.log(`⚠️ Player ${player.username} disconnected during race`);
    } else {
      // Refund if they had bet and we're still in betting/waiting
      if (player.hasBet && (round.phase === "waiting" || round.phase === "betting")) {
        try {
          await updateWalletBalance(userId, round.betAmount, "win");
          round.totalPot -= round.betAmount;
          console.log(`💰 Refunded ${round.betAmount} CCC to ${player.username}`);
        } catch (error) {
          console.error(`Failed to refund ${player.username}:`, error);
        }
      }

      round.players.delete(userId);
      console.log(`👋 Player ${player.username} left duck race room ${roomId}`);
    }

    // Broadcast leave
    this.broadcastToRoom(roomId, {
      type: "PLAYER_LEFT",
      payload: {
        userId,
        username: player.username,
        playerCount: round.players.size,
        refunded: player.hasBet,
      },
      timestamp: Date.now(),
    });

    // Clean up empty room
    if (round.players.size === 0 && round.phase === "waiting") {
      this.stopPhaseTimer(roomId);
      this.stopRaceTimer(roomId);
      this.rounds.delete(roomId);
      console.log(`🗑️ Duck race room ${roomId} removed (no players)`);
    }
  }

  /**
   * Handle bet placement
   */
  async handlePlaceBet(
    userId: string,
    roomId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    // Check phase
    if (round.phase !== "waiting" && round.phase !== "betting") {
      return { success: false, error: "Cannot place bets now. Wait for next race." };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Not in this room" };
    }

    if (player.hasBet) {
      return { success: false, error: "Already placed a bet" };
    }

    // Validate amount
    if (amount < DUCK_RACE_CONFIG.MIN_BET) {
      return { success: false, error: `Minimum bet is ${DUCK_RACE_CONFIG.MIN_BET} CCC` };
    }

    // If betting phase started, must match the bet amount
    if (round.phase === "betting" && amount !== round.betAmount) {
      return {
        success: false,
        error: `Must bet exactly ${round.betAmount} CCC to join this race`,
      };
    }

    // Deduct from wallet
    try {
      const result = await updateWalletBalance(userId, amount, "bet");

      player.hasBet = true;
      player.betAmount = amount;
      round.totalPot += amount;

      const playersWithBets = Array.from(round.players.values()).filter((p) => p.hasBet);

      // First bet starts the betting countdown
      if (round.phase === "waiting") {
        this.startBettingCountdown(roomId, { userId, username: player.username }, amount);
      }

      // Broadcast bet
      this.broadcastToRoom(
        roomId,
        {
          type: "BET_PLACED",
          payload: {
            userId,
            username: player.username,
            betAmount: amount,
            totalPot: round.totalPot,
            playersWithBets: playersWithBets.length,
          },
          timestamp: Date.now(),
        },
        userId
      );

      // Send confirmation to player
      this.sendToUser(userId, {
        type: "BET_PLACED",
        payload: {
          userId,
          username: player.username,
          betAmount: amount,
          totalPot: round.totalPot,
          playersWithBets: playersWithBets.length,
          newBalance: result.newBalance,
        },
        timestamp: Date.now(),
      });

      console.log(`🦆 ${player.username} placed bet of ${amount} CCC in lane ${player.lane}`);

      return { success: true, newBalance: result.newBalance };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to place bet";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current room state
   */
  async getRoomState(userId: string, roomId: string): Promise<RaceStatePayload | null> {
    const round = this.rounds.get(roomId);
    if (!round) return null;

    const player = round.players.get(userId);
    const balance = await getWalletBalance(userId);

    const playersArray = Array.from(round.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      hasBet: p.hasBet,
      position: p.position,
      lane: p.lane,
      color: p.color,
      isConnected: p.isConnected,
    }));

    return {
      roomId,
      roundId: round.roundId,
      phase: round.phase,
      timeRemaining: round.timeRemaining,
      betAmount: round.betAmount,
      totalPot: round.totalPot,
      players: playersArray,
      yourBalance: balance,
      yourHasBet: player?.hasBet ?? false,
      yourLane: player?.lane,
    };
  }

  /**
   * Save race to database
   */
  private async saveRaceToDatabase(
    round: DuckRaceRound,
    winner: DuckPlayer,
    finalPositions: Array<{ userId: string; username: string; position: number; lane: number; rank: number }>
  ): Promise<void> {
    // Import model dynamically to avoid circular deps
    const { DuckRaceHistory } = await import("../models/DuckRaceHistory");
    const { publishGameCompleted } = await import("../events/publisher");

    try {
      const participants = finalPositions.map((p) => ({
        userId: p.userId,
        username: p.username,
        lane: p.lane,
        finalPosition: p.position,
        rank: p.rank,
        betAmount: round.betAmount,
        winAmount: p.userId === winner.userId ? round.totalPot : 0,
        netResult: p.userId === winner.userId ? round.totalPot - round.betAmount : -round.betAmount,
      }));

      const raceHistory = new DuckRaceHistory({
        roundId: round.roundId,
        roomId: round.roomId,
        betAmount: round.betAmount,
        totalPot: round.totalPot,
        participants,
        winnerId: winner.userId,
        winnerUsername: winner.username,
        trackLength: DUCK_RACE_CONFIG.TRACK_LENGTH,
        raceSnapshots: round.raceHistory.length,
      });

      await raceHistory.save();

      // Publish event for each participant
      for (const participant of participants) {
        publishGameCompleted({
          userId: participant.userId,
          gameId: raceHistory._id.toString(),
          gameType: "duck-race",
          totalBet: participant.betAmount,
          totalWin: participant.winAmount,
          netResult: participant.netResult,
        }).catch((err) => console.error("Failed to publish game.completed:", err));
      }
    } catch (error) {
      console.error("Error saving duck race to database:", error);
    }
  }

  /**
   * Clean up on shutdown
   */
  cleanup(): void {
    for (const roomId of this.timers.keys()) {
      this.stopPhaseTimer(roomId);
    }
    for (const roomId of this.raceTimers.keys()) {
      this.stopRaceTimer(roomId);
    }
    this.rounds.clear();
    console.log("🧹 DuckRaceManager cleaned up");
  }
}
