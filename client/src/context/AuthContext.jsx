import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService.js';
import adminService from '../services/adminService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      let current = null;
      try {
        current = await authService.me();
      } catch {
        current = null;
      }
      if (!current) {
        try {
          current = await adminService.me();
        } catch {
          current = null;
        }
      }
      if (!active) return;
      setUser(current);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const loginAdmin = useCallback(async (credentials) => {
    const data = await adminService.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback((payload) => authService.register(payload), []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      await adminService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authService.me();
      setUser(u);
      return u;
    } catch {
      try {
        const admin = await adminService.me();
        setUser(admin);
        return admin;
      } catch {
        setUser(null);
        return null;
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isVerified: Boolean(user?.emailVerified),
      login,
      loginAdmin,
      register,
      logout,
      logoutAdmin,
      refreshUser,
      setUser,
    }),
    [user, loading, login, loginAdmin, register, logout, logoutAdmin, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
