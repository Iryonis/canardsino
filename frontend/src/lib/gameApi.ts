// Game Engine API types and functions

/**
 * Result of a roulette spin containing the winning number and its properties
 */
export interface SpinResult {
  winningNumber: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column?: number;
  dozen?: number;
}

/**
 * Complete game result including spin result, bets, and winnings
 */
export interface GameResult {
  spinResult: SpinResult;
  bets: any[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBets: Array<{
    bet: any;
    payout: number;
  }>;
  timestamp: number;
  source: string;
}

/**
 * Response from placing bets
 */
export interface PlaceBetsResponse {
  success: boolean;
  userId: string;
  bets: any[];
  totalAmount: number;
  message: string;
}

/**
 * Response from spinning the roulette wheel
 */
export interface SpinResponse {
  success: boolean;
  result: GameResult;
}

/**
 * Wallet balance information
 */
export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
}

/**
 * Roulette configuration from backend
 */
export interface RouletteConfig {
  redNumbers: number[];
  blackNumbers: number[];
  columns: {
    1: number[];
    2: number[];
    3: number[];
  };
  dozens: {
    1: number[];
    2: number[];
    3: number[];
  };
  payouts: {
    straight: number;
    split: number;
    street: number;
    corner: number;
    line: number;
    column: number;
    dozen: number;
    red: number;
    black: number;
    even: number;
    odd: number;
    low: number;
    high: number;
  };
}

const GAME_ENGINE_URL =
  process.env.NEXT_PUBLIC_GAME_ENGINE_URL || "http://localhost:8003/roulette";
const WALLET_URL =
  process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:8002/wallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

/**
 * Retrieves authentication token from localStorage
 * @returns The auth token or null if not found
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Generates headers with authentication token
 * @returns Headers object with Content-Type and Authorization
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ============================================
// ROULETTE API
// ============================================

/**
 * Simple bet format for frontend-backend communication
 */
export interface SimpleBet {
  type:
    | "number"
    | "red"
    | "black"
    | "even"
    | "odd"
    | "low"
    | "high"
    | "column"
    | "dozen";
  value: string | number;
  amount: number;
}

/**
 * Fetches the roulette configuration from the backend
 * @returns RouletteConfig object containing payouts, red/black numbers, etc.
 */
export async function getRouletteConfig(): Promise<RouletteConfig> {
  const response = await fetch(`${API_URL}/api/games/roulette/config`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch roulette config");
  }

  return response.json();
}

/**
 * Places simple bets for the current user
 * @param simpleBets - Array of simple bets to place
 * @returns Response indicating success or failure
 */
export async function placeSimpleBets(simpleBets: SimpleBet[]) {
  const response = await fetch(`${API_URL}/api/games/roulette/simple-bets`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ simpleBets }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to place bets");
  }

  return response.json();
}

/**
 * Spins the roulette wheel with the placed bets
 * @returns Spin response with game result
 */
export async function spinRoulette() {
  const response = await fetch(`${API_URL}/api/games/roulette/spin`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to spin roulette");
  }

  return response.json();
}

/**
 * Cancels all pending bets for the current user
 * @returns Response indicating success or failure
 */
export async function cancelRouletteBets() {
  const response = await fetch(`${API_URL}/api/games/roulette/bets`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel bets");
  }

  return response.json();
}

// ============================================
// BET VALIDATION API
// ============================================

/**
 * Response from bet validation
 */
export interface ValidateBetResponse {
  valid: boolean;
  error?: string;
  bet?: any;
  potentialPayout?: number;
  message?: string;
}

/**
 * Validates a single bet before placing it
 * @param type - Type of bet (red, black, even, etc.)
 * @param value - Value of the bet (e.g., column number)
 * @param amount - Bet amount in coins
 * @returns Validation response indicating if the bet is valid
 */
export async function validateSimpleBet(
  type: string,
  value: string | number,
  amount: number[]
): Promise<ValidateBetResponse> {
  const response = await fetch(`${API_URL}/api/games/roulette/validate-bet`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, value, amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to validate bet");
  }

  return response.json();
}

/**
 * Response containing potential payout calculations
 */
export interface PotentialPayoutResponse {
  valid?: boolean;
  error?: string;
  message?: string;
  totalBet?: number;
  potentialPayouts?: Array<{
    bet: any;
    payout: number;
    netWin: number;
  }>;
  maxPotentialWin?: number;
  minPotentialWin?: number;
}

/**
 * Calculates the potential payout for a list of bets
 * @param simpleBets - Array of bets to calculate payout for
 * @returns Potential payout information including max win
 */
export async function calculatePotentialPayout(
  simpleBets: SimpleBet[]
): Promise<PotentialPayoutResponse> {
  const response = await fetch(
    `${API_URL}/api/games/roulette/calculate-potential-payout`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ simpleBets }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to calculate potential payout");
  }

  return response.json();
}

// ============================================
// WALLET API (via game-engine mock)
// ============================================

/**
 * Fetches the wallet balance for the current user
 * @returns Wallet balance information
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const response = await fetch(`${API_URL}/api/games/roulette/balance`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get balance");
  }

  return response.json();
}

// ============================================
// GAMES LIST API
// ============================================

/**
 * Fetches the list of available games
 * @returns Array of available games
 */
export async function getAvailableGames() {
  const response = await fetch(`${API_URL}/api/games`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get games list");
  }

  return response.json();
}
