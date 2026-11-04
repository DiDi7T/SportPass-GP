"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import RoleNavbar from "@/components/role-navbar";
import { ApiError } from "@/lib/api";
import { TYPE_LABELS } from "@/lib/competitions";
import { fetchMatch, formatMatchRange, type Match } from "@/lib/tournaments";
import { MatchStatusPill } from "../status-pill";
import { useRoleSession } from "@/lib/use-role-session";

// Con cacheComponents el id solo se conoce al pedir la página, así que useParams necesita Suspense.
export default function MatchPage() {
  return (
    <Suspense fallback={<main className="dashboard-shell"><p className="dashboard-loading">Cargando el partido…</p></main>}>
      <MatchDetail />
    </Suspense>
  );
}

function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { session, logout, handleAuthError } = useRoleSession();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Un id mal formado (400) es, para quien navega, lo mismo que uno inexistente (404).
    fetchMatch(id)
      .then(setMatch)
      .catch((err) => {
        handleAuthError(err);
        setError(err instanceof ApiError && err.status === 400 ? "Partido no encontrado." : err.message);
      });
    // handleAuthError solo redirige; no debe volver a disparar la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando el partido…</p>
      </main>
    );
  }

  return (
    <main className="role-page tournaments-page">
      <RoleNavbar role={session.user.roles[0]} fullName={session.user.fullName} onLogout={logout} />
      <section className="tournaments-content">
        <Link className="back-link" href="/torneos">← Volver a la programación</Link>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {!match && !error && <p className="admin-loading">Cargando el partido…</p>}

        {match && (
          <>
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">{match.teams.sport.toUpperCase()} · {TYPE_LABELS[match.type].toUpperCase()}</p>
                <h1>{match.tournament}</h1>
                <p>{match.teams.icesi} vs {match.teams.opponent ?? "Rival por confirmar"}</p>
              </div>
              <MatchStatusPill status={match.status} />
            </div>

            <div className="match-detail">
              <article className="admin-panel">
                <div className="admin-panel-heading">
                  <h2>Partido</h2>
                </div>
                <dl className="match-facts">
                  <div>
                    <dt>EQUIPOS</dt>
                    <dd>
                      {match.teams.icesi} vs {match.teams.opponent ?? <span className="match-muted">Rival por confirmar</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>FECHA Y HORA</dt>
                    <dd>{formatMatchRange(match)}</dd>
                  </div>
                  <div>
                    <dt>TORNEO</dt>
                    <dd>{match.tournament}</dd>
                  </div>
                </dl>
              </article>

              <article className="admin-panel">
                <div className="admin-panel-heading">
                  <h2>Ubicación</h2>
                </div>
                <dl className="match-facts">
                  <div>
                    <dt>ESCENARIO</dt>
                    <dd>{match.venue.name}</dd>
                  </div>
                  <div>
                    <dt>DIRECCIÓN</dt>
                    <dd>{match.venue.address ?? <span className="match-muted">No disponible</span>}</dd>
                  </div>
                </dl>
                {match.venue.address && (
                  <a
                    className="primary-button match-map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver en el mapa <span>↗</span>
                  </a>
                )}
              </article>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
