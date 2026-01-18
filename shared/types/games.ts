// Shared types for game-related data structures

/**
 * Individual bet within a game round
 */
export interface IGameBet {
  betType: string;
  numbers?: number[];
  amount: number;
  payout: number;
  won: boolean;
  multiplier: number;
}

/**
 * Roulette-specific game details
 */
export interface IRouletteDetails {
  winningNumber: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column?: number;
  dozen?: number;
  randomSource: string;
}

/**
 * Supported game types
 */
export type GameType = "roulette" | "duck-race";

/**
 * Base game history interface (without Document)
 */
export interface IGameHistoryBase {
  userId: string;
  sessionId: string;
  gameType: GameType;
  bets: IGameBet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  rouletteDetails?: IRouletteDetails;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Game history for API responses and data transfer
 */
export interface GameHistoryDTO extends IGameHistoryBase {
  id?: string;
  _id?: string;
}