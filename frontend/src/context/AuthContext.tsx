import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSysAdmin: boolean;
  isLeadMentor: boolean;
  isMentor: boolean;
  isIntern: boolean;
  canViewAllGroups: boolean;
  canEditGroup: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: authApi.RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Verify token validity by calling /auth/me
    authApi
      .getMe()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      })
      .catch(() => {
        // Token expired or invalid
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const register = async (data: authApi.RegisterData) => {
    const res = await authApi.register(data);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;
  const isSysAdmin = user?.role === 'SYSADMIN';
  const isLeadMentor = user?.role === 'LEAD_MENTOR';
  const isMentor = user?.role === 'MENTOR';
  const isIntern = user?.role === 'INTERN';
  const canViewAllGroups = isSysAdmin || isLeadMentor;
  const canEditGroup = user ? user.role !== 'INTERN' : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isSysAdmin,
        isLeadMentor,
        isMentor,
        isIntern,
        canViewAllGroups,
        canEditGroup,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
