import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/client';

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  isTenant: boolean;
  userName: string;
  userEmail: string;
  tenantId: string;
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
  userName: '',
  userEmail: '',
  tenantId: '',
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
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    const admin = localStorage.getItem('is_admin') === 'true';
    const tenant = localStorage.getItem('is_tenant') === 'true';
    if (stored && !isTokenExpired(stored)) {
      setToken(stored);
      setIsAdmin(admin);
      setIsTenant(tenant);
      setUserName(localStorage.getItem('user_name') || '');
      setUserEmail(localStorage.getItem('user_email') || '');
      setTenantId(localStorage.getItem('tenant_id') || '');
    } else if (stored) {
      // Token expired — clean up
      localStorage.removeItem('access_token');
      localStorage.removeItem('is_admin');
      localStorage.removeItem('is_tenant');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('tenant_id');
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    const { access_token, is_admin, name: respName, email: respEmail, tenant_id: respTenantId } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', String(is_admin));
    localStorage.setItem('is_tenant', 'false');
    localStorage.setItem('user_name', respName || '');
    localStorage.setItem('user_email', respEmail || '');
    localStorage.setItem('tenant_id', respTenantId || '');
    setToken(access_token);
    setIsAdmin(is_admin || false);
    setIsTenant(false);
    setUserName(respName || '');
    setUserEmail(respEmail || '');
    setTenantId(respTenantId || '');
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, verificationCode: string, company?: string) => {
    const res = await authAPI.register(name, email, password, verificationCode, company);
    const { access_token, is_admin, name: respName, email: respEmail, tenant_id: respTenantId } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', 'false');
    localStorage.setItem('is_tenant', 'true');
    localStorage.setItem('user_name', respName || name);
    localStorage.setItem('user_email', respEmail || email);
    localStorage.setItem('tenant_id', respTenantId || '');
    setToken(access_token);
    setIsAdmin(false);
    setIsTenant(!is_admin);
    setUserName(respName || name);
    setUserEmail(respEmail || email);
    setTenantId(respTenantId || '');
  }, []);

  const tenantLogin = useCallback(async (email: string, password: string) => {
    const res = await authAPI.tenantLogin(email, password);
    const { access_token, is_admin, name: respName, email: respEmail, tenant_id: respTenantId } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('is_admin', 'false');
    localStorage.setItem('is_tenant', 'true');
    localStorage.setItem('user_name', respName || '');
    localStorage.setItem('user_email', respEmail || email);
    localStorage.setItem('tenant_id', respTenantId || '');
    setToken(access_token);
    setIsAdmin(false);
    setIsTenant(!is_admin);
    setUserName(respName || '');
    setUserEmail(respEmail || email);
    setTenantId(respTenantId || '');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('is_tenant');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('tenant_id');
    setToken(null);
    setIsAdmin(false);
    setIsTenant(false);
    setUserName('');
    setUserEmail('');
    setTenantId('');
    // Force redirect to login to clear any stale UI state
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAdmin, isTenant, userName, userEmail, tenantId, login, register, tenantLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
