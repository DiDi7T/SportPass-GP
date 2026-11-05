"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import { getMyTeams, type Team } from "@/lib/teams";

function getSportIcon(sport: string) {
  const s = (sport || "").toLowerCase();
  if (s.includes("fút") || s.includes("fut") || s.includes("socc")) return "⚽";
  if (s.includes("balon") || s.includes("básk") || s.includes("bask")) return "🏀";
  if (s.includes("vol") || s.includes("volei")) return "🏐";
  if (s.includes("ten") || s.includes("squash")) return "🎾";
  if (s.includes("nat") || s.includes("swim")) return "🏊";
  if (s.includes("atl") || s.includes("run") || s.includes("pista")) return "🏃";
  if (s.includes("ajedrez") || s.includes("chess")) return "♟";
  if (s.includes("rugby")) return "🏉";
  if (s.includes("beis") || s.includes("base")) return "⚾";
  return "♜";
}

export default function CoachTeamsPage() {
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();

  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Verificar que el usuario tenga el rol de entrenador.
  useEffect(() => {
    if (session && !session.user.roles.includes("coach")) {
      router.replace("/login");
    }
  }, [session, router]);

  // Consultar los equipos asignados al entrenador.
  useEffect(() => {
    if (!session || !session.user.roles.includes("coach")) return;

    let active = true;

    async function loadTeams() {
      try {
        setLoading(true);
        setError("");

        const result = await getMyTeams();

        if (active) {
          setTeams(result);
        }
      } catch (err) {
        handleAuthError(err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los equipos."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      active = false;
    };
  }, [session, handleAuthError]);

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teams;

    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(term) ||
        team.sport.toLowerCase().includes(term)
    );
  }, [teams, search]);

  if (!session || !session.user.roles.includes("coach")) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando tus equipos…</p>
      </main>
    );
  }

  return (
    <main className="role-page coach-teams-page">
      <RoleNavbar
        role="coach"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <section className="coach-teams-header">
        <div>
          <p className="eyebrow">SPORTPASS · ENTRENADOR</p>
          <h1>Mis equipos</h1>
          <p>
            Consulta tus equipos y gestiona los deportistas que hacen parte de cada uno.
          </p>
        </div>

        <Link href="/coach" className="coach-back-link">
          ← Volver al inicio
        </Link>
      </section>

      <section className="coach-teams-content">
        {error && (
          <div className="roster-alert roster-alert-error">
            {error}
          </div>
        )}

        <div className="coach-teams-heading">
          <div>
            <p className="eyebrow">TUS EQUIPOS ASIGNADOS</p>
            <h2>Equipos deportivos</h2>
            <p>
              Accede a la nómina de cada disciplina y administra las incorporaciones y convocatorias.
            </p>
          </div>

          {!loading && !error && (
            <span className="coach-teams-count">
              {filteredTeams.length}{" "}
              {filteredTeams.length === 1 ? "equipo" : "equipos"}
              {search && teams.length !== filteredTeams.length ? ` (de ${teams.length})` : ""}
            </span>
          )}
        </div>

        {teams.length > 0 && !loading && (
          <div className="roster-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por nombre de equipo o deporte..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}

        {loading ? (
          <p className="dashboard-loading">Cargando equipos…</p>
        ) : error && teams.length === 0 ? (
          <div className="coach-empty-state">
            <span className="coach-empty-icon">⚠</span>
            <h3>No fue posible cargar tus equipos</h3>
            <p>{error}</p>

            <button
              className="coach-team-button"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className="coach-empty-state">
            <span className="coach-empty-icon">♜</span>
            <h3>No tienes equipos asignados</h3>
            <p>
              Cuando el administrador te asigne un equipo deportivo, podrás consultarlo
              y gestionar sus deportistas desde esta sección.
            </p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="coach-empty-state">
            <span className="coach-empty-icon">⌕</span>
            <h3>No encontramos resultados</h3>
            <p>
              No existen equipos asignados que coincidan con &ldquo;{search}&rdquo;. Intenta con otro término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="coach-teams-grid">
            {filteredTeams.map((team) => (
              <article className="coach-team-card" key={team.id}>
                <div>
                  <div className="coach-team-card-top">
                    <div className="coach-team-icon" aria-hidden="true">
                      {getSportIcon(team.sport)}
                    </div>
                    <span
                      className={`coach-team-status ${
                        team.isActive ? "is-active" : "is-inactive"
                      }`}
                    >
                      {team.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="coach-team-card-body">
                    <p className="eyebrow">{team.sport}</p>
                    <h3>{team.name}</h3>
                    <p className="coach-team-description">
                      Consulta la nómina oficial, incorpora nuevos integrantes y gestiona la convocatoria deportiva.
                    </p>
                  </div>
                </div>

                <div className="coach-team-card-footer">
                  <Link
                    href={`/coach/teams/${team.id}/roster`}
                    className="coach-team-button"
                  >
                    Gestionar deportistas
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
