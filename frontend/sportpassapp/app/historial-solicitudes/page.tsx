"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import RoleNavbar from "@/components/role-navbar";
import { STATUS_OPTIONS } from "@/lib/absence-review";
import { dashboardPath } from "@/lib/auth";
import {
  downloadMyTrainingAbsenceRequestPdf,
  fetchMyAbsenceRequestHistory,
  type AbsenceRequestHistoryFilters,
  type MyTrainingAbsenceRequest,
} from "@/lib/training-absence-requests";
import { useRoleSession } from "@/lib/use-role-session";

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = (value: string) => DATE_FORMAT.format(new Date(`${value}T12:00:00`));
const dateTime = (value: string | null) => (value ? DATE_TIME_FORMAT.format(new Date(value)) : null);
const statusClass = (status: string) => status.replace(/[^a-z0-9_-]/gi, "");
// Semestres de Icesi: enero–junio y julio–diciembre.
function currentSemester(today = new Date()) {
  const year = today.getFullYear();
  return today.getMonth() < 6
    ? { from: `${year}-01-01`, to: `${year}-06-30` }
    : { from: `${year}-07-01`, to: `${year}-12-31` };
}

const EMPTY_FILTERS: AbsenceRequestHistoryFilters = { status: "", from: "", to: "", subject: "" };

