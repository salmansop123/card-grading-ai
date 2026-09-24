"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import axios from "axios";
import { API_URL } from "@/lib/constants";
import {
  AuthUser,
  clearLocalAccessToken,
  getLocalAccessToken,
  setLocalAccessToken,
} from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

function supabaseUserToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: user.user_metadata?.full_name,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ? supabaseUserToAuthUser(data.session.user) : null);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? supabaseUserToAuthUser(session.user) : null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    const token = getLocalAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const u = res.data.user;
        setUser({ id: u.id, email: u.email, fullName: u.full_name });
      })
      .catch(() => {
        clearLocalAccessToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return;
    }

    const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    setLocalAccessToken(data.access_token);
    const u = data.user;
    setUser({ id: u.id, email: u.email, fullName: u.full_name });
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      return;
    }

    const { data } = await axios.post(`${API_URL}/api/auth/register`, {
      email,
      password,
      full_name: fullName,
    });
    setLocalAccessToken(data.access_token);
    const u = data.user;
    setUser({ id: u.id, email: u.email, fullName: u.full_name });
  }, []);

  const signOut = useCallback(async () => {
    // Always clear local JWT so API auth cannot survive logout
    clearLocalAccessToken();
    setUser(null);

    if (isSupabaseConfigured()) {
      try {
        await getSupabase().auth.signOut({ scope: "local" });
      } catch {
        // Session already cleared locally — still treat as signed out
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
