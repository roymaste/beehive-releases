import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/client';

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  isTenant: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, verificationCode: string, company?: string) => Promise<void>;
  tenantLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAdmin: false,
  isTenant: false,
  login: async () => {},
  register: async () => {},
  tenantLogin: async () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTenant, setIsTenant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    const admin = localStorage.getItem('is_admin') === 'true';
    const tenant = localStorage.getItem('is_tenant') === 'true';
    if (stored) {
      setToken(stored);
      setIsAdmin(admin);
      setIsTenant(tenant);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    const { access_token, is_admin } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', String(is_admin));
    localStorage.setItem('is_tenant', 'false');
    setToken(access_token);
    setIsAdmin(is_admin || false);
    setIsTenant(false);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, verificationCode: string, company?: string) => {
    const res = await authAPI.register(name, email, password, verificationCode, company);
    const { access_token, is_admin } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', 'false');
    localStorage.setItem('is_tenant', 'true');
    setToken(access_token);
    setIsAdmin(false);
    setIsTenant(!is_admin);
  }, []);

  const tenantLogin = useCallback(async (email: string, password: string) => {
    const res = await authAPI.tenantLogin(email, password);
    const { access_token, is_admin } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', 'false');
    localStorage.setItem('is_tenant', 'true');
    setToken(access_token);
    setIsAdmin(false);
    setIsTenant(!is_admin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('is_tenant');
    setToken(null);
    setIsAdmin(false);
    setIsTenant(false);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAdmin, isTenant, login, register, tenantLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
