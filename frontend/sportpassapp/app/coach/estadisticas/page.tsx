
"use client";

import Link from "next/link";
import RoleNavbar from "@/components/role-navbar";
import AbsenceAnalyticsDashboard from "@/components/absence-analytics-dashboard";
import { useRoleSession } from "@/lib/use-role-session";

const COACH_PERMISSION = "competitions:manage";

export default function CoachAbsenceAnalyticsPage() {
  const { session, logout } = useRoleSession();

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando...</p>
      </main>
    );
  }

  const isCoach = session.user.roles.includes("coach");
  const canView =
    isCoach &&
    session.user.permissions.includes(COACH_PERMISSION);

  return (
    <main className="role-page admin-management-page min-h-screen bg-slate-50/50">
      <RoleNavbar
        role={session.user.roles[0]}
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Ruta"
          className="mb-2 flex items-center gap-2 text-sm text-slate-500"
        >
          <Link href="/coach" className="hover:text-blue-700">
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-800">
            Estadísticas
          </span>
        </nav>

        <header className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Estadísticas de solicitudes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Analiza las solicitudes de ausencia asignadas a tu equipo y
            consulta su evolución.
          </p>
        </header>

        {!canView ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Solo los entrenadores autorizados pueden consultar estas
            estadísticas.
          </p>
        ) : (
          <AbsenceAnalyticsDashboard role="coach" />
        )}
      </div>
    </main>
  );
}
