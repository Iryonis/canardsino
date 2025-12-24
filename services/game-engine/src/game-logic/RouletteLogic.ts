import {
  EUROPEAN_ROULETTE_CONFIG,
  SpinResult,
  Bet,
  GameResult,
} from "../models/RouletteTypes";

/**
 * European Roulette game logic handler
 * Provides methods for validating bets, analyzing spin results, and calculating payouts
 */
export class RouletteLogic {
  /**
   * Analyzes a winning number and returns all its properties
   *
   * @param {number} number - The winning number (0-36)
   * @returns {SpinResult} Object containing color, parity, range, column, and dozen
   * @throws {Error} If number is outside the valid range (0-36)
   *
   * @example
   * const result = RouletteLogic.analyzeWinningNumber(17);
   * // Returns: { winningNumber: 17, color: 'black', parity: 'odd', range: 'low', column: 3, dozen: 2 }
   */
  static analyzeWinningNumber(number: number): SpinResult {
    if (number < 0 || number > 36) {
      throw new Error("Invalid roulette number. Must be between 0 and 36.");
    }

    const color =
      number === 0
        ? "green"
        : EUROPEAN_ROULETTE_CONFIG.RED_NUMBERS.includes(number)
        ? "red"
        : "black";

    const parity = number === 0 ? "zero" : number % 2 === 0 ? "even" : "odd";
    const range = number === 0 ? "zero" : number <= 18 ? "low" : "high";

    // Find the column (1, 2, or 3)
    let column: number | undefined;
    for (const [col, numbers] of Object.entries(
      EUROPEAN_ROULETTE_CONFIG.COLUMNS
    )) {
      if (numbers.includes(number)) {
        column = parseInt(col);
        break;
      }
    }

    // Find the dozen (1, 2, or 3)
    let dozen: number | undefined;
    for (const [doz, numbers] of Object.entries(
      EUROPEAN_ROULETTE_CONFIG.DOZENS
    )) {
      if (numbers.includes(number)) {
        dozen = parseInt(doz);
        break;
      }
    }

    return {
      winningNumber: number,
      color,
      parity,
      range,
      column,
      dozen,
    };
  }

  /**
   * Determines if a given bet wins based on the spin result
   *
   * @param {Bet} bet - The bet to check
   * @param {SpinResult} spinResult - The result of the spin
   * @returns {boolean} True if the bet wins, false otherwise
   *
   * @example
   * const bet = { type: 'red', numbers: [], amount: 10 };
   * const spin = { winningNumber: 7, color: 'red', ... };
   * RouletteLogic.isBetWinning(bet, spin); // Returns: true
   */
  static isBetWinning(bet: Bet, spinResult: SpinResult): boolean {
    const { winningNumber, color, parity, range, column, dozen } = spinResult;

    switch (bet.type) {
      case "straight":
      case "split":
      case "street":
      case "corner":
      case "line":
        // For number-based bets, check if winning number is in the bet's number list
        return bet.numbers.includes(winningNumber);

      case "red":
        return color === "red";

      case "black":
        return color === "black";

      case "even":
        return parity === "even";

      case "odd":
        return parity === "odd";

      case "low":
        return range === "low";

      case "high":
        return range === "high";

      case "column":
        return bet.numbers[0] === column;

      case "dozen":
        return bet.numbers[0] === dozen;

      default:
        return false;
    }
  }

  /**
   * Calculates the total payout for a winning bet (original stake + winnings)
   *
   * @param {Bet} bet - The winning bet
   * @returns {number} Total payout amount (stake + winnings)
   *
   * @example
   * const bet = { type: 'straight', numbers: [17], amount: 10 };
   * RouletteLogic.calculatePayout(bet); // Returns: 360 (10 + 10*35)
   */
  static calculatePayout(bet: Bet): number {
    const multiplier = EUROPEAN_ROULETTE_CONFIG.PAYOUTS[bet.type];
    return bet.amount + bet.amount * multiplier;
  }

