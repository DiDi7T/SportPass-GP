
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import { getTeams, deactivateTeam, type Team } from "@/lib/teams";

type Filter = "all" | "active" | "inactive";

export default function TeamsPage() {
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();

  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const initialLoadStarted = useRef(false);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTeams();
      setTeams(data);
    } catch (err) {
      handleAuthError(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los equipos."
      );
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
  if (!session) return;

  if (!session.user.roles.includes("admin")) {
    router.replace("/");
    return;
  }

  if (initialLoadStarted.current) return;

  initialLoadStarted.current = true;
  loadTeams();
}, [session, router, loadTeams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.sport.toLowerCase().includes(search.toLowerCase()) ||
        (team.coach?.fullName ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && team.isActive) ||
        (filter === "inactive" && !team.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [teams, search, filter]);

  async function handleDeactivate(team: Team) {
    if (!team.isActive) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas desactivar el equipo "${team.name}"?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(team.id);
      await deactivateTeam(team.id);

      setTeams((current) =>
        current.map((item) =>
          item.id === team.id
            ? { ...item, isActive: false }
            : item
        )
      );
    } catch (err) {
      handleAuthError(err);
      alert(
        err instanceof Error
          ? err.message
          : "No fue posible desactivar el equipo."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const activeCount = teams.filter((team) => team.isActive).length;
  const inactiveCount = teams.length - activeCount;

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando sesión...</p>
      </main>
    );
  }

  return (
    <main className="role-page admin-management-page athletes-page">
      <RoleNavbar
        role="admin"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Link href="/admin" className="hover:text-blue-700">
                Administración
              </Link>
              <span>/</span>
              <Link
                href="/admin/management"
                className="hover:text-blue-700"
              >
                Gestión
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-800">Equipos</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Gestión de equipos
            </h1>

            <p className="mt-2 text-slate-600">
              Administra los equipos representativos de la Universidad Icesi.
            </p>
          </div>

          <Link
            href="/admin/management/teams/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <span className="text-xl">+</span>
            Crear equipo
          </Link>
        </div>

        {/* Estadísticas */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de equipos"
            value={teams.length}
            icon="🏆"
          />
          <StatCard
            label="Equipos activos"
            value={activeCount}
            icon="✓"
          />
          <StatCard
            label="Equipos inactivos"
            value={inactiveCount}
            icon="○"
          />
        </div>

        {/* Contenido */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Equipos registrados
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Consulta y administra los equipos de SportPass.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar equipo, deporte o entrenador..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 sm:w-72"
                />

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-700"
                >
                  <option value="all">Todos los equipos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Cargando equipos...
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="mb-4 text-red-600">{error}</p>
              <button
                onClick={loadTeams}
                className="rounded-lg bg-blue-900 px-4 py-2 text-white hover:bg-blue-800"
              >
                Intentar nuevamente
              </button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-4xl">🏆</div>
              <h3 className="font-semibold text-slate-900">
                No se encontraron equipos
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {search
                  ? "Intenta con otro término de búsqueda."
                  : "Todavía no hay equipos registrados."}
              </p>
            </div>
          ) : (
            <>
              {/* Tabla para escritorio */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Equipo</th>
                      <th className="px-6 py-4">Deporte</th>
                      <th className="px-6 py-4">Entrenador</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredTeams.map((team) => (
                      <tr key={team.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {team.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {team.id}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {team.sport}
                        </td>

                        <td className="px-6 py-4">
                          {team.coach ? (
                            <>
                              <p className="text-sm font-medium text-slate-800">
                                {team.coach.fullName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {team.coach.email}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Sin asignar
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge active={team.isActive} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/management/teams/${team.id}`}
                              className="text-sm font-semibold text-blue-800 hover:underline"
                            >
                              Ver equipo
                            </Link>

                            <Link
                              href={`/admin/management/teams/${team.id}/roster`}
                              className="text-sm font-semibold text-slate-600 hover:text-blue-800"
                            >
                              Plantilla
                            </Link>

                            {team.isActive && (
                              <button
                                disabled={processingId === team.id}
                                onClick={() => handleDeactivate(team)}
                                className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                              >
                                {processingId === team.id
                                  ? "Procesando..."
                                  : "Desactivar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas para móvil */}
              <div className="grid gap-4 p-4 md:hidden">
                {filteredTeams.map((team) => (
                  <article
                    key={team.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {team.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {team.sport}
                        </p>
                      </div>
                      <StatusBadge active={team.isActive} />
                    </div>

                    <div className="mb-4 border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Entrenador
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {team.coach?.fullName ?? "Sin asignar"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                      <Link
                        href={`/admin/management/teams/${team.id}`}
                        className="text-sm font-semibold text-blue-800"
                      >
                        Ver equipo
                      </Link>

                      <Link
                        href={`/admin/management/teams/${team.id}/roster`}
                        className="text-sm font-semibold text-slate-600"
                      >
                        Plantilla
                      </Link>

                      {team.isActive && (
                        <button
                          disabled={processingId === team.id}
                          onClick={() => handleDeactivate(team)}
                          className="text-sm font-semibold text-red-600 disabled:opacity-50"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {!loading && !error && (
            <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
              Mostrando {filteredTeams.length} de {teams.length} equipos
            </div>
          )}
        </section>
      </main>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
