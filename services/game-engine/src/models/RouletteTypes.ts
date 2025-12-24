/**
 * Roulette Types - European roulette rules
 */

export type BetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "column"
  | "dozen"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

export interface Bet {
  type: BetType;
  numbers: number[]; // Numbers being bet on
  amount: number;
}

export interface PlaceBetRequest {
  userId: string;
  bets: Bet[];
}

export interface SpinResult {
  winningNumber: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column?: number;
  dozen?: number;
}

export interface GameResult {
  spinResult: SpinResult;
  bets: Bet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBets: Array<{
    bet: Bet;
    payout: number;
  }>;
  timestamp: number;
  source: string;
}

export interface RouletteSession {
  userId: string;
  bets: Bet[];
  createdAt: number;
}

/**
 * European roulette configuration
 */
export const EUROPEAN_ROULETTE_CONFIG = {
  // Red numbers on European roulette
  RED_NUMBERS: [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ],

  // Black numbers (all others except 0)
  BLACK_NUMBERS: [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ],

  // Columns
  COLUMNS: {
    1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  },

  // Dozens
  DOZENS: {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  },

  // Multipliers by bet type
  PAYOUTS: {
    straight: 35, // Straight (1 number)
    split: 17, // Split (2 numbers)
    street: 11, // Street (3 numbers)
    corner: 8, // Corner (4 numbers)
    line: 5, // Line (6 numbers)
    column: 2, // Column (12 numbers)
    dozen: 2, // Dozen (12 numbers)
    red: 1, // Red (18 numbers)
    black: 1, // Black (18 numbers)
    even: 1, // Even (18 numbers)
    odd: 1, // Odd (18 numbers)
    low: 1, // Low 1-18 (18 numbers)
    high: 1, // High 19-36 (18 numbers)
  },
};
