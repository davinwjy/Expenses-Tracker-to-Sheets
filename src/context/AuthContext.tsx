import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getAuthToken, removeAuthToken } from '../lib/api';
import { isFirebaseActive } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebase: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFirebase = isFirebaseActive();

  useEffect(() => {
    // 1. If Firebase is active, listen to Firebase Auth
    if (isFirebase) {
      const unsub = firestoreService.onAuthChanged((fbUser) => {
        setUser(fbUser);
        setIsLoading(false);
      });
      return () => unsub();
    }

    // 2. Otherwise use local / server auth token
    async function loadUser() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user } = await api.getCurrentUser();
        setUser(user);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        removeAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [isFirebase]);

  const login = async (email: string, password: string) => {
    if (isFirebase) {
      const u = await firestoreService.login(email, password);
      setUser(u);
      return;
    }

    const res = await api.login(email, password);
    setUser(res.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    if (isFirebase) {
      const u = await firestoreService.register(email, password, name);
      setUser(u);
      return;
    }

    const res = await api.register(email, password, name);
    setUser(res.user);
  };

  const logout = () => {
    if (isFirebase) {
      firestoreService.logout();
      setUser(null);
      return;
    }

    removeAuthToken();
    setUser(null);
  };

  const quickDemoLogin = async () => {
    const demoEmail = 'davin@wealthtrack.app';
    const demoPassword = 'password123';
    try {
      await login(demoEmail, demoPassword);
    } catch {
      // If demo user doesn't exist yet, register it
      await register(demoEmail, demoPassword, 'Davin Wijaya');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isFirebase,
        login,
        register,
        logout,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
