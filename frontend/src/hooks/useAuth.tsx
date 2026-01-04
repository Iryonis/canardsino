"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User, LoginRequest, RegisterRequest, AuthResponse } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    authApi.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    // Initialize token manager with logout callback
    tokenManager.initialize(logout);

    // Check if user is authenticated on mount
    const checkAuth = async () => {
      const token = tokenStorage.getAccessToken();

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const user = await authApi.getProfile();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, [logout]);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await authApi.login(data);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await authApi.register(data);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
