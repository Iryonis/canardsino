// Game Engine API types and functions
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

export interface PlaceBetsResponse {
  success: boolean;
  userId: string;
  bets: any[];
  totalAmount: number;
  message: string;
}

export interface SpinResponse {
  success: boolean;
  result: GameResult;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
}

const GAME_ENGINE_URL =
  process.env.NEXT_PUBLIC_GAME_ENGINE_URL || "http://localhost:8003/roulette";
const WALLET_URL =
  process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:8002/wallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

// Récupérer le token depuis le localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

// Headers avec authentification
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

export interface ValidateBetResponse {
  valid: boolean;
  error?: string;
  bet?: any;
  potentialPayout?: number;
  message?: string;
}

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
