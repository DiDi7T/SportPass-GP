"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoleNavbar from "@/components/role-navbar";
import { dashboardPath } from "@/lib/auth";
import { TYPE_LABELS } from "@/lib/competitions";
import { dateBadge, fetchMatches, formatMatchRange, matchup, type Match } from "@/lib/tournaments";
import { useRoleSession } from "@/lib/use-role-session";
import { MatchStatusPill } from "./status-pill";

export default function TournamentsPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchMatches()
      .then(setMatches)
      .catch((err) => {
        handleAuthError(err);
        setError(err.message);
      });
    // handleAuthError solo redirige; no debe volver a disparar la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando la programación…</p>
      </main>
    );
  }
  const role = session.user.roles[0];

  return (
    <main className="role-page tournaments-page">
      <RoleNavbar role={role} fullName={session.user.fullName} onLogout={logout} />
      <section className="tournaments-content">
        <Link className="back-link" href={dashboardPath(role)}>← Volver a mi inicio</Link>

        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SPORTPASS · OFERTA DE TORNEOS</p>
            <h1>Programación de partidos</h1>
            <p>Consulta dónde y cuándo juegan los equipos representativos de Icesi.</p>
          </div>
          {matches && <span className="role-chip">{matches.length} partidos</span>}
        </div>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {matches === null && !error && <p className="admin-loading">Cargando partidos…</p>}
        {matches?.length === 0 && <p className="admin-loading">Aún no hay partidos programados.</p>}

        <ul className="match-list" aria-label="Partidos">
          {matches?.map((match) => {
            const date = dateBadge(match.startDate);
            return (
              <li key={match.id}>
                <Link href={`/torneos/${match.id}`} className={`match-card is-${match.status}`}>
                  <span className="match-date">
                    <strong>{date.day}</strong>
                    <span>{date.month}</span>
                  </span>
                  <span className="match-info">
                    <span className="match-tournament">{match.tournament}</span>
                    <strong className="match-teams">{matchup(match)}</strong>
                    <span>{formatMatchRange(match)}</span>
                    <span>{match.venue.name}</span>
                  </span>
                  <span className="match-tags">
                    <MatchStatusPill status={match.status} />
                    <span className="match-type">{match.teams.sport} · {TYPE_LABELS[match.type]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
