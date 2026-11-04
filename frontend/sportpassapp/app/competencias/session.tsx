"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import RoleNavbar from "@/components/role-navbar";
import { dashboardPath, type User } from "@/lib/auth";
import { useRoleSession } from "@/lib/use-role-session";

const SessionContext = createContext<{ user: User; signOut: () => void } | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession debe usarse dentro de <SessionGate>.");
  return session;
}

// Usa la sesión del inicio de sesión de HU1 (/login) y la estructura de páginas por rol.
// Solo quien tiene el permiso competitions:manage (entrenador o administrador) ve las pantallas.
export function SessionGate({ children }: { children: ReactNode }) {
  const { session, logout } = useRoleSession();

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando…</p>
      </main>
    );
  }
  const { user } = session;
  const role = user.roles[0];

  return (
    <main className="role-page competitions-page">
      <RoleNavbar role={role} fullName={user.fullName} onLogout={logout} />
      <section className="competitions-content">
        {user.permissions.includes("competitions:manage") ? (
          <SessionContext.Provider value={{ user, signOut: logout }}>{children}</SessionContext.Provider>
        ) : (
          <>
            <Link className="back-link" href={dashboardPath(role)}>← Volver a mi inicio</Link>
            <p role="alert" className="admin-error">Tu cuenta no tiene permiso para gestionar competencias.</p>
          </>
        )}
      </section>
    </main>
  );
}
