"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import RoleNavbar from "@/components/role-navbar";
import { formatDateTime, formatDay, STATUS_STYLES } from "@/lib/absence-review";
import { dashboardPath, type Role } from "@/lib/auth";
import {
  fetchMyTrainingAbsenceRequest,
  type MyTrainingAbsenceRequest,
} from "@/lib/training-absence-requests";
import { useRoleSession } from "@/lib/use-role-session";

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="notification-detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function NotificationRequestDetail({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { session, logout, handleAuthError } = useRoleSession();
  const [request, setRequest] = useState<MyTrainingAbsenceRequest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    if (!session.user.roles.includes("athlete")) {
      router.replace(dashboardPath((session.user.roles[0] ?? "athlete") as Role));
      return;
    }
    fetchMyTrainingAbsenceRequest(requestId)
      .then((result) => {
        setRequest(result);
        setError("");
      })
      .catch((err) => {
        handleAuthError(err);
        setError(err instanceof Error ? err.message : "No fue posible abrir la solicitud.");
      });
  }, [requestId, session, handleAuthError, router]);

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando tu solicitud…</p>
      </main>
    );
  }

  const role = (session.user.roles[0] ?? "athlete") as Role;
  const statusClass = STATUS_STYLES[request?.status ?? ""] ?? "bg-slate-100 text-slate-700";

  return (
    <main className="role-page tournaments-page">
      <RoleNavbar role={role} fullName={session.user.fullName} onLogout={logout} />
      <section className="tournaments-content notification-request-content">
        <Link className="back-link" href="/mis-competencias">← Volver a mis competencias</Link>

        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SPORTPASS · SEGUIMIENTO</p>
            <h1>Detalle de la solicitud</h1>
            <p>Consulta la respuesta de tu entrenador y la información de tu entrenamiento.</p>
          </div>
          {request && (
            <span className={"notification-request-status " + statusClass}>
              {request.statusLabel}
            </span>
          )}
        </div>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {!request && !error && <p className="admin-loading">Cargando los datos de la solicitud…</p>}

        {request && (
          <>
            {request.status === "rejected_by_coach" && (
              <aside className="notification-request-callout is-rejected">
                <span aria-hidden="true">!</span>
                <div>
                  <strong>Solicitud rechazada</strong>
                  <p>{request.rejectionComment || "El entrenador no registró un motivo."}</p>
                </div>
              </aside>
            )}
            {request.status === "approved_by_coach" && (
              <aside className="notification-request-callout is-approved">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Solicitud avalada</strong>
                  <p>
                    {request.teacherEmailSentAt
                      ? "El correo al docente fue enviado el " + formatDateTime(request.teacherEmailSentAt) + "."
                      : "El envío del correo al docente aún no tiene confirmación."}
                  </p>
                </div>
              </aside>
            )}

            <article className="notification-request-card">
              <header>
                <p className="eyebrow">SOLICITUD DE AUSENCIA</p>
                <h2>{request.competition.name}</h2>
                <p>{request.competition.teamName} · Entrenamiento del {formatDay(request.trainingDate)}</p>
              </header>

              <dl className="notification-request-grid">
                <DetailField label="Fecha del entrenamiento">{formatDay(request.trainingDate)}</DetailField>
                <DetailField label="Horario">{request.startTime}–{request.endTime}</DetailField>
                <DetailField label="Competencia">{request.competition.name}</DetailField>
                <DetailField label="Equipo">{request.competition.teamName}</DetailField>
                <DetailField label="Materia">{request.subjectName}</DetailField>
                <DetailField label="Docente">{request.teacherName}</DetailField>
                <DetailField label="Correo del docente">
                  <a href={"mailto:" + request.teacherEmail}>{request.teacherEmail}</a>
                </DetailField>
                <DetailField label="Fecha de solicitud">{formatDateTime(request.createdAt)}</DetailField>
                <DetailField label="Respuesta del entrenador">
                  {formatDateTime(request.coachRespondedAt) ?? "Sin respuesta registrada"}
                </DetailField>
              </dl>

              <footer>
                <span>Este aviso es informativo sobre tu entrenamiento deportivo.</span>
                {request.status === "approved_by_coach" && (
                  <span>El aval no reemplaza una incapacidad ni un permiso oficial de Bienestar Universitario.</span>
                )}
              </footer>
            </article>
          </>
        )}

        <Link className="notification-request-home-link" href={dashboardPath(role)}>
          Ir a mi inicio
        </Link>
      </section>
    </main>
  );
}
