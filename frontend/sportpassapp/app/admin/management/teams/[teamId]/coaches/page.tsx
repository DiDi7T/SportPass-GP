'use client';

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoleNavbar from '@/components/role-navbar';
import { useRoleSession } from '@/lib/use-role-session';
import { getTeam, type Team } from '@/lib/teams';
import { fetchAvailableCoaches, fetchTeamCoaches, saveTeamCoaches, type CoachChoice } from '@/lib/team-coaches';

export default function TeamCoachesPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <Suspense fallback={<main className="p-10">Cargando equipo…</main>}>
      <TeamCoachesPageContent params={params} />
    </Suspense>
  );
}

function TeamCoachesPageContent({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [options, setOptions] = useState<CoachChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [t, coaches, assigned] = await Promise.all([
        getTeam(teamId), fetchAvailableCoaches(), fetchTeamCoaches(teamId),
      ]);
      setError(''); setTeam(t); setOptions(coaches); setSelected(assigned.map(person => person.id));
    } catch (e) { handleAuthError(e); setError(e instanceof Error ? e.message : 'No se pudo cargar el equipo.'); }
    finally { setLoading(false); }
  }, [teamId, handleAuthError]);

  useEffect(() => {
    if (!session) return;
    if (!session.user.roles.includes('admin')) { router.replace('/'); return; }
    let active = true;
    // Posponer la carga evita hacer setState durante la ejecucion sincrona del efecto.
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => { active = false; };
  }, [session, router, load]);

  async function save() {
    if (!team?.isActive) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await saveTeamCoaches(teamId, selected);
      setSelected(result.map(person => person.id));
      setNotice('Asignaciones actualizadas. Los permisos por equipo se aplican inmediatamente.');
    } catch (e) { handleAuthError(e); setError(e instanceof Error ? e.message : 'No se pudieron guardar las asignaciones.'); }
    finally { setSaving(false); }
  }

  if (!session) return <main className="p-10">Cargando sesión…</main>;
  return <main className="role-page admin-management-page athletes-page">
    <RoleNavbar role="admin" fullName={session.user.fullName} onLogout={logout} />
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/management/teams" className="font-semibold text-blue-900 hover:underline">← Gestión de equipos</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Entrenadores del equipo</h1>
      <p className="mt-2 text-slate-600">{team ? `${team.name} · ${team.sport}` : 'Selecciona entrenadores registrados.'}</p>
      {loading ? <p className="mt-6">Cargando…</p> : <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!team?.isActive && <p className="mb-4 text-amber-700">Este equipo no está activo y no admite cambios.</p>}
        {options.length === 0 && <p>No hay usuarios con rol entrenador activos.</p>}
        <div className="space-y-3">
          {options.map(person => <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <input type="checkbox" className="h-5 w-5" disabled={!team?.isActive || saving}
              checked={selected.includes(person.id)}
              onChange={e => setSelected(current => e.target.checked ? [...current, person.id] : current.filter(id => id !== person.id))} />
            <span><strong className="block text-slate-900">{person.fullName}</strong><span className="text-sm text-slate-600">{person.email}</span></span>
          </label>)}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" disabled={saving || !team?.isActive || loading} onClick={save}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar asignaciones'}
          </button>
          <button type="button" onClick={() => void load()} disabled={saving} className="rounded-xl border px-5 py-3">Restablecer</button>
        </div>
        {notice && <p role="status" className="mt-4 text-green-800">{notice}</p>}
      </div>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    </section>
  </main>;
}
