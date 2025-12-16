// API client for CoinCoin Casino

import { AuthError, NetworkError, NotFoundError, ServerError, ValidationError, ApiError } from './apiErrors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },

  setTokens: (tokens: AuthTokens): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// API client
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Throw specific error types based on status code
      switch (response.status) {
        case 401:
          throw new AuthError(error.error || 'Authentication failed');
        case 400:
        case 422:
          throw new ValidationError(error.error || 'Validation failed');
        case 404:
          throw new NotFoundError(error.error || 'Resource not found');
        case 500:
        case 502:
        case 503:
          throw new ServerError(error.error || 'Server error');
        default:
          throw new ApiError(
            error.error || 'Request failed',
            response.status,
            `HTTP_${response.status}`
          );
      }
    }

    return response.json();
  } catch (err) {
    // Re-throw if it's already one of our custom errors
    if (err instanceof ApiError) {
      throw err;
    }
    
    // Otherwise it's a network error
    throw new NetworkError(err instanceof Error ? err.message : 'Network error occurred');
  }
}

// Auth API methods
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    tokenStorage.setTokens(response.tokens);
    return response;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    tokenStorage.setTokens(response.tokens);
    return response;
  },

  getProfile: async (): Promise<User> => {
    return fetchApi<User>('/api/auth/profile');
  },

  logout: (): void => {
    tokenStorage.clearTokens();
  },
};
