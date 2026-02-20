import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  coins: number;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  apiCall: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (resp.ok) {
          const fresh = await resp.json();
          setUser(fresh);
          await AsyncStorage.setItem('auth_user', JSON.stringify(fresh));
        } else {
          await clearAuth();
        }
      }
    } catch (e) {
      console.error('Auth load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem('auth_token', authToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {}
    }
    await clearAuth();
  };

  const clearAuth = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      AsyncStorage.setItem('auth_user', JSON.stringify(updated));
    }
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };
    return fetch(`${BACKEND_URL}${url}`, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, apiCall }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
