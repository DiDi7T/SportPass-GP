"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleNavbar from "@/components/role-navbar";
import { createTeam } from "@/lib/teams";
import { useRoleSession } from "@/lib/use-role-session";

export default function NewTeamPage() {
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session && !session.user.roles.includes("admin")) router.replace("/");
  }, [session, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !sport.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const team = await createTeam({ name: name.trim(), sport: sport.trim(), isActive: true });
      router.push(`/admin/management/teams/${team.id}/coaches`);
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible crear el equipo.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return <main className="p-10">Cargando sesión…</main>;

  return (
    <main className="role-page admin-management-page athletes-page">
      <RoleNavbar role="admin" fullName={session.user.fullName} onLogout={logout} />
      <section className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin/management/teams" className="font-semibold text-blue-900 hover:underline">← Gestión de equipos</Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Crear equipo</h1>
        <p className="mt-2 text-slate-600">Después de crearlo podrás asignarle uno o varios entrenadores.</p>
        <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-800">Nombre del equipo
            <input required minLength={3} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Ej. Baloncesto femenino" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">Deporte
            <input required minLength={2} maxLength={100} value={sport} onChange={(e) => setSport(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Ej. Baloncesto" />
          </label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button disabled={saving || !name.trim() || !sport.trim()} type="submit" className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Creando…" : "Crear y asignar entrenadores"}</button>
        </form>
      </section>
    </main>
  );
}
