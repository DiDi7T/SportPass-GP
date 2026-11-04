"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch, login, logout, type SessionUser } from "@/lib/api";

const SessionContext = createContext<{ user: SessionUser; signOut: () => void } | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession debe usarse dentro de <SessionGate>.");
  return session;
}

// Login mínimo para probar las pantallas de competencias mientras se integra el
// inicio de sesión definitivo (HU1). Usa los mismos endpoints de /api/auth.
export function SessionGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  // Sin token, /auth/me responde 401 y apiFetch intenta renovar la sesión con la cookie de refresh.
  useEffect(() => {
    apiFetch<SessionUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <p className="p-6 text-center text-sm text-zinc-500">Cargando…</p>;
  if (!user) return <LoginForm onLogin={setUser} />;
  if (!user.permissions.includes("competitions:manage")) {
    return (
      <div className="mx-auto mt-16 max-w-sm space-y-4 p-6 text-center">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">Tu cuenta no tiene permiso para gestionar competencias.</p>
        <button className="text-sm font-medium text-blue-700 underline dark:text-blue-400" onClick={() => logout().then(() => setUser(null))}>
          Cerrar sesión
        </button>
      </div>
    );
  }
  return (
    <SessionContext.Provider value={{ user, signOut: () => logout().then(() => setUser(null)) }}>{children}</SessionContext.Provider>
  );
}

function LoginForm({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onLogin(await login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 w-full max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">Inicia sesión</h1>
      <p className="text-sm text-zinc-500">Usa tu cuenta institucional @icesi.edu.co.</p>
      <label className="block text-sm font-medium">
        Correo
        <input className="input mt-1" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        Contraseña
        <input className="input mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}
