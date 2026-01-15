/**
 * WebSocket Types for Duck Race Game
 * Multiplayer duck racing where players bet and race to the finish line
 */

// ============================================================================
// Game Configuration
// ============================================================================

export const DUCK_RACE_CONFIG = {
  /** Minimum players required to start a race */
  MIN_PLAYERS: 1,
  /** Maximum players allowed in a race */
  MAX_PLAYERS: 5,
  /** Minimum bet amount in CCC */
  MIN_BET: 2000,
  /** Track length (finish line position) */
  TRACK_LENGTH: 100,
  /** Maximum time waiting for players in seconds */
  WAITING_TIMEOUT: 60,
  /** Time for all players to place bets after first bet */
  BETTING_DURATION: 15,
  /** Countdown before race starts in seconds */
  COUNTDOWN_DURATION: 3,
  /** Interval between position updates in ms */
  TICK_INTERVAL: 500,
  /** Minimum advance per tick */
  RANDOM_MIN: 1,
  /** Maximum advance per tick */
  RANDOM_MAX: 10,
  /** Time to show results before resetting */
  RESULTS_DURATION: 8,
  /** Default room ID */
  DEFAULT_ROOM_ID: "duck-race-main",
};

// ============================================================================
// Game State Types
// ============================================================================

export type DuckRacePhase =
  | "waiting"    // Waiting for players to join
  | "betting"    // Players are placing bets
  | "countdown"  // Race is about to start
  | "racing"     // Race in progress
  | "finished";  // Race complete, showing results

export interface DuckPlayer {
  /** User ID */
  userId: string;
  /** Display name */
  username: string;
  /** When the player joined */
  joinedAt: number;
  /** Player's bet amount (same for all players in a race) */
  betAmount: number;
  /** Whether player has placed their bet */
  hasBet: boolean;
  /** Current position on track (0-100) */
  position: number;
  /** Lane number (1-5) */
  lane: number;
  /** Whether player is connected */
  isConnected: boolean;
  /** Duck color for visual distinction */
  color: DuckColor;
}

export type DuckColor = "yellow" | "orange" | "blue" | "green" | "pink";

export const DUCK_COLORS: DuckColor[] = ["yellow", "orange", "blue", "green", "pink"];

export interface DuckRaceRound {
  /** Unique round identifier */
  roundId: string;
  /** Room this round belongs to */
  roomId: string;
  /** Current phase of the race */
  phase: DuckRacePhase;
  /** Players in this race */
  players: Map<string, DuckPlayer>;
  /** Bet amount for this race (set by first player) */
  betAmount: number;
  /** Seconds remaining in current phase */
  timeRemaining: number;
  /** Total pot (sum of all bets) */
  totalPot: number;
  /** Winner user ID (set when race finishes) */
  winnerId?: string;
  /** Winner username */
  winnerUsername?: string;
  /** Race history - position snapshots for replay */
  raceHistory: RaceSnapshot[];
}

export interface RaceSnapshot {
  /** Timestamp of snapshot */
  timestamp: number;
  /** Positions at this point */
  positions: Array<{
    userId: string;
    position: number;
  }>;
}

// ============================================================================
// Client -> Server Messages
// ============================================================================

export type DuckRaceClientMessageType =
  | "JOIN_RACE"
  | "LEAVE_RACE"
  | "PLACE_BET"
  | "PING";

export interface JoinRacePayload {
  roomId?: string;
}

export interface LeaveRacePayload {
  roomId?: string;
}

export interface PlaceDuckBetPayload {
  /** Bet amount in CCC */
  amount: number;
}

export interface DuckRaceClientMessage {
  type: DuckRaceClientMessageType;
  payload?: JoinRacePayload | LeaveRacePayload | PlaceDuckBetPayload;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

export type DuckRaceServerMessageType =
  | "RACE_STATE"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "BET_PLACED"
  | "BETTING_STARTED"
  | "COUNTDOWN_TICK"
  | "RACE_STARTED"
  | "RACE_UPDATE"
  | "RACE_FINISHED"
  | "WAITING_FOR_PLAYERS"
  | "BALANCE_UPDATE"
  | "ERROR"
  | "PONG";

// Full race state sent on join
export interface RaceStatePayload {
  roomId: string;
  roundId: string;
  phase: DuckRacePhase;
  timeRemaining: number;
  betAmount: number;
  totalPot: number;
  players: Array<{
    userId: string;
    username: string;
    hasBet: boolean;
    position: number;
    lane: number;
    color: DuckColor;
    isConnected: boolean;
  }>;
  /** Your current balance */
  yourBalance: number;
  /** Your bet status */
  yourHasBet: boolean;
  /** Your lane number (if joined) */
  yourLane?: number;
}

export interface DuckPlayerJoinedPayload {
  userId: string;
  username: string;
  lane: number;
  color: DuckColor;
  playerCount: number;
}

export interface DuckPlayerLeftPayload {
  userId: string;
  username: string;
  playerCount: number;
  /** If the leaving player had bet, refund info */
  refunded?: boolean;
}

export interface DuckBetPlacedPayload {
  userId: string;
  username: string;
  betAmount: number;
  totalPot: number;
  playersWithBets: number;
  /** Only sent to the player who placed the bet */
  newBalance?: number;
}

export interface DuckBettingStartedPayload {
  roundId: string;
  phase: "betting";
  betAmount: number;
  timeRemaining: number;
  triggeredBy: {
    userId: string;
    username: string;
  };
}

export interface CountdownTickPayload {
  phase: "countdown";
  timeRemaining: number;
}

export interface RaceStartedPayload {
  roundId: string;
  phase: "racing";
  totalPot: number;
  players: Array<{
    userId: string;
    username: string;
    lane: number;
    color: DuckColor;
  }>;
}

export interface RaceUpdatePayload {
  /** Current positions of all ducks */
  positions: Array<{
    userId: string;
    position: number;
    advance: number; // How much they advanced this tick
  }>;
  /** Leader user ID */
  leaderId: string;
}

export interface RaceFinishedPayload {
  roundId: string;
  phase: "finished";
  winner: {
    userId: string;
    username: string;
    lane: number;
    color: DuckColor;
    winnings: number;
  };
  finalPositions: Array<{
    userId: string;
    username: string;
    position: number;
    lane: number;
    rank: number;
  }>;
  totalPot: number;
  /** Your personal result */
  yourResult?: {
    rank: number;
    betAmount: number;
    winnings: number;
    netResult: number;
    newBalance: number;
  };
  timeUntilNextRace: number;
}

export interface WaitingForPlayersPayload {
  roundId: string;
  phase: "waiting";
  playerCount: number;
  minPlayers: number;
  message: string;
}

export interface DuckBalanceUpdatePayload {
  balance: number;
  reason: "bet_placed" | "win_credited" | "refund";
}

export interface DuckErrorPayload {
  code: string;
  message: string;
}

export interface DuckRaceServerMessage {
  type: DuckRaceServerMessageType;
  payload?:
    | RaceStatePayload
    | DuckPlayerJoinedPayload
    | DuckPlayerLeftPayload
    | DuckBetPlacedPayload
    | DuckBettingStartedPayload
    | CountdownTickPayload
    | RaceStartedPayload
    | RaceUpdatePayload
    | RaceFinishedPayload
    | WaitingForPlayersPayload
    | DuckBalanceUpdatePayload
    | DuckErrorPayload;
  timestamp: number;
}

// ============================================================================
// WebSocket Connection Types
// ============================================================================

export interface DuckRaceAuthenticatedWebSocket {
  userId: string;
  username: string;
  roomId?: string;
  isAlive: boolean;
  gameType: "duck-race";
}
