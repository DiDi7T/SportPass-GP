"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ApiError, setToken } from "@/lib/api";
import { apiUrl, SESSION_KEY, type Session } from "@/lib/auth";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// En el servidor no hay localStorage: undefined significa "aún no se sabe".
const readSession = () => localStorage.getItem(SESSION_KEY);
const serverSession = () => undefined;

// Misma sesión que /athlete, /coach y /admin (HU1). La programación no exige ningún rol (CA4):
// basta con haber iniciado sesión con una cuenta @icesi.edu.co.
export function useRoleSession() {
  const router = useRouter();
  const saved = useSyncExternalStore(subscribe, readSession, serverSession);
  const session = useMemo<Session | null>(() => {
    if (!saved) return null;
    try {
      return JSON.parse(saved) as Session;
    } catch {
      return null;
    }
  }, [saved]);

  useEffect(() => {
    if (saved !== undefined && !session) router.replace("/login");
  }, [saved, session, router]);

  function endSession(redirect: string) {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    router.replace(redirect);
  }

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    endSession("/");
  }

  // Si la sesión ya no es válida (ni renovándola), se vuelve al login.
  function handleAuthError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) endSession("/login");
  }

  return { session, logout, handleAuthError };
}
