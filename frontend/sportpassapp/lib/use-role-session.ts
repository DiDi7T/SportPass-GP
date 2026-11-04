
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

import { ApiError, setToken } from "@/lib/api";
import { apiUrl, SESSION_KEY, type Session } from "@/lib/auth";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);

  return () => window.removeEventListener("storage", onChange);
}

const readSession = () => localStorage.getItem(SESSION_KEY);
const serverSession = () => undefined;

export function useRoleSession() {
  const router = useRouter();

  const saved = useSyncExternalStore(
    subscribe,
    readSession,
    serverSession
  );

  const session = useMemo<Session | null>(() => {
    if (!saved) return null;

    try {
      return JSON.parse(saved) as Session;
    } catch {
      return null;
    }
  }, [saved]);

  useEffect(() => {
    if (saved !== undefined && !session) {
      router.replace("/login");
    }
  }, [saved, session, router]);

  const endSession = useCallback(
    (redirect: string) => {
      localStorage.removeItem(SESSION_KEY);
      setToken(null);
      router.replace(redirect);
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);

    endSession("/");
  }, [endSession]);

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        endSession("/login");
      }
    },
    [endSession]
  );

  return {
    session,
    logout,
    handleAuthError,
  };
}
