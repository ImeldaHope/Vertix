import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../api/apiClient';
import * as AuthApi from '../api/auth';
import { saveTokens, getAccessToken, getRefreshToken, clearTokens } from '../utils/secureStore';

type User = {
  id: string;
  email?: string;
  displayName?: string;
  isGuest?: boolean;
};

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInGuest: () => Promise<void>;
  socialSignIn: (provider: string, token: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const setAxiosToken = (token: string | null) => {
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete api.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const refresh = await getRefreshToken();
        if (token) {
          setAxiosToken(token);
          // attempt to fetch profile
          const resp = await api.get('/me');
          if (!mounted) return;
          setUser(resp.data);
        } else if (refresh) {
          // try refresh
          const r = await AuthApi.refreshToken(refresh);
          await saveTokens(r.data.accessToken, r.data.refreshToken);
          setAxiosToken(r.data.accessToken);
          const resp = await api.get('/me');
          if (!mounted) return;
          setUser(resp.data);
        }
      } catch (e) {
        // silent
      } finally {
        if (mounted) setInitializing(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Axios response interceptor to handle 401 -> try refresh
    const interceptor = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const original = err.config;
        if (err.response && err.response.status === 401 && !original._retry) {
          original._retry = true;
          const refresh = await getRefreshToken();
          if (refresh) {
            try {
              const r = await AuthApi.refreshToken(refresh);
              await saveTokens(r.data.accessToken, r.data.refreshToken);
              setAxiosToken(r.data.accessToken);
              original.headers['Authorization'] = `Bearer ${r.data.accessToken}`;
              return api(original);
            } catch (e) {
              // fallthrough to sign out
            }
          }
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const r = await AuthApi.login(email, password);
      await saveTokens(r.data.accessToken, r.data.refreshToken);
      setAxiosToken(r.data.accessToken);
      const me = await api.get('/me');
      setUser(me.data);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.response?.data?.message || e.message);
      throw e;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const r = await AuthApi.signup(email, password, displayName);
      await saveTokens(r.data.accessToken, r.data.refreshToken);
      setAxiosToken(r.data.accessToken);
      const me = await api.get('/me');
      setUser(me.data);
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.response?.data?.message || e.message);
      throw e;
    }
  };

  const signInGuest = async () => {
    try {
      const r = await AuthApi.guestLogin();
      await saveTokens(r.data.accessToken, r.data.refreshToken);
      setAxiosToken(r.data.accessToken);
      const me = await api.get('/me');
      setUser(me.data);
    } catch (e) {
      Alert.alert('Guest sign-in failed');
    }
  };

  const socialSignIn = async (provider: string, token: string) => {
    try {
      const r = await AuthApi.socialLogin(provider, token);
      await saveTokens(r.data.accessToken, r.data.refreshToken);
      setAxiosToken(r.data.accessToken);
      const me = await api.get('/me');
      setUser(me.data);
    } catch (e: any) {
      Alert.alert('Social sign-in failed', e?.response?.data?.message || e.message);
      throw e;
    }
  };

  const signOut = async () => {
    await clearTokens();
    setAxiosToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signUp, signOut, signInGuest, socialSignIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
