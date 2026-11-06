"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleNavbar from "@/components/role-navbar";
import { getTeam, type Team } from "@/lib/teams";
import { useRoleSession } from "@/lib/use-role-session";

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <Suspense fallback={<main className="p-10">Cargando equipo…</main>}>
      <TeamDetailPageContent params={params} />
    </Suspense>
  );
}

function TeamDetailPageContent({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const teamData = await getTeam(teamId);
      setError("");
      setTeam(teamData);
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [teamId, handleAuthError]);

  useEffect(() => {
    if (!session) return;
    if (!session.user.roles.includes("admin")) {
      router.replace("/");
      return;
    }
    let active = true;
    // Posponer la carga evita hacer setState durante la ejecucion sincrona del efecto.
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => { active = false; };
  }, [session, router, load]);

  if (!session) return <main className="p-10">Cargando sesión…</main>;

  return (
    <main className="role-page admin-management-page athletes-page">
      <RoleNavbar role="admin" fullName={session.user.fullName} onLogout={logout} />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/admin/management/teams" className="font-semibold text-blue-900 hover:underline">← Gestión de equipos</Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Detalle del equipo</h1>
        {loading && <p className="mt-6">Cargando equipo…</p>}
        {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
        {!loading && team && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
            <p className="mt-2 text-slate-600">Deporte: {team.sport}</p>
            <p className="mt-1 text-slate-600">Estado: {team.isActive ? "Activo" : "Inactivo"}</p>
            <p className="mt-1 text-slate-600">Entrenador principal anterior: {team.coach?.fullName ?? "Sin asignar"}</p>
            <p className="mt-2 text-sm text-slate-500">Para consultar o modificar todos los entrenadores utiliza “Gestionar entrenadores”.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white" href={`/admin/management/teams/${teamId}/coaches`}>Gestionar entrenadores</Link>
              <Link className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800" href={`/admin/management/teams/${teamId}/roster`}>Ver plantilla de deportistas</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
