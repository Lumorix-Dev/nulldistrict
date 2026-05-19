import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { AuthResponse, PublicUser } from "@nulldistrict/shared";
import { api } from "../api/client";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (auth: AuthResponse) => void;
  refreshSession: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ACCESS_KEY = "nulldistrict.accessToken";
const REFRESH_KEY = "nulldistrict.refreshToken";
const USER_KEY = "nulldistrict.user";

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_KEY));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_KEY));
  const [user, setUser] = useState<PublicUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as PublicUser) : null;
  });

  const setAuth = useCallback((auth: AuthResponse) => {
    localStorage.setItem(ACCESS_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    setAccessToken(auth.accessToken);
    setRefreshToken(auth.refreshToken);
    setUser(auth.user);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setAuth(await api.login({ identifier, password }));
    },
    [setAuth]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setAuth(await api.register({ username, email, password }));
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, [refreshToken]);

  const refreshSession = useCallback(async () => {
    if (!refreshToken) return;
    setAuth(await api.refresh(refreshToken));
  }, [refreshToken, setAuth]);

  useEffect(() => {
    if (!refreshToken) return undefined;
    const refreshNow = window.setTimeout(() => {
      void refreshSession().catch(() => undefined);
    }, 900);
    const interval = window.setInterval(() => {
      void refreshSession().catch(() => undefined);
    }, 12 * 60 * 1000);
    return () => {
      window.clearTimeout(refreshNow);
      window.clearInterval(interval);
    };
  }, [refreshSession, refreshToken]);

  const refreshAccount = useCallback(async () => {
    if (!accessToken) return;
    const account = await api.me(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(account.user));
    setUser(account.user);
  }, [accessToken]);

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, login, register, logout, setAuth, refreshSession, refreshAccount }),
    [user, accessToken, refreshToken, login, register, logout, setAuth, refreshSession, refreshAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
