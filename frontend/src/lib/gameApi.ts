// Game Engine API types and functions

import { tokenManager } from "./tokenManager";

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
 * Bet placed in a game
 */
export interface PlacedBet {
  type: string;
  numbers?: number[];
  value?: string | number;
  amount: number;
}

/**
 * Complete game result including spin result, bets, and winnings
 */
export interface GameResult {
  spinResult: SpinResult;
  bets: PlacedBet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBets: Array<{
    bet: PlacedBet;
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
  bets: PlacedBet[];
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

/**
 * Game history entry from database
 */
export interface GameHistoryEntry {
  _id: string;
  userId: string;
  sessionId: string;
  gameType: string;
  bets: Array<{
    betType: string;
    numbers: number[];
    amount: number;
    payout: number;
    won: boolean;
    multiplier: number;
  }>;
  totalBet: number;
  totalWin: number;
  netResult: number;
  rouletteDetails: {
    winningNumber: number;
    color: string;
    parity: string;
    range: string;
    column?: number;
    dozen?: number;
    randomSource: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated game history response
 */
export interface GameHistoryResponse {
  history: GameHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

/**
 * Generates headers with authentication token
 * Automatically refreshes token if expired
 * @returns Headers object with Content-Type and Authorization
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  // Check if token is valid, if not refresh it
  if (!tokenManager.isAccessTokenValid()) {
    await tokenManager.refreshTokens();
  }

  const token = tokenManager.getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Wrapper for fetch that handles token refresh on 401 errors
 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get fresh headers
  const headers = await getAuthHeaders();

  // First attempt
  let response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // If we get a 401, try refreshing the token and retry once
  if (response.status === 401) {
    const refreshed = await tokenManager.refreshTokens();
    if (refreshed) {
      const newHeaders = await getAuthHeaders();
      response = await fetch(url, {
        ...options,
        headers: {
          ...newHeaders,
          ...options.headers,
        },
      });
    }
  }

  return response;
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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/config`,
    {
      method: "GET",
    }
  );

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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/simple-bets`,
    {
      method: "POST",
      body: JSON.stringify({ simpleBets }),
    }
  );

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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/spin`,
    {
      method: "POST",
    }
  );

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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/bets`,
    {
      method: "DELETE",
    }
  );

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
  bet?: PlacedBet;
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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/validate-bet`,
    {
      method: "POST",
      body: JSON.stringify({ type, value, amount }),
    }
  );

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
    bet: PlacedBet;
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
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/calculate-potential-payout`,
    {
      method: "POST",
      body: JSON.stringify({ simpleBets }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to calculate potential payout");
  }

  return response.json();
}

/**
 * Gets the user's game history from the database
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20)
 * @returns Paginated game history
 */
export async function getUserGameHistory(
  page: number = 1,
  limit: number = 20
): Promise<GameHistoryResponse> {
  const response = await authenticatedFetch(
    `${API_URL}/api/games/roulette/history?page=${page}&limit=${limit}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    // Read body as text first, then try to parse as JSON
    let errorMessage = "Failed to get game history";
    try {
      const text = await response.text();
      try {
        const error = JSON.parse(text);
        errorMessage = error.error || errorMessage;
      } catch {
        console.error("Non-JSON response:", text.substring(0, 200));
        errorMessage = `Server error: ${response.status}`;
      }
    } catch {
      errorMessage = `Server error: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================
// WALLET API (via wallet service)
// ============================================

/**
 * Fetches the wallet balance for the current user from the wallet service
 * @returns Wallet balance information
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const response = await authenticatedFetch(`${API_URL}/api/wallet/balance`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get balance");
  }

  const data = await response.json();
  return {
    ...data,
    currency: "CCC",
  };
}

// ============================================
// GAMES LIST API
// ============================================

/**
 * Fetches the list of available games
 * @returns Array of available games
 */
export async function getAvailableGames() {
  const response = await authenticatedFetch(`${API_URL}/api/games`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get games list");
  }

  return response.json();
}
