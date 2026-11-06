"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import { getTeam } from "@/lib/teams";
import type { Team } from "@/lib/teams";

import {
  assignAthlete,
  getAvailableAthletes,
  getTeamAthletes,
  removeAthlete,
  type Athlete,
  type TeamAthlete,
} from "@/lib/team-athletes";

export interface TeamRosterContentProps {
  params?: Promise<{ teamId: string }>;
  teamId?: string;
}

export default function TeamRosterContent({
  params,
  teamId: propTeamId,
}: TeamRosterContentProps = {}) {
  const unwrappedParams = params ? use(params) : undefined;
  const routeParams = useParams<{ teamId: string }>();
  const teamId = propTeamId ?? unwrappedParams?.teamId ?? routeParams?.teamId ?? "";

  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamAthlete[]>([]);
  const [available, setAvailable] = useState<Athlete[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busyAthleteId, setBusyAthleteId] = useState<string | null>(
    null
  );

  const isCoach = session?.user.roles.includes("coach") ?? false;

  const loadData = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError("");

      const [teamData, membersData, availableData] =
        await Promise.all([
          getTeam(teamId),
          getTeamAthletes(teamId),
          getAvailableAthletes(teamId),
        ]);

      setTeam(teamData);
      setMembers(membersData);
      setAvailable(availableData);
    } catch (err) {
      handleAuthError(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la información del equipo."
      );
    } finally {
      setLoading(false);
    }
  }, [teamId, handleAuthError]);

  useEffect(() => {
    if (!session) return;

    if (!isCoach) {
      router.replace("/login");
      return;
    }

    if (!teamId) return;

    let active = true;

    async function fetchData() {
      try {
        setError("");

        const [teamData, membersData, availableData] =
          await Promise.all([
            getTeam(teamId),
            getTeamAthletes(teamId),
            getAvailableAthletes(teamId),
          ]);

        if (active) {
          setTeam(teamData);
          setMembers(membersData);
          setAvailable(availableData);
        }
      } catch (err) {
        handleAuthError(err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar la información del equipo."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [session, isCoach, router, teamId, handleAuthError]);

  const filteredAvailable = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return available;

    return available.filter((athlete) => {
      const fullName = athlete.user.fullName.toLowerCase();

      return (
        fullName.includes(term) ||
        athlete.studentCode.toLowerCase().includes(term) ||
        athlete.user.email.toLowerCase().includes(term)
      );
    });
  }, [available, search]);

  async function handleAssign(athleteId: string) {
    if (!teamId) return;

    try {
      setBusyAthleteId(athleteId);
      setError("");
      setSuccess("");

      await assignAthlete(teamId, { athleteId });

      setSuccess("Deportista agregado correctamente.");
      await loadData();
    } catch (err) {
      handleAuthError(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible agregar al deportista."
      );
    } finally {
      setBusyAthleteId(null);
    }
  }

  async function handleRemove(assignment: TeamAthlete) {
    const athleteName = assignment.athlete.user.fullName;

    const confirmed = window.confirm(
      `¿Estás seguro de retirar a ${athleteName} de este equipo?`
    );

    if (!confirmed) return;

    try {
      setBusyAthleteId(assignment.athlete.id);
      setError("");
      setSuccess("");

      await removeAthlete(assignment.id);

      setSuccess("Deportista retirado del equipo correctamente.");
      await loadData();
    } catch (err) {
      handleAuthError(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible retirar al deportista."
      );
    } finally {
      setBusyAthleteId(null);
    }
  }

  if (!session || !isCoach) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">
          Cargando equipo…
        </p>
      </main>
    );
  }

  return (
    <main className="role-page coach-roster-page">
      <RoleNavbar
        role="coach"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <section className="coach-teams-header">
        <div>
          <p className="eyebrow">SPORTPASS · GESTIÓN DE EQUIPO</p>
          <h1>{team?.name ?? "Integrantes del equipo"}</h1>
          <p>
            {team?.sport ?? "Consulta y administra los deportistas."}
          </p>
        </div>

        <Link href="/coach/teams" className="coach-back-link">
          ← Volver a mis equipos
        </Link>
      </section>

      <section className="roster-content">
        {error && (
          <div className="roster-alert roster-alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="roster-alert roster-alert-success">
            {success}
          </div>
        )}

        {loading ? (
          <p className="dashboard-loading">
            Cargando integrantes…
          </p>
        ) : (
          <>
            <section className="roster-section">
              <div className="roster-section-heading">
                <div>
                  <p className="eyebrow">EQUIPO</p>
                  <h2>Deportistas integrantes</h2>
                </div>

                <span className="coach-teams-count">
                  {members.length}{" "}
                  {members.length === 1 ? "integrante" : "integrantes"}
                </span>
              </div>

              {members.length === 0 ? (
                <div className="coach-empty-state">
                  <h3>Este equipo todavía no tiene integrantes</h3>
                  <p>
                    Puedes incorporar deportistas desde la sección
                    de disponibles.
                  </p>
                </div>
              ) : (
                <div className="roster-table-wrapper">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>Deportista</th>
                        <th>Código estudiantil</th>
                        <th>Correo institucional</th>
                        <th>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {members.map((assignment) => {
                        const athlete = assignment.athlete;

                        return (
                          <tr key={assignment.id}>
                            <td>
                              <strong>
                                {athlete.user.fullName}
                              </strong>
                            </td>

                            <td>{athlete.studentCode}</td>
                            <td>{athlete.user.email}</td>

                            <td>
                              <button
                                className="roster-remove-button"
                                disabled={
                                  busyAthleteId === athlete.id
                                }
                                onClick={() =>
                                  handleRemove(assignment)
                                }
                              >
                                {busyAthleteId === athlete.id
                                  ? "Procesando…"
                                  : "Retirar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="roster-section">
              <div className="roster-section-heading">
                <div>
                  <p className="eyebrow">INCORPORACIONES</p>
                  <h2>Deportistas disponibles</h2>
                  <p>
                    Busca deportistas registrados para incorporarlos
                    a este equipo.
                  </p>
                </div>

                <span className="coach-teams-count">
                  {available.length} disponibles
                </span>
              </div>

              <div className="roster-search">
                <span aria-hidden="true">⌕</span>

                <input
                  type="search"
                  placeholder="Buscar por nombre, código o correo..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {filteredAvailable.length === 0 ? (
                <div className="coach-empty-state">
                  <h3>
                    {available.length === 0
                      ? "No hay deportistas disponibles"
                      : "No encontramos resultados"}
                  </h3>

                  <p>
                    {available.length === 0
                      ? "Todos los deportistas activos ya pertenecen a este equipo o no hay registros disponibles."
                      : "Intenta buscar con otro nombre, código o correo."}
                  </p>
                </div>
              ) : (
                <div className="roster-available-grid">
                  {filteredAvailable.map((athlete) => (
                    <article
                      className="roster-athlete-card"
                      key={athlete.id}
                    >
                      <div className="roster-athlete-avatar">
                        {(athlete.user.fullName?? "D").charAt(0).toUpperCase()}
                      </div>

                      <div className="roster-athlete-info">
                        <h3>{athlete.user.fullName}</h3>

                        <p>{athlete.studentCode}</p>
                        <p>{athlete.user.email}</p>
                      </div>

                      <button
                        className="roster-add-button"
                        disabled={
                          busyAthleteId === athlete.id
                        }
                        onClick={() => handleAssign(athlete.id)}
                      >
                        {busyAthleteId === athlete.id
                          ? "Agregando…"
                          : "+ Agregar"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
