"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import {
  deactivateAthlete,
  getAthletes,
  type Athlete,
} from "@/lib/athletes";

type Filter = "all" | "active" | "inactive";

export default function AthletesPage() {
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const initialLoadStarted = useRef(false);

  const loadAthletes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAthletes();
      setAthletes(data);
    } catch (err) {
      handleAuthError(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los deportistas.",
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
    void loadAthletes();
  }, [session, router, loadAthletes]);

  async function handleDeactivate(athlete: Athlete) {
    if (!athlete.isActive) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas desactivar al deportista "${athlete.user.fullName}"?`,
    );

    if (!confirmed) return;

    try {
      setDeactivatingId(athlete.id);
      await deactivateAthlete(athlete.id);

      setAthletes((previous) =>
        previous.map((item) =>
          item.id === athlete.id
            ? { ...item, isActive: false }
            : item,
        ),
      );
    } catch (err) {
      handleAuthError(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible desactivar el deportista.",
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const text = search.trim().toLowerCase();
      const matchesSearch =
        !text ||
        athlete.user.fullName.toLowerCase().includes(text) ||
        athlete.studentCode.toLowerCase().includes(text) ||
        athlete.user.email.toLowerCase().includes(text);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && athlete.isActive) ||
        (filter === "inactive" && !athlete.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [athletes, search, filter]);

  const activeCount = useMemo(
    () => athletes.filter((athlete) => athlete.isActive).length,
    [athletes],
  );
  const inactiveCount = athletes.length - activeCount;

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Cargando sesión...</span>
        </div>
      </main>
    );
  }

  if (!session.user.roles.includes("admin")) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
            🔒
          </div>
          <h1 className="text-xl font-bold text-slate-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-600">
            No tienes permisos de administrador para gestionar deportistas.
          </p>
          <Link
            href="/admin/management"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition"
          >
            Volver a gestión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="role-page admin-management-page athletes-page bg-slate-50/50 min-h-screen">
      <RoleNavbar
        role="admin"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Migas de pan */}
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-blue-700 transition">
            Administración
          </Link>
          <span>/</span>
          <Link href="/admin/management" className="hover:text-blue-700 transition">
            Gestión
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">Deportistas</span>
        </div>

        {/* Encabezado */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Gestión de deportistas
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Administra el listado general de deportistas representativos de la Universidad Icesi.
            </p>
          </div>

          <Link
            href="/admin/athlete/import"
            className="primary-button"
          >
            <span className="text-xl font-bold">+</span>
            <span>Importar deportistas</span>
          </Link>
        </div>

        {/* Estadísticas */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de deportistas"
            value={athletes.length}
            icon=""
            description="Registrados en el sistema"
          />
          <StatCard
            label="Deportistas activos"
            value={activeCount}
            icon=""
            highlight="green"
            description="Disponibles para convocatoria"
          />
          <StatCard
            label="Deportistas inactivos"
            value={inactiveCount}
            icon=""
            highlight={inactiveCount > 0 ? "slate" : undefined}
            description="Sin participación activa"
          />
        </div>

        {/* Notificación de error si existe */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-600">Error:</span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadAthletes}
              className="text-xs font-semibold text-red-700 underline hover:text-red-900"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Panel principal */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Barra de herramientas */}
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Deportistas registrados
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Consulta, busca y gestiona el estado de cada deportista.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm"
                  >
                    ⌕
                  </span>
                  <input
                    type="search"
                    placeholder="Buscar por nombre, código o correo..."
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 sm:w-80"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as Filter)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-700"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
                </select>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  onClick={loadAthletes}
                  disabled={loading}
                >
                  <span className={loading ? "animate-spin inline-block" : ""}>↻</span>
                  <span>Actualizar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cuerpo del listado */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm">Cargando deportistas...</p>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                {search || filter !== "all" ? "🔍" : "👥"}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {search || filter !== "all"
                  ? "No se encontraron resultados"
                  : "No hay deportistas registrados"}
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                {search || filter !== "all"
                  ? "Prueba modificando los términos de búsqueda o el filtro seleccionado."
                  : "Comienza importando un archivo CSV con la plantilla institucional."}
              </p>
              {(search || filter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-4 inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th scope="col" className="px-6 py-3.5">
                      Deportista
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Código institucional
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Correo institucional
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredAthletes.map((athlete) => {
                    const initials = athlete.user.fullName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word.charAt(0))
                      .join("")
                      .toUpperCase();

                    const isBusy = deactivatingId === athlete.id;

                    return (
                      <tr
                        key={athlete.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {initials || "DP"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {athlete.user.fullName}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                            {athlete.studentCode}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <a
                            href={`mailto:${athlete.user.email}`}
                            className="text-slate-600 hover:text-blue-700 hover:underline"
                          >
                            {athlete.user.email}
                          </a>
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge active={athlete.isActive} />
                        </td>

                        <td className="px-6 py-4 text-right">
                          {athlete.isActive ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeactivate(athlete)}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              {isBusy ? "Desactivando..." : "Desactivar"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Inactivo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pie de tabla con conteo */}
          {!loading && filteredAthletes.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-3.5 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                Mostrando <strong className="text-slate-700">{filteredAthletes.length}</strong> de{" "}
                <strong className="text-slate-700">{athletes.length}</strong> deportistas registrados
              </span>
              <span>Universidad Icesi · SportPass</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  highlight?: "green" | "slate";
  description?: string;
}) {
  const valueColor =
    highlight === "green"
      ? "text-green-600"
      : highlight === "slate"
        ? "text-slate-500"
        : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-sm">
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-3xl font-extrabold tracking-tight ${valueColor}`}>
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-slate-400"
        }`}
      />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
