"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleNavbar from "@/components/role-navbar";
import { apiFetch } from "@/lib/api";
import { getAthletes, type Athlete } from "@/lib/athletes";
import { getTeam, type Team } from "@/lib/teams";
import { useRoleSession } from "@/lib/use-role-session";

type Assignment = { id: string; active: boolean; athlete: Athlete };

export default function TeamRosterPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <Suspense fallback={<main className="p-10">Cargando equipo…</main>}>
      <TeamRosterPageContent params={params} />
    </Suspense>
  );
}

function TeamRosterPageContent({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Assignment[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [chosenAthleteId, setChosenAthleteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [teamData, rosterData, allAthletes] = await Promise.all([
        getTeam(teamId),
        apiFetch<Assignment[]>(`/team-athletes/team/${teamId}`),
        getAthletes(),
      ]);
      setError("");
      setTeam(teamData);
      setMembers(rosterData);
      setAthletes(allAthletes);
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar la plantilla.");
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

  const assignedIds = new Set(members.map((item) => item.athlete.id));
  const available = athletes.filter((a) => a.isActive && !assignedIds.has(a.id));

  async function assign() {
    if (!chosenAthleteId || working) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/team-athletes/team/${teamId}`, {
        method: "POST",
        body: JSON.stringify({ athleteId: chosenAthleteId }),
      });
      setChosenAthleteId("");
      await load();
      setMessage("Deportista asignado al equipo.");
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible asignar el deportista.");
    } finally {
      setWorking(false);
    }
  }

  async function remove(member: Assignment) {
    if (working || !window.confirm(`¿Retirar a ${member.athlete.user.fullName} del equipo?`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/team-athletes/${member.id}`, { method: "DELETE" });
      await load();
      setMessage("Deportista retirado del equipo.");
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible retirar el deportista.");
    } finally {
      setWorking(false);
    }
  }

  if (!session) return <main className="p-10">Cargando sesión…</main>;

  return (
    <main className="role-page admin-management-page athletes-page">
      <RoleNavbar role="admin" fullName={session.user.fullName} onLogout={logout} />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/admin/management/teams" className="font-semibold text-blue-900 hover:underline">← Gestión de equipos</Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Plantilla de deportistas</h1>
        <p className="mt-2 text-slate-600">{team ? `${team.name} · ${team.sport}` : "Consulta y administra los deportistas del equipo."}</p>
        {loading && <p className="mt-6">Cargando plantilla…</p>}
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 text-green-800">{message}</p>}
        {!loading && team && (
          <div className="mt-6 space-y-6">
            {team.isActive && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-slate-900">Agregar deportista</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  <select aria-label="Deportista" value={chosenAthleteId} onChange={(e) => setChosenAthleteId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Selecciona un deportista</option>
                    {available.map((a) => <option key={a.id} value={a.id}>{a.user.fullName} · {a.studentCode}</option>)}
                  </select>
                  <button type="button" disabled={!chosenAthleteId || working} onClick={assign} className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50">Agregar</button>
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="border-b border-slate-200 p-5 text-lg font-semibold text-slate-900">Deportistas registrados ({members.length})</h2>
              {members.length === 0 ? <p className="p-6 text-slate-600">Este equipo no tiene deportistas asignados.</p> : (
                <ul className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{m.athlete.user.fullName}</p>
                        <p className="text-sm text-slate-500">{m.athlete.studentCode} · {m.athlete.user.email}</p>
                      </div>
                      {team.isActive && <button type="button" disabled={working} onClick={() => remove(m)} className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50">Retirar</button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
