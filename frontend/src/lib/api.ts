// API client for CoinCoin Casino

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  tokens?: AuthTokens;
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
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refresh_token");
  },

  setTokens: (accessToken: string, refreshToken?: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
  },

  clearTokens: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
  },
};

// API client
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API methods
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const token = response.token || response.tokens?.accessToken;
    const refreshToken = response.refreshToken || response.tokens?.refreshToken;

    if (token) {
      tokenStorage.setTokens(token, refreshToken);
    }

    return response;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const token = response.token || response.tokens?.accessToken;
    const refreshToken = response.refreshToken || response.tokens?.refreshToken;

    if (token) {
      tokenStorage.setTokens(token, refreshToken);
    }

    return response;
  },

  getProfile: async (): Promise<User | null> => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      return await fetchApi<User>("/api/auth/profile");
    } catch (error) {
      tokenStorage.clearTokens();
      return null;
    }
  },

  logout: (): void => {
    tokenStorage.clearTokens();
  },
};
