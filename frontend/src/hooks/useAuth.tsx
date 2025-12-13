'use client';

import { useState, useEffect } from 'react';
import { authApi, User, LoginRequest, RegisterRequest } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        const user = await authApi.getProfile();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    setAuthState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    setAuthState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  };

  const logout = () => {
    authApi.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return {
    ...authState,
    login,
    register,
    logout,
  };
}
