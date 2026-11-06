"use client";

import { createContext, useContext, type ReactNode } from "react";
import RoleNavbar from "@/components/role-navbar";
import { type User } from "@/lib/auth";
import { useRoleSession } from "@/lib/use-role-session";

const SessionContext = createContext<{ user: User; signOut: () => void } | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession debe usarse dentro de <SessionGate>.");
  return session;
}

export function useCompetitionPermissions() {
  const { user } = useSession();
  const isAthlete = user.roles.includes("athlete");
  const hasManagePermission = user.permissions.includes("competitions:manage");
  // Un deportista no debe gestionar competencias (ni registrar, ni editar, ni cancelar, ni cambiar la convocatoria).
  const canManage = hasManagePermission && !isAthlete;

  return {
    user,
    isAthlete,
    canManage,
    canCreate: canManage,
    canEdit: canManage,
    canCancel: canManage,
    canChangeCallup: canManage,
  };
}

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
        <SessionContext.Provider value={{ user, signOut: logout }}>
          {children}
        </SessionContext.Provider>
      </section>
    </main>
  );
}
