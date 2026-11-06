"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoleNavbar from "@/components/role-navbar";
import AcademicConflictsPanel from "@/components/academic-conflicts-panel";
import { dashboardPath } from "@/lib/auth";
import { TYPE_LABELS } from "@/lib/competitions";
import {
  attendanceBlock,
  fetchMyCompetitions,
  formatMyCompetitionRange,
  sessionsToReachMinimum,
  type AttendanceBlock,
  type MyCompetitionsResponse,
} from "@/lib/my-competitions";
import { dateBadge } from "@/lib/tournaments";
import { useRoleSession } from "@/lib/use-role-session";
import { MatchStatusPill } from "../torneos/status-pill";

// Titular motivador: cuántos entrenamientos seguidos le faltan (en un solo deporte).
function motivation(block: AttendanceBlock) {
  if (block.sports.length !== 1) return "Estás cerca de volver a competir";
  const missing = sessionsToReachMinimum(block.sports[0], block.minimumPercentage);
  if (missing <= 1) return "¡Estás a un entrenamiento de ver tus competencias!";
  return `Estás a ${missing} entrenamientos de ver tus competencias`;
}

export default function MyCompetitionsPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const [data, setData] = useState<MyCompetitionsResponse | null>(null);
  const [block, setBlock] = useState<AttendanceBlock | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Next conserva el estado de la página al volver a ella: cada respuesta reemplaza
    // por completo la anterior para no mezclar un bloqueo viejo con datos nuevos.
    fetchMyCompetitions()
      .then((result) => {
        setData(result);
        setBlock(null);
        setError(null);
      })
      .catch((err) => {
        handleAuthError(err);
        const attendance = attendanceBlock(err);
        setData(null);
        setBlock(attendance);
        setError(attendance ? null : err.message);
      });
    // handleAuthError solo redirige; no debe volver a disparar la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando tus competencias…</p>
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
            <p className="eyebrow">SPORTPASS · MIS COMPETENCIAS</p>
            <h1>Mis competencias</h1>
            <p>Organiza tus compromisos académicos y deportivos con los partidos a los que estás convocado.</p>
          </div>
          {data && (
            <span className="role-chip">Asistencia {data.attendancePercentage}%</span>
          )}
        </div>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {!data && !block && !error && <p className="admin-loading">Cargando tus competencias…</p>}

        {/* CA3: menos del 70% de asistencia → se oculta la lista. */}
        {block && (
          <div className="attendance-block">
            <span className="attendance-block-icon" aria-hidden="true">↗</span>
            <div>
              <p className="eyebrow">SIGUE ENTRENANDO</p>
              <h2>{motivation(block)}</h2>
              {/* Texto de CA3, en tono informativo. */}
              <p className="attendance-block-message">{block.message}</p>
              <div
                className="attendance-meter"
                role="meter"
                aria-label="Tu asistencia a entrenamientos"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={block.attendancePercentage}
              >
                <span style={{ width: `${Math.max(block.attendancePercentage, 2)}%` }} />
                <i style={{ left: `${block.minimumPercentage}%` }} aria-hidden="true" />
              </div>
              <p className="attendance-meter-legend">
                <span>Vas en <strong>{block.attendancePercentage}%</strong></span>
                <span>Meta: <strong>{block.minimumPercentage}%</strong></span>
              </p>
              {block.sports.length > 1 && (
                <ul className="attendance-sports">
                  {block.sports.map((sport) => (
                    <li key={sport.sport}>
                      {sport.sport}: {sport.attendedSessions} de {sport.totalSessions} entrenamientos ({sport.attendancePercentage}%)
                    </li>
                  ))}
                </ul>
              )}
              <p className="attendance-hint">
                Cada entrenamiento cuenta: cuando llegues a la meta, tus competencias aparecerán aquí automáticamente.
              </p>
            </div>
          </div>
        )}

        {/* Caso borde: cumple en algunos deportes y en otros no. */}
        {data && data.blockedSports.length > 0 && (
          <p className="attendance-note">
            <strong>¿Te falta algún deporte?</strong> Las competencias de{" "}
            {data.blockedSports.map((sport) => `${sport.sport} (vas en ${sport.attendancePercentage}%)`).join(", ")}{" "}
            aparecerán cuando tu asistencia llegue al {data.minimumPercentage}%. ¡Sigue entrenando!
          </p>
        )}

        {/* CA2: sin convocatorias. */}
        {data?.competitions.length === 0 && (
          <div className="role-welcome-card my-competitions-empty">
            <img src="/images/icesi-balon-de-basket.svg" alt="" />
            <div>
              <p className="eyebrow">SIN CONVOCATORIAS</p>
              <h3>Actualmente no tienes competencias programadas</h3>
              <p>Cuando tu equipo tenga un partido próximo, lo verás aquí.</p>
            </div>
          </div>
        )}

        {/* CA1: fecha, lugar y rival de cada partido. */}
        {data && data.competitions.length > 0 && (
          <ul className="match-list" aria-label="Mis competencias">
            {data.competitions.map((competition) => {
              const date = dateBadge(competition.startDate);
              return (
                <li key={competition.id}>
                  <article className={`match-card my-competition-card is-${competition.status}`}>
                    <span className="match-date">
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </span>
                    <span className="match-info">
                      <span className="match-tournament">{competition.name}</span>
                      <strong className="match-teams">
                        {competition.team.name} vs {competition.opponent ?? "Rival por confirmar"}
                      </strong>
                      <span>{formatMyCompetitionRange(competition)}</span>
                      <span>
                        {competition.location}
                        {competition.venueAddress && ` · ${competition.venueAddress}`}
                      </span>
                    </span>
                    <span className="match-tags">
                      <MatchStatusPill status={competition.status} />
                      <span className="match-type">{competition.team.sport} · {TYPE_LABELS[competition.type]}</span>
                    </span>
                    <AcademicConflictsPanel competitionId={competition.id} />
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