  /**
   * Validates a bet to ensure it meets all requirements
   * Checks amount, number validity, and bet type constraints
   *
   * @param {Bet} bet - The bet to validate
   * @returns {{ valid: boolean; error?: string }} Validation result with optional error message
   *
   * @example
   * const bet = { type: 'straight', numbers: [17], amount: 10 };
   * RouletteLogic.validateBet(bet); // Returns: { valid: true }
   *
   * const badBet = { type: 'straight', numbers: [17, 18], amount: 10 };
   * RouletteLogic.validateBet(badBet); // Returns: { valid: false, error: '...' }
   */
  static validateBet(bet: Bet): { valid: boolean; error?: string } {
    // Check that amount is positive
    if (bet.amount <= 0) {
      return { valid: false, error: "Bet amount must be positive" };
    }

    // Check that all numbers are within valid range (0-36)
    for (const num of bet.numbers) {
      if (num < 0 || num > 36) {
        return { valid: false, error: `Invalid number: ${num}` };
      }
    }

    // Validate number count and constraints based on bet type
    switch (bet.type) {
      case "straight":
        if (bet.numbers.length !== 1) {
          return {
            valid: false,
            error: "Straight bet must have exactly 1 number",
          };
        }
        break;

      case "split":
        if (bet.numbers.length !== 2) {
          return {
            valid: false,
            error: "Split bet must have exactly 2 numbers",
          };
        }
        // Verify that numbers are adjacent on the table layout
        if (!this.areNumbersAdjacent(bet.numbers)) {
          return {
            valid: false,
            error: "Split bet numbers must be adjacent on the table",
          };
        }
        break;

      case "street":
        if (bet.numbers.length !== 3) {
          return {
            valid: false,
            error: "Street bet must have exactly 3 numbers",
          };
        }
        // Verify that numbers form a valid street (horizontal row)
        if (!this.isValidStreet(bet.numbers)) {
          return {
            valid: false,
            error:
              "Street bet numbers must form a valid horizontal ROW on the table",
          };
        }
        break;

      case "corner":
        if (bet.numbers.length !== 4) {
          return {
            valid: false,
            error: "Corner bet must have exactly 4 numbers",
          };
        }
        // Verify that numbers form a valid corner (2x2 square)
        if (!this.isValidCorner(bet.numbers)) {
          return {
            valid: false,
            error:
              "Corner bet numbers must form a valid 2x2 square on the table",
          };
        }
        break;

      case "line":
        if (bet.numbers.length !== 6) {
          return {
            valid: false,
            error: "Line bet must have exactly 6 numbers",
          };
        }
        // Verify that numbers form a valid line (two adjacent rows)
        if (!this.isValidLine(bet.numbers)) {
          return {
            valid: false,
            error:
              "Line bet numbers must form two ADJACENT horizontal ROWS on the table",
          };
        }
        break;

      case "column":
      case "dozen":
        if (
          bet.numbers.length !== 1 ||
          bet.numbers[0] < 1 ||
          bet.numbers[0] > 3
        ) {
          return {
            valid: false,
            error: `${bet.type} bet must specify column/dozen 1, 2, or 3`,
          };
        }
        break;

      case "red":
      case "black":
      case "even":
      case "odd":
      case "low":
      case "high":
        if (bet.numbers.length !== 0) {
          return {
            valid: false,
            error: `${bet.type} bet should not specify numbers`,
          };
        }
        break;

      default:
        return { valid: false, error: `Unknown bet type: ${bet.type}` };
    }

    return { valid: true };
  }

  /**
   * Checks if two numbers are adjacent on the roulette table layout
   * Numbers are adjacent if they differ by 1 (horizontal) or 3 (vertical)
   *
   * @private
   * @param {number[]} numbers - Array of exactly 2 numbers to check
   * @returns {boolean} True if numbers are adjacent, false otherwise
   *
   * @example
   * RouletteLogic.areNumbersAdjacent([1, 2]); // Returns: true (horizontal)
   * RouletteLogic.areNumbersAdjacent([1, 4]); // Returns: true (vertical)
   * RouletteLogic.areNumbersAdjacent([1, 5]); // Returns: false
   */
  private static areNumbersAdjacent(numbers: number[]): boolean {
    if (numbers.length !== 2) return false;

    const [a, b] = numbers.sort((x, y) => x - y);

    // Horizontal adjacency (same row, difference of 1)
    if (b - a === 1 && Math.floor((a - 1) / 3) === Math.floor((b - 1) / 3)) {
      return true;
    }

    // Vertical adjacency (difference of 3)
    if (b - a === 3) {
      return true;
    }

    return false;
  }

  /**
   * Checks if three numbers form a valid street (horizontal row)
   * A street covers three consecutive numbers in a horizontal row
   *
   * @private
   * @param {number[]} numbers - Array of exactly 3 numbers to check
   * @returns {boolean} True if numbers form a valid street, false otherwise
   *
   * @example
   * RouletteLogic.isValidStreet([1, 2, 3]); // Returns: true
   * RouletteLogic.isValidStreet([1, 2, 4]); // Returns: false
   */
  private static isValidStreet(numbers: number[]): boolean {
    if (numbers.length !== 3) return false;

    const sorted = [...numbers].sort((a, b) => a - b);
    const [a, b, c] = sorted;

    // Check if numbers are consecutive
    if (b !== a + 1 || c !== b + 1) return false;

    // Check if all three numbers are in the same row
    // In roulette, numbers 1-3 are row 1, 4-6 are row 2, etc.
    const rowA = Math.floor((a - 1) / 3);
    const rowB = Math.floor((b - 1) / 3);
    const rowC = Math.floor((c - 1) / 3);

    return rowA === rowB && rowB === rowC;
  }

  /**
   * Checks if four numbers form a valid corner (2x2 square)
   * A corner covers four numbers that meet at a corner
   *
   * @private
   * @param {number[]} numbers - Array of exactly 4 numbers to check
   * @returns {boolean} True if numbers form a valid corner, false otherwise
   *
   * @example
   * RouletteLogic.isValidCorner([1, 2, 4, 5]); // Returns: true
   * RouletteLogic.isValidCorner([1, 2, 3, 4]); // Returns: false
   */
  private static isValidCorner(numbers: number[]): boolean {
    if (numbers.length !== 4) return false;

    const sorted = [...numbers].sort((a, b) => a - b);
    const [a, b, c, d] = sorted;

    // Valid corner patterns:
    // a, a+1, a+3, a+4 (if a and a+1 are in the same row)
    if (b === a + 1 && c === a + 3 && d === a + 4) {
      // Check if a and a+1 are in the same row
      const rowA = Math.floor((a - 1) / 3);
      const rowB = Math.floor((b - 1) / 3);
      return rowA === rowB;
    }

    return false;
  }

