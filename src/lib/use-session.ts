"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionState = {
  loading: boolean;
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  activated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

type MeResponse = {
  ok?: boolean;
  user?: { userId: string; email: string };
  activation?: { activated?: boolean };
};

export function useSession(): SessionState {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUserId(null);
        setEmail(null);
        setActivated(false);
        return;
      }
      const json = (await res.json()) as MeResponse;
      setUserId(json.user?.userId ?? null);
      setEmail(json.user?.email ?? null);
      setActivated(Boolean(json.activation?.activated));
    } catch {
      setUserId(null);
      setEmail(null);
      setActivated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUserId(null);
      setEmail(null);
      setActivated(false);
    }
  }, []);

  return {
    loading,
    authenticated: Boolean(userId),
    userId,
    email,
    activated,
    refresh,
    logout,
  };
}
