// API client for CoinCoin Casino

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

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  return response.json();
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
