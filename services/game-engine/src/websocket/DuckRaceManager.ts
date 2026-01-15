/**
 * Duck Race Manager
 * Manages multiplayer duck racing with room-based lobbies
 *
 * Flow:
 * 1. LOBBY - Players browse available rooms or create a new one
 * 2. WAITING - In room, waiting for players (min 2, max 5)
 * 3. All players ready -> bets deducted
 * 4. COUNTDOWN - 3s countdown before race starts
 * 5. RACING - Ducks advance based on random numbers until one crosses finish
 * 6. FINISHED - Show results, winner takes all
 * 7. Room destroyed (single-race) or back to WAITING (persistent)
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
  RoomInfo,
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

  /** Broadcast to all users in lobby (not in any room) */
  private broadcastToLobby: (message: DuckRaceServerMessage) => void;

  constructor(
    broadcastToRoom: (roomId: string, message: DuckRaceServerMessage, excludeUserId?: string) => void,
    sendToUser: (userId: string, message: DuckRaceServerMessage) => void,
    broadcastToLobby: (message: DuckRaceServerMessage) => void
  ) {
    this.broadcastToRoom = broadcastToRoom;
    this.sendToUser = sendToUser;
    this.broadcastToLobby = broadcastToLobby;
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
   * Get room info for lobby display
   */
  private getRoomInfo(round: DuckRaceRound): RoomInfo {
    const readyCount = Array.from(round.players.values()).filter((p) => p.isReady).length;
    return {
      roomId: round.roomId,
      roomName: round.roomName,
      creatorId: round.creatorId,
      creatorUsername: round.creatorUsername,
      betAmount: round.betAmount,
      playerCount: round.players.size,
      maxPlayers: DUCK_RACE_CONFIG.MAX_PLAYERS,
      isPersistent: round.isPersistent,
      phase: round.phase,
      readyCount,
    };
  }

  /**
   * Broadcast room list update to lobby
   */
  private broadcastRoomListUpdate(): void {
    const rooms = this.getRoomList();
    this.broadcastToLobby({
      type: "ROOM_LIST",
      payload: { rooms },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast single room update to lobby
   */
  private broadcastRoomUpdate(round: DuckRaceRound): void {
    this.broadcastToLobby({
      type: "ROOM_UPDATED",
      payload: { room: this.getRoomInfo(round) },
      timestamp: Date.now(),
    });
  }

  /**
   * Get list of all available rooms for lobby
   */
  getRoomList(): RoomInfo[] {
    const rooms: RoomInfo[] = [];
    for (const round of this.rounds.values()) {
      // Only show rooms that are in waiting phase and not full
      if (round.phase === "waiting" && round.players.size < DUCK_RACE_CONFIG.MAX_PLAYERS) {
        rooms.push(this.getRoomInfo(round));
      }
    }
    return rooms;
  }

  /**
   * Get user balance from wallet service (exposed for WebSocket server)
   */
  async getUserBalance(userId: string): Promise<number> {
    return getWalletBalance(userId);
  }

  /**
   * Create a new race room
   */
  async handleCreateRoom(
    userId: string,
    username: string,
    betAmount: number,
    isPersistent: boolean,
    roomName?: string
  ): Promise<{ success: boolean; error?: string; roomState?: RaceStatePayload }> {
    // Validate bet amount
    if (betAmount < DUCK_RACE_CONFIG.MIN_BET) {
      return { success: false, error: `Minimum bet is ${DUCK_RACE_CONFIG.MIN_BET} CCC` };
    }

    // Check user balance
    const balance = await getWalletBalance(userId);
    if (balance < betAmount) {
      return { success: false, error: "Insufficient balance to create room with this bet amount" };
    }

    // Generate room ID and name
    const roomId = uuidv4();
    const finalRoomName = roomName || `${username}'s Race`;

    // Create the round
    const round: DuckRaceRound = {
      roundId: uuidv4(),
      roomId,
      roomName: finalRoomName,
      phase: "waiting",
      players: new Map(),
      betAmount,
      timeRemaining: 0,
      totalPot: 0,
      raceHistory: [],
      creatorId: userId,
      creatorUsername: username,
      isPersistent,
    };

    this.rounds.set(roomId, round);
    console.log(`🦆 Room created: ${finalRoomName} by ${username} (${betAmount} CCC, persistent: ${isPersistent})`);

    // Add creator to the room
    const lane = this.getNextLane(round);
    const player: DuckPlayer = {
      userId,
      username,
      joinedAt: Date.now(),
      betAmount: 0,
      hasBet: false,
      isReady: false,
      position: 0,
      lane,
      isConnected: true,
      color: this.getColorForLane(lane),
    };

    round.players.set(userId, player);

    // Broadcast new room to lobby
    this.broadcastToLobby({
      type: "ROOM_CREATED",
      payload: { room: this.getRoomInfo(round) },
      timestamp: Date.now(),
    });

    // Return room state for the creator
    const roomState = await this.buildRoomState(round, userId);
    return { success: true, roomState };
  }

  /**
   * Handle player joining a room
   */
  async handleJoinRoom(
    userId: string,
    username: string,
    roomId: string
  ): Promise<{ success: boolean; error?: string; roomState?: RaceStatePayload }> {
    const round = this.rounds.get(roomId);

    if (!round) {
      return { success: false, error: "Room not found" };
    }

    // Check phase
    if (round.phase !== "waiting") {
      return { success: false, error: "Race already in progress" };
    }

    // Check if already in room
    if (round.players.has(userId)) {
      // Reconnecting
      const player = round.players.get(userId)!;
      player.isConnected = true;
      console.log(`🔄 Player ${username} reconnected to room ${round.roomName}`);
      const roomState = await this.buildRoomState(round, userId);
      return { success: true, roomState };
    }

    // Check if room is full
    if (round.players.size >= DUCK_RACE_CONFIG.MAX_PLAYERS) {
      return { success: false, error: "Room is full" };
    }

    // Check user balance
    const balance = await getWalletBalance(userId);
    if (balance < round.betAmount) {
      return { success: false, error: `Need at least ${round.betAmount} CCC to join this room` };
    }

    // Get lane
    const lane = this.getNextLane(round);
    if (lane === 0) {
      return { success: false, error: "No lanes available" };
    }

    // Add player
    const player: DuckPlayer = {
      userId,
      username,
      joinedAt: Date.now(),
      betAmount: 0,
      hasBet: false,
      isReady: false,
      position: 0,
      lane,
      isConnected: true,
      color: this.getColorForLane(lane),
    };

    round.players.set(userId, player);
    console.log(`🦆 Player ${username} joined room ${round.roomName} in lane ${lane}`);

    // Broadcast join to room
    this.broadcastToRoom(
      roomId,
      {
        type: "PLAYER_JOINED",
        payload: {
          userId,
          username,
          lane,
          color: player.color,
          playerCount: round.players.size,
          isReady: false,
        },
        timestamp: Date.now(),
      },
      userId
    );

    // Update lobby
    this.broadcastRoomUpdate(round);

    const roomState = await this.buildRoomState(round, userId);
    return { success: true, roomState };
  }

  /**
   * Handle player leaving a room
   */
  async handleLeaveRoom(userId: string, roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    const player = round.players.get(userId);
    if (!player) return;

    // If race is in progress, just mark as disconnected
    if (round.phase === "racing" || round.phase === "countdown") {
      player.isConnected = false;
      console.log(`⚠️ Player ${player.username} disconnected during race`);
      return;
    }

    // Remove player from room
    round.players.delete(userId);
    console.log(`👋 Player ${player.username} left room ${round.roomName}`);

    // Broadcast leave
    this.broadcastToRoom(roomId, {
      type: "PLAYER_LEFT",
      payload: {
        userId,
        username: player.username,
        playerCount: round.players.size,
        refunded: false,
      },
      timestamp: Date.now(),
    });

    // If room is empty, delete it
    if (round.players.size === 0) {
      this.deleteRoom(roomId);
      return;
    }

    // If creator left in waiting phase, assign new creator
    if (round.creatorId === userId && round.phase === "waiting") {
      const newCreator = round.players.values().next().value;
      if (newCreator) {
        round.creatorId = newCreator.userId;
        round.creatorUsername = newCreator.username;
        console.log(`👑 New room creator: ${newCreator.username}`);
      }
    }

    // Update lobby
    this.broadcastRoomUpdate(round);
  }

  /**
   * Handle player setting ready status
   */
  async handleSetReady(
    userId: string,
    roomId: string,
    isReady: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const round = this.rounds.get(roomId);
    if (!round) {
      return { success: false, error: "Room not found" };
    }

    if (round.phase !== "waiting") {
      return { success: false, error: "Cannot change ready status now" };
    }

    const player = round.players.get(userId);
    if (!player) {
      return { success: false, error: "Not in this room" };
    }

    // If setting ready, check balance again
    if (isReady) {
      const balance = await getWalletBalance(userId);
      if (balance < round.betAmount) {
        return { success: false, error: `Insufficient balance. Need ${round.betAmount} CCC` };
      }
    }

    player.isReady = isReady;

    const readyCount = Array.from(round.players.values()).filter((p) => p.isReady).length;
    const totalPlayers = round.players.size;

    console.log(`🦆 ${player.username} is ${isReady ? "READY" : "NOT READY"} (${readyCount}/${totalPlayers})`);

    // Broadcast ready status change
    this.broadcastToRoom(roomId, {
      type: "PLAYER_READY",
      payload: {
        userId,
        username: player.username,
        isReady,
        readyCount,
        totalPlayers,
      },
      timestamp: Date.now(),
    });

    // Update lobby
    this.broadcastRoomUpdate(round);

    // Check if all players are ready (need at least MIN_PLAYERS)
    if (readyCount === totalPlayers && totalPlayers >= DUCK_RACE_CONFIG.MIN_PLAYERS) {
      await this.startCountdown(roomId);
    }

    return { success: true };
  }

  /**
   * Start countdown when all players are ready
   */
  private async startCountdown(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    console.log(`✅ All players ready in room ${round.roomName}! Starting countdown...`);

    // Deduct bets from all players
    for (const player of round.players.values()) {
      try {
        const result = await updateWalletBalance(player.userId, round.betAmount, "bet");
        player.hasBet = true;
        player.betAmount = round.betAmount;
        round.totalPot += round.betAmount;

        // Send balance update to player
        this.sendToUser(player.userId, {
          type: "BALANCE_UPDATE",
          payload: {
            balance: result.newBalance,
            reason: "bet_placed",
          },
          timestamp: Date.now(),
        });

        console.log(`💰 Deducted ${round.betAmount} CCC from ${player.username}`);
      } catch (error) {
        console.error(`Failed to deduct bet from ${player.username}:`, error);
        // Cancel the race if we can't deduct from someone
        await this.cancelRace(roomId, `Failed to process bet for ${player.username}`);
        return;
      }
    }

    // Broadcast all ready
    this.broadcastToRoom(roomId, {
      type: "ALL_READY",
      payload: { message: "All players ready! Race starting..." },
      timestamp: Date.now(),
    });

    // Start countdown phase
    round.phase = "countdown";
    round.timeRemaining = DUCK_RACE_CONFIG.COUNTDOWN_DURATION;

    this.broadcastToRoom(roomId, {
      type: "COUNTDOWN_TICK",
      payload: {
        phase: "countdown",
        timeRemaining: round.timeRemaining,
      },
      timestamp: Date.now(),
    });

    this.startPhaseTimer(roomId);
  }

  /**
   * Cancel race and refund all players
   */
  private async cancelRace(roomId: string, reason: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    console.log(`❌ Race cancelled in room ${round.roomName}: ${reason}`);

    // Refund all players who had bet
    for (const player of round.players.values()) {
      if (player.hasBet) {
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

      // Reset player state
      player.hasBet = false;
      player.isReady = false;
      player.betAmount = 0;
    }

    round.phase = "waiting";
    round.totalPot = 0;

    // Broadcast error
    this.broadcastToRoom(roomId, {
      type: "ERROR",
      payload: { code: "RACE_CANCELLED", message: reason },
      timestamp: Date.now(),
    });

    // Send waiting state
    this.broadcastToRoom(roomId, {
      type: "WAITING_FOR_PLAYERS",
      payload: {
        roundId: round.roundId,
        phase: "waiting",
        playerCount: round.players.size,
        minPlayers: DUCK_RACE_CONFIG.MIN_PLAYERS,
        message: "Race cancelled. Waiting for players to ready up...",
      },
      timestamp: Date.now(),
    });
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

    if (round.phase === "countdown" || round.phase === "finished") {
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
      case "countdown":
        await this.startRacing(roomId);
        break;
      case "finished":
        await this.handlePostRace(roomId);
        break;
    }
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

    console.log(`🏁 Race starting in room ${round.roomName} with ${players.length} ducks!`);

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

    console.log(`🏆 ${winner.username} won the race in room ${round.roomName}!`);

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

    // Save to database (async)
    this.saveRaceToDatabase(round, winner, finalPositions).catch((err) =>
      console.error("Failed to save race:", err)
    );

    // Start results timer
    this.startPhaseTimer(roomId);
  }

  /**
   * Handle post-race: either delete room or go back to waiting
   */
  private async handlePostRace(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    this.stopPhaseTimer(roomId);
    this.stopRaceTimer(roomId);

    if (round.isPersistent) {
      // Reset for next race
      await this.goBackToWaiting(roomId);
    } else {
      // Delete room
      this.deleteRoom(roomId);
    }
  }

  /**
   * Go back to waiting phase (for persistent rooms)
   */
  private async goBackToWaiting(roomId: string): Promise<void> {
    const round = this.rounds.get(roomId);
    if (!round) return;

    // Reset round
    const newRoundId = uuidv4();
    round.roundId = newRoundId;
    round.phase = "waiting";
    round.timeRemaining = 0;
    round.totalPot = 0;
    round.winnerId = undefined;
    round.winnerUsername = undefined;
    round.raceHistory = [];

    // Reset player state but keep them in the room
    for (const player of round.players.values()) {
      player.hasBet = false;
      player.isReady = false;
      player.betAmount = 0;
      player.position = 0;
    }

    this.broadcastToRoom(roomId, {
      type: "WAITING_FOR_PLAYERS",
      payload: {
        roundId: newRoundId,
        phase: "waiting",
        playerCount: round.players.size,
        minPlayers: DUCK_RACE_CONFIG.MIN_PLAYERS,
        message: "Race complete! Ready up for the next race.",
      },
      timestamp: Date.now(),
    });

    // Update lobby
    this.broadcastRoomUpdate(round);

    console.log(`⏸️ Room ${round.roomName} is now WAITING for players`);
  }

  /**
   * Delete a room
   */
  private deleteRoom(roomId: string): void {
    const round = this.rounds.get(roomId);
    if (!round) return;

    this.stopPhaseTimer(roomId);
    this.stopRaceTimer(roomId);
    this.rounds.delete(roomId);

    console.log(`🗑️ Room ${round.roomName} deleted`);

    // Broadcast room deletion to lobby
    this.broadcastToLobby({
      type: "ROOM_DELETED",
      payload: { roomId },
      timestamp: Date.now(),
    });
  }

  /**
   * Build room state for a user
   */
  private async buildRoomState(round: DuckRaceRound, userId: string): Promise<RaceStatePayload> {
    const player = round.players.get(userId);
    const balance = await getWalletBalance(userId);

    const playersArray = Array.from(round.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      hasBet: p.hasBet,
      isReady: p.isReady,
      position: p.position,
      lane: p.lane,
      color: p.color,
      isConnected: p.isConnected,
    }));

    return {
      roomId: round.roomId,
      roomName: round.roomName,
      roundId: round.roundId,
      phase: round.phase,
      timeRemaining: round.timeRemaining,
      betAmount: round.betAmount,
      totalPot: round.totalPot,
      creatorId: round.creatorId,
      creatorUsername: round.creatorUsername,
      isPersistent: round.isPersistent,
      players: playersArray,
      yourBalance: balance,
      yourIsReady: player?.isReady ?? false,
      yourLane: player?.lane,
    };
  }

  /**
   * Get room state for a user
   */
  async getRoomState(userId: string, roomId: string): Promise<RaceStatePayload | null> {
    const round = this.rounds.get(roomId);
    if (!round) return null;

    return this.buildRoomState(round, userId);
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