  /**
   * Checks if six numbers form a valid line (two adjacent horizontal rows)
   * A line covers two adjacent streets (six numbers in two rows)
   *
   * @private
   * @param {number[]} numbers - Array of exactly 6 numbers to check
   * @returns {boolean} True if numbers form a valid line, false otherwise
   *
   * @example
   * RouletteLogic.isValidLine([1, 2, 3, 4, 5, 6]); // Returns: true
   * RouletteLogic.isValidLine([1, 2, 3, 7, 8, 9]); // Returns: false
   */
  private static isValidLine(numbers: number[]): boolean {
    if (numbers.length !== 6) return false;

    const sorted = [...numbers].sort((a, b) => a - b);

    // Check if first three numbers form a street
    const firstThree = sorted.slice(0, 3);
    if (!this.isValidStreet(firstThree)) return false;

    // Check if last three numbers form a street
    const lastThree = sorted.slice(3, 6);
    if (!this.isValidStreet(lastThree)) return false;

    // Check if the two streets are adjacent (differ by 3)
    return sorted[3] === sorted[0] + 3;
  }

  /**
   * Calculates the complete game result for a spin including all winning bets and payouts
   * This is the main function that ties together all the game logic
   *
   * @param {Bet[]} bets - Array of all bets placed by the player
   * @param {number} winningNumber - The number the ball landed on (0-36)
   * @param {string} [source='random.org'] - Source of the random number (for tracking)
   * @returns {GameResult} Complete result including spin details, wins, losses, and net result
   *
   * @example
   * const bets = [
   *   { type: 'red', numbers: [], amount: 10 },
   *   { type: 'straight', numbers: [17], amount: 5 }
   * ];
   * const result = RouletteLogic.calculateGameResult(bets, 17, 'mock');
   * // Returns: {
   * //   spinResult: { winningNumber: 17, color: 'black', ... },
   * //   totalBet: 15,
   * //   totalWin: 180, // 5 * (35 + 1) = 180
   * //   netResult: 165,
   * //   winningBets: [{ bet: {...}, payout: 180 }],
   * //   ...
   * // }
   */
  static calculateGameResult(
    bets: Bet[],
    winningNumber: number,
    source: string = "random.org"
  ): GameResult {
    const spinResult = this.analyzeWinningNumber(winningNumber);
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);

    const winningBets: Array<{ bet: Bet; payout: number }> = [];
    let totalWin = 0;

    // Check each bet to see if it won
    for (const bet of bets) {
      if (this.isBetWinning(bet, spinResult)) {
        const payout = this.calculatePayout(bet);
        winningBets.push({ bet, payout });
        totalWin += payout;
      }
    }

    return {
      spinResult,
      bets,
      totalBet,
      totalWin,
      netResult: totalWin - totalBet,
      winningBets,
      timestamp: Date.now(),
      source,
    };
  }

  /**
   * Creates a standardized Bet object from simplified user input
   * Converts user-friendly bet types (like "red", "number") into the internal Bet format
   *
   * @param {string} type - Simplified bet type (e.g., 'number', 'red', 'even')
   * @param {string | number} value - Value for the bet (number for straight bets, column/dozen number)
   * @param {number} amount - Amount to bet
   * @returns {Bet} Standardized bet object
   * @throws {Error} If bet type is unknown
   *
   * @example
   * RouletteLogic.createSimpleBet('number', 17, 10);
   * // Returns: { type: 'straight', numbers: [17], amount: 10 }
   *
   * RouletteLogic.createSimpleBet('red', '', 10);
   * // Returns: { type: 'red', numbers: [], amount: 10 }
   */
  static createSimpleBet(
    type: string,
    value: string | number,
    amount: number
  ): Bet {
    switch (type) {
      case "number":
        return {
          type: "straight",
          numbers: [typeof value === "string" ? parseInt(value) : value],
          amount,
        };

      case "red":
        return { type: "red", numbers: [], amount };

      case "black":
        return { type: "black", numbers: [], amount };

      case "even":
        return { type: "even", numbers: [], amount };

      case "odd":
        return { type: "odd", numbers: [], amount };

      case "low":
        return { type: "low", numbers: [], amount };

      case "high":
        return { type: "high", numbers: [], amount };

      case "column":
        return {
          type: "column",
          numbers: [typeof value === "string" ? parseInt(value) : value],
          amount,
        };

      case "dozen":
        return {
          type: "dozen",
          numbers: [typeof value === "string" ? parseInt(value) : value],
          amount,
        };

      default:
        throw new Error(`Unknown simple bet type: ${type}`);
    }
  }
}
