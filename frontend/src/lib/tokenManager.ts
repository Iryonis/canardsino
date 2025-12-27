// Token Manager - Handles automatic token refresh (proactive + reactive)

import { AuthTokens } from './api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const REFRESH_MARGIN_MS = 60 * 1000; // Refresh 1 minute before expiration

// Singleton state
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
let refreshPromise: Promise<AuthTokens | null> | null = null;
let onLogoutCallback: (() => void) | null = null;

// Decode JWT payload without verification (client-side only)
function decodeToken(token: string): { exp: number; userId: string; email: string; username: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

// Get time until token expires (in ms)
function getTimeUntilExpiry(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return 0;
  return decoded.exp * 1000 - Date.now();
}

// Storage helpers
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  scheduleRefresh(tokens.accessToken);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  cancelScheduledRefresh();
}

// API call to refresh tokens
async function callRefreshApi(refreshToken: string): Promise<AuthTokens> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Refresh failed');
  }

  return response.json();
}

// Refresh tokens - handles concurrent calls
async function refreshTokens(): Promise<AuthTokens | null> {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    handleLogout();
    return null;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const tokens = await callRefreshApi(currentRefreshToken);
      setTokens(tokens);
      return tokens;
    } catch {
      handleLogout();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Schedule proactive refresh before token expires
function scheduleRefresh(accessToken: string): void {
  cancelScheduledRefresh();

  const timeUntilExpiry = getTimeUntilExpiry(accessToken);
  const refreshIn = timeUntilExpiry - REFRESH_MARGIN_MS;

  if (refreshIn > 0) {
    refreshTimer = setTimeout(() => {
      refreshTokens();
    }, refreshIn);
  } else if (timeUntilExpiry > 0) {
    // Token expires soon but still valid, refresh immediately
    refreshTokens();
  }
}

function cancelScheduledRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// Handle logout (clear tokens and notify app)
function handleLogout(): void {
  clearTokens();
  if (onLogoutCallback) {
    onLogoutCallback();
  }
}

// Initialize token manager (call on app mount)
function initialize(onLogout: () => void): void {
  onLogoutCallback = onLogout;

  const accessToken = getAccessToken();
  if (accessToken) {
    const timeUntilExpiry = getTimeUntilExpiry(accessToken);
    if (timeUntilExpiry > 0) {
      scheduleRefresh(accessToken);
    } else {
      // Access token expired, try to refresh
      refreshTokens();
    }
  }
}

// Check if access token is valid (not expired)
function isAccessTokenValid(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return getTimeUntilExpiry(token) > 0;
}

export const tokenManager = {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  refreshTokens,
  initialize,
  isAccessTokenValid,
  decodeToken,
};
