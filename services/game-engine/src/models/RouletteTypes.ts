/**
 * Roulette Types - European roulette rules and configuration
 * @module RouletteTypes
 */

/**
 * Available bet types in European roulette
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

/**
 * Represents a single roulette bet
 */
export interface Bet {
  /** Type of bet being placed */
  type: BetType;
  /** Numbers being bet on (empty for simple bets like red/black) */
  numbers: number[];
  /** Amount being wagered in coins */
  amount: number;
}

/**
 * Request payload for placing bets
 */
export interface PlaceBetRequest {
  /** User ID placing the bet */
  userId: string;
  /** Array of bets to place */
  bets: Bet[];
}

/**
 * Result of a roulette spin
 */
export interface SpinResult {
  /** The winning number (0-36) */
  winningNumber: number;
  /** Color of the winning number */
  color: "red" | "black" | "green";
  /** Parity of the winning number */
  parity: "even" | "odd" | "zero";
  /** Range classification of the winning number */
  range: "low" | "high" | "zero";
  /** Column number (1-3) if applicable */
  column?: number;
  /** Dozen number (1-3) if applicable */
  dozen?: number;
}

/**
 * Complete game result including all bets and payouts
 */
export interface GameResult {
  /** Spin result details */
  spinResult: SpinResult;
  /** All bets placed in this game */
  bets: Bet[];
  /** Total amount wagered */
  totalBet: number;
  /** Total amount won */
  totalWin: number;
  /** Net result (totalWin - totalBet) */
  netResult: number;
  /** Details of winning bets */
  winningBets: Array<{
    /** The bet that won */
    bet: Bet;
    /** Payout for this bet */
    payout: number;
  }>;
  /** Timestamp of the game */
  timestamp: number;
  /** Source of randomness (e.g., "random.org", "Math.random") */
  source: string;
}

/**
 * User's roulette session containing active bets
 */
export interface RouletteSession {
  /** User ID for this session */
  userId: string;
  /** Active bets in this session */
  bets: Bet[];
  /** Session creation timestamp */
  createdAt: number;
}

/**
 * European roulette configuration constants
 * Contains all the rules and payouts for European roulette
 */
export const EUROPEAN_ROULETTE_CONFIG = {
  /**
   * Red numbers on European roulette wheel
   */
  RED_NUMBERS: [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ],

  /**
   * Black numbers on European roulette wheel (all numbers except 0 and reds)
   */
  BLACK_NUMBERS: [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ],

  /**
   * Column configurations (12 numbers each)
   */
  COLUMNS: {
    1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  },

  /**
   * Dozen configurations (12 numbers each)
   */
  DOZENS: {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  },

  /**
   * Payout multipliers by bet type
   * Note: Payout includes the original bet (e.g., 36 means 35:1 plus original bet)
   */
  PAYOUTS: {
    /** Straight up bet on single number - 35:1 */
    straight: 36,
    /** Split bet on two adjacent numbers - 17:1 */
    split: 18,
    /** Street bet on three numbers in a row - 11:1 */
    street: 12,
    /** Corner bet on four numbers in a square - 8:1 */
    corner: 8,
    /** Line bet on six numbers (two adjacent streets) - 5:1 */
    line: 5,
    /** Column bet on 12 numbers - 2:1 */
    column: 3,
    /** Dozen bet on 12 numbers - 2:1 */
    dozen: 3,
    /** Red color bet on 18 numbers - 1:1 */
    red: 2,
    /** Black color bet on 18 numbers - 1:1 */
    black: 2,
    /** Even number bet on 18 numbers - 1:1 */
    even: 2,
    /** Odd number bet on 18 numbers - 1:1 */
    odd: 2,
    /** Low range bet (1-18) - 1:1 */
    low: 2,
    /** High range bet (19-36) - 1:1 */
    high: 2,
  },
};
