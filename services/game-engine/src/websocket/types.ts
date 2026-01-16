/**
 * WebSocket Types for Multiplayer Roulette
 * Defines all message types and game state interfaces
 */

import { Bet, SpinResult, GameResult } from "../models/RouletteTypes";

// ============================================================================
// Game Round States
// ============================================================================

export type RoundPhase = "waiting" | "betting" | "spinning" | "results";

export interface PlayerInfo {
  /** User ID */
  userId: string;
  /** Display name */
  username: string;
  /** When the player joined */
  joinedAt: number;
  /** Player's current bets in this round */
  bets: Bet[];
  /** Total amount bet in current round */
  totalBet: number;
  /** Whether player is connected */
  isConnected: boolean;
  /** Whether player has locked their bets */
  isLocked: boolean;
}

export interface GameRound {
  /** Unique round identifier */
  roundId: string;
  /** Room this round belongs to */
  roomId: string;
  /** Current phase of the round */
  phase: RoundPhase;
  /** Players in this round with their bets */
  players: Map<string, PlayerInfo>;
  /** Seconds remaining in current phase */
  timeRemaining: number;
  /** When betting phase started */
  bettingStartedAt: number;
  /** Spin result (populated after spin) */
  spinResult?: SpinResult;
  /** Per-player results (populated after spin) */
  playerResults?: Map<string, PlayerResult>;
}

export interface PlayerResult {
  userId: string;
  username: string;
  bets: Bet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBets: Array<{ bet: Bet; payout: number }>;
}

// ============================================================================
// Client -> Server Messages
// ============================================================================

export type ClientMessageType =
  | "JOIN_ROOM"
  | "LEAVE_ROOM"
  | "PLACE_BET"
  | "REMOVE_BET"
  | "CLEAR_BETS"
  | "LOCK_BETS"
  | "PING";

export interface JoinRoomPayload {
  roomId?: string; // Default room if not specified
}

export interface LeaveRoomPayload {
  roomId?: string;
}

export interface PlaceBetPayload {
  /** Simple bet format: type, value, amount */
  type: string;
  value?: string | number;
  amount: number;
  /** Complex bet format: direct numbers array */
  numbers?: number[];
}

export interface RemoveBetPayload {
  /** Index of the bet to remove */
  betIndex: number;
}

export interface ClientMessage {
  type: ClientMessageType;
  payload?:
    | JoinRoomPayload
    | LeaveRoomPayload
    | PlaceBetPayload
    | RemoveBetPayload;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

export type ServerMessageType =
  | "ROOM_STATE"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "PLAYER_LOCKED"
  | "BET_PLACED"
  | "BET_REMOVED"
  | "BETS_CLEARED"
  | "BETTING_STARTED"
  | "ROUND_COUNTDOWN"
  | "SPIN_STARTING"
  | "SPIN_RESULT"
  | "WAITING_FOR_BETS"
  | "BALANCE_UPDATE"
  | "ERROR"
  | "PONG";

// Room state sent on join
export interface RoomStatePayload {
  roomId: string;
  roundId: string;
  phase: RoundPhase;
  timeRemaining: number;
  players: Array<{
    userId: string;
    username: string;
    bets: Bet[];
    totalBet: number;
    isConnected: boolean;
    isLocked: boolean;
  }>;
  /** Your current bets (for reconnection) */
  yourBets: Bet[];
  /** Your current balance */
  yourBalance: number;
  /** Your user ID */
  yourUserId: string;
}

export interface PlayerJoinedPayload {
  userId: string;
  username: string;
  playerCount: number;
}

export interface PlayerLeftPayload {
  userId: string;
  username: string;
  playerCount: number;
}

export interface PlayerLockedPayload {
  userId: string;
  username: string;
}

export interface BetPlacedPayload {
  userId: string;
  username: string;
  bet: Bet;
  totalBet: number;
  /** Only sent to the player who placed the bet */
  newBalance?: number;
}

export interface BetRemovedPayload {
  userId: string;
  username: string;
  betIndex: number;
  removedBet: Bet;
  totalBet: number;
  /** Only sent to the player who removed the bet */
  newBalance?: number;
}

export interface BetsClearedPayload {
  userId: string;
  username: string;
  /** Only sent to the player who cleared bets */
  newBalance?: number;
}

export interface BettingStartedPayload {
  roundId: string;
  phase: "betting";
  timeRemaining: number;
  triggeredBy: {
    userId: string;
    username: string;
  };
}

export interface WaitingForBetsPayload {
  roundId: string;
  phase: "waiting";
  message: string;
}

export interface RoundCountdownPayload {
  phase: RoundPhase;
  timeRemaining: number;
}

export interface SpinStartingPayload {
  roundId: string;
  phase: "spinning";
  /** Total bets from all players */
  totalBetsAllPlayers: number;
  /** Number of players with bets */
  playersWithBets: number;
}

export interface SpinResultPayload {
  roundId: string;
  phase: "results";
  spinResult: SpinResult;
  /** Results for all players */
  allPlayerResults: Array<{
    userId: string;
    username: string;
    totalBet: number;
    totalWin: number;
    netResult: number;
    winningBetsCount: number;
  }>;
  /** Your personal detailed result */
  yourResult?: {
    bets: Bet[];
    totalBet: number;
    totalWin: number;
    netResult: number;
    winningBets: Array<{ bet: Bet; payout: number }>;
    newBalance: number;
  };
  /** Time until next round */
  timeUntilNextRound: number;
}

export interface BalanceUpdatePayload {
  balance: number;
  reason:
    | "bet_placed"
    | "bet_removed"
    | "bets_cleared"
    | "win_credited"
    | "refund";
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload?:
    | RoomStatePayload
    | PlayerJoinedPayload
    | PlayerLeftPayload
    | PlayerLockedPayload
    | BetPlacedPayload
    | BetRemovedPayload
    | BetsClearedPayload
    | BettingStartedPayload
    | WaitingForBetsPayload
    | RoundCountdownPayload
    | SpinStartingPayload
    | SpinResultPayload
    | BalanceUpdatePayload
    | ErrorPayload;
  timestamp: number;
}

// ============================================================================
// WebSocket Connection Types
// ============================================================================

export interface AuthenticatedWebSocket {
  userId: string;
  username: string;
  roomId?: string;
  isAlive: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export const MULTIPLAYER_CONFIG = {
  /** Duration of betting phase in seconds (starts when first bet is placed) */
  BETTING_PHASE_DURATION: 30,
  /** Duration of spinning phase in seconds */
  SPINNING_PHASE_DURATION: 5,
  /** Duration of results phase in seconds */
  RESULTS_PHASE_DURATION: 20,
  /** Default room ID */
  DEFAULT_ROOM_ID: "main",
  /** Ping interval in milliseconds */
  PING_INTERVAL: 30000,
  /** Connection timeout in milliseconds */
  CONNECTION_TIMEOUT: 60000,
};