export default function RequestHistoryPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const [form, setForm] = useState<AbsenceRequestHistoryFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AbsenceRequestHistoryFilters>(EMPTY_FILTERS);
  const [requests, setRequests] = useState<MyTrainingAbsenceRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchMyAbsenceRequestHistory(applied)
      .then((list) => {
        setRequests(list);
        setError(null);
      })
      .catch((err) => {
        handleAuthError(err);
        setRequests(null);
        setError(err.message);
      });
    // handleAuthError solo redirige; no debe volver a disparar la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, applied]);

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando tu historial…</p>
      </main>
    );
  }
  const role = session.user.roles[0];
  const hasFilters = Object.values(applied).some((value) => value);

  const set = (field: keyof AbsenceRequestHistoryFilters) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  function search(event: FormEvent) {
    event.preventDefault();
    if (form.from && form.to && form.from > form.to) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setRequests(null);
    setSelectedId(null);
    setApplied({ ...form });
  }

  function fillSemester() {
    const semester = currentSemester();
    setForm((current) => ({ ...current, ...semester }));
  }

  function clear() {
    setForm(EMPTY_FILTERS);
    setRequests(null);
    setSelectedId(null);
    // Objeto nuevo para que la consulta se repita aunque ya no hubiera filtros.
    setApplied({ ...EMPTY_FILTERS });
  }

  return (
    <main className="role-page tournaments-page">
      <RoleNavbar role={role} fullName={session.user.fullName} onLogout={logout} />
      <section className="tournaments-content">
        <Link className="back-link" href={dashboardPath(role)}>← Volver a mi inicio</Link>

        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SPORTPASS · HISTORIAL</p>
            <h1>Historial de solicitudes</h1>
            <p>Lleva el control de las clases a las que has faltado por entrenamientos de competencia.</p>
          </div>
          {requests && <span className="role-chip">{requests.length} {requests.length === 1 ? "solicitud" : "solicitudes"}</span>}
        </div>

        {/* CA1: filtros por rango de fechas del entrenamiento, estado y materia. */}
        <form onSubmit={search} className="admin-panel history-filters" aria-label="Filtros del historial">
          <label>
            Desde
            <input type="date" className="input" value={form.from} max={form.to || undefined} onChange={set("from")} />
          </label>
          <label>
            Hasta
            <input type="date" className="input" value={form.to} min={form.from || undefined} onChange={set("to")} />
          </label>
          <label>
            Estado
            <select className="input" value={form.status} onChange={set("status")}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Materia
            <input className="input" value={form.subject} onChange={set("subject")} maxLength={200} placeholder="Ej. Cálculo" />
          </label>
          <div className="history-filter-actions">
            <button type="button" className="btn-secondary" onClick={fillSemester}>Este semestre</button>
            <button type="button" className="btn-secondary" onClick={clear}>Limpiar</button>
            <button className="btn-primary">Filtrar</button>
          </div>
        </form>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {requests === null && !error && <p className="admin-loading">Cargando tu historial…</p>}
        {requests?.length === 0 && (
          <p className="training-requests-empty">
            {hasFilters ? "No hay solicitudes con esos filtros." : "Aún no has registrado solicitudes de ausencia."}
          </p>
        )}

        {/* CA2: del entrenamiento más reciente al más antiguo (lo ordena el backend). */}
        {requests && requests.length > 0 && (
          <div className="training-requests-table-wrap">
            <table className="training-requests-table">
              <thead>
                <tr>
                  <th scope="col">Fecha del entrenamiento</th>
                  <th scope="col">Competencia</th>
                  <th scope="col">Materia</th>
                  <th scope="col">Docente</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Respuesta del entrenador</th>
                  <th scope="col"><span className="sr-only">Detalle</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <HistoryRow
                    key={request.id}
                    request={request}
                    open={selectedId === request.id}
                    onToggle={() => setSelectedId(selectedId === request.id ? null : request.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

// CA3: descarga del comprobante PDF de HU15. El backend valida que la solicitud sea propia y esté aprobada.
function PermitPdfButton({ requestId }: { requestId: string }) {
  const { handleAuthError } = useRoleSession();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      await downloadMyTrainingAbsenceRequestPdf(requestId);
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No se pudo descargar el comprobante.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => void download()} disabled={downloading}>
        {downloading ? "Descargando…" : "Descargar comprobante"}
      </button>
      {error && <span role="alert" className="history-pdf-error">{error}</span>}
    </>
  );
}

function HistoryRow({ request, open, onToggle }: { request: MyTrainingAbsenceRequest; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={open ? "is-selected" : undefined}>
        <td>{dateOnly(request.trainingDate)}<span className="training-requests-time">{request.startTime}–{request.endTime}</span></td>
        <td>{request.competition.name}</td>
        <td>{request.subjectName}</td>
        <td>{request.teacherName}</td>
        <td>
          <span className={`training-request-status is-${statusClass(request.status)}`}>{request.statusLabel}</span>
        </td>
        <td>{dateTime(request.coachRespondedAt) ?? "Sin respuesta"}</td>
        <td>
          <button type="button" className="training-request-detail-toggle" aria-expanded={open} onClick={onToggle}>
            {open ? "Ocultar" : "Ver detalles"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="history-detail-row">
          <td colSpan={7}>
            {/* CA3 y CA4: solo consulta; no hay opciones para editar ni eliminar. */}
            <section className="training-request-detail" aria-label="Detalle de la solicitud">
              <dl>
                <div><dt>Competencia</dt><dd>{request.competition.name} · {request.competition.teamName}</dd></div>
                <div><dt>Entrenamiento</dt><dd>{dateOnly(request.trainingDate)}, {request.startTime}–{request.endTime}</dd></div>
                <div><dt>Materia</dt><dd>{request.subjectName}</dd></div>
                <div><dt>Docente</dt><dd>{request.teacherName} · <a href={`mailto:${request.teacherEmail}`}>{request.teacherEmail}</a></dd></div>
                <div><dt>Creada</dt><dd>{dateTime(request.createdAt)}</dd></div>
                <div><dt>Respuesta del entrenador</dt><dd>{dateTime(request.coachRespondedAt) ?? "Aún no hay respuesta registrada."}</dd></div>
                {request.status === "rejected_by_coach" && (
                  <div><dt>Motivo del rechazo</dt><dd>{request.rejectionComment || "El entrenador no registró una justificación."}</dd></div>
                )}
                {request.status === "approved_by_coach" && (
                  <>
                    <div>
                      <dt>Correo al docente</dt>
                      <dd>
                        {dateTime(request.teacherEmailSentAt)
                          ? `Enviado a ${request.teacherEmail} el ${dateTime(request.teacherEmailSentAt)}`
                          : "Aún no hay confirmación de envío del correo."}
                      </dd>
                    </div>
                    <div>
                      <dt>Comprobante</dt>
                      <dd><PermitPdfButton requestId={request.id} /></dd>
                    </div>
                  </>
                )}
              </dl>
            </section>
          </td>
        </tr>
      )}
    </>
  );
}
