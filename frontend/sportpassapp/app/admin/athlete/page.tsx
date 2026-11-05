"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import {
  deactivateAthlete,
  getAthletes,
  type Athlete,
} from "@/lib/athletes";

export default function AthletesPage() {
  const { session, logout } = useRoleSession();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const initialLoadStarted = useRef(false);

  async function loadAthletes() {
    try {
      setLoading(true);
      setError("");

      const data = await getAthletes();
      setAthletes(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los deportistas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session || initialLoadStarted.current) return;

    initialLoadStarted.current = true;
    void loadAthletes();
  }, [session]);

  async function handleDeactivate(id: string) {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas desactivar este deportista?",
    );

    if (!confirmed) return;

    try {
      await deactivateAthlete(id);

      setAthletes((previous) =>
        previous.map((athlete) =>
          athlete.id === id
            ? { ...athlete, isActive: false }
            : athlete,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible desactivar el deportista.",
      );
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen grid place-items-center bg-base-200">
        Cargando sesión...
      </main>
    );
  }

  if (!session.user.roles.includes("admin")) {
    return (
      <main className="min-h-screen grid place-items-center bg-base-200 p-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title">Acceso restringido</h1>
            <p>No tienes permisos para gestionar deportistas.</p>
            <Link
              href="/admin/management"
              className="btn btn-primary"
            >
              Volver
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const filteredAthletes = athletes.filter((athlete) => {
    const text = search.toLowerCase();

    return (
      athlete.firstName.toLowerCase().includes(text) ||
      athlete.lastName.toLowerCase().includes(text) ||
      athlete.studentCode.toLowerCase().includes(text) ||
      athlete.user.email.toLowerCase().includes(text)
    );
  });

  const activeCount = athletes.filter(
    (athlete) => athlete.isActive,
  ).length;

  return (
    <main className="role-page admin-management-page athletes-page">
      <RoleNavbar
        role="admin"
        fullName={session.user.fullName}
        onLogout={logout}
      />
    <section>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Gestión de deportistas
            </h1>

            <p className="text-base-content/60 mt-2">
              Administra el listado general de deportistas de Icesi.
            </p>
          </div>

          <Link
            href="/admin/athlete/import"
            className="primary-button"
          >
            + Importar deportistas
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
          <div className="stat bg-base-100 rounded-xl shadow-sm">
            <div className="stat-title">
              Total de deportistas
            </div>
            <div className="stat-value">
              {athletes.length}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-xl shadow-sm">
            <div className="stat-title">
              Deportistas activos
            </div>
            <div className="stat-value text-success">
              {activeCount}
            </div>
          </div>
        </div>

        <section className="card bg-base-100 shadow-sm mt-6">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <h2 className="card-title">
                Deportistas registrados
              </h2>

              <button
                className="btn btn-outline btn-sm"
                onClick={loadAthletes}
                disabled={loading}
              >
                Actualizar
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar por nombre, código o correo..."
              className="input input-bordered w-full mt-3"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {error && (
              <div className="alert alert-error mt-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-semibold">
                  No se encontraron deportistas.
                </p>
                <p className="text-sm text-base-content/60 mt-2">
                  Importa un archivo CSV o modifica tu búsqueda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Correo institucional</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAthletes.map((athlete) => (
                      <tr key={athlete.id}>
                        <td className="font-medium">
                          {athlete.firstName} {athlete.lastName}
                        </td>

                        <td>{athlete.studentCode}</td>

                        <td>{athlete.user.email}</td>

                        <td>
                          {athlete.isActive ? (
                            <span className="badge badge-success badge-outline">
                              Activo
                            </span>
                          ) : (
                            <span className="badge badge-error badge-outline">
                              Inactivo
                            </span>
                          )}
                        </td>

                        <td>
                          {athlete.isActive && (
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() =>
                                handleDeactivate(athlete.id)
                              }
                            >
                              Desactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      </section>
    </main>
  );
}