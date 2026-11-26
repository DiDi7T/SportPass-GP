"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelTrainingAbsenceRequest,
  fetchMyTrainingAbsenceRequest,
  fetchMyTrainingAbsenceRequests,
  type MyTrainingAbsenceRequest,
} from "@/lib/training-absence-requests";
import { useRoleSession } from "@/lib/use-role-session";

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = (value: string) => DATE_FORMAT.format(new Date(`${value}T12:00:00`));
const dateTime = (value: string | null) => value ? DATE_TIME_FORMAT.format(new Date(value)) : null;
const statusClass = (status: string) => status.replace(/[^a-z0-9_-]/gi, "");

export default function TrainingAbsenceRequestsPanel() {
  const { handleAuthError } = useRoleSession();
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<MyTrainingAbsenceRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MyTrainingAbsenceRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = await fetchMyTrainingAbsenceRequests();
      setRequests(current);
      setError("");
      if (selectedId) {
        const updatedDetail = await fetchMyTrainingAbsenceRequest(selectedId);
        setDetail(updatedDetail);
        setDetailError("");
      }
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible consultar tus solicitudes.");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, selectedId]);

  useEffect(() => {
    if (isOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = window.setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [isOpen, refresh]);

  async function openRequests() {
    setIsOpen(true);
    setLoading(true);
    setError("");
    try {
      setRequests(await fetchMyTrainingAbsenceRequests());
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible consultar tus solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDetail(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      setDetailError("");
      return;
    }
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setDetail(await fetchMyTrainingAbsenceRequest(id));
    } catch (err) {
      handleAuthError(err);
      setDetailError(err instanceof Error ? err.message : "No fue posible consultar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  }

  // HU13 CA2: confirmación modal previa; CA1/CA3: el backend vuelve a validar estado.
  async function cancelRequest(id: string) {
    if (!window.confirm('¿Confirmas que deseas cancelar esta solicitud pendiente?')) return;
    setCancellingId(id);
    setError('');
    try {
      await cancelTrainingAbsenceRequest(id);
      await refresh();
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la solicitud.');
    } finally {
      setCancellingId(null);
    }
  }

  function closeRequests() {
    setIsOpen(false);
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
  }

  return (
    <>
      <section className="training-requests-launcher" aria-label="Seguimiento de solicitudes">
        <div>
          <h2>¿Ya enviaste una solicitud?</h2>
          <p>Consulta su estado y revisa la respuesta de tu entrenador.</p>
        </div>
        <button type="button" className="btn-primary training-requests-open" onClick={() => void openRequests()}>
          Mis solicitudes
        </button>
      </section>

      <dialog
        ref={dialog}
        className="training-requests-dialog"
        aria-labelledby="training-requests-title"
        onClose={() => {
          if (isOpen) closeRequests();
        }}
      >
        <div className="training-requests-dialog-content">
          <header className="training-requests-heading">
            <div>
              <p className="eyebrow">SEGUIMIENTO</p>
              <h2 id="training-requests-title">Mis solicitudes</h2>
              <p>Consulta el estado y la trazabilidad de tus solicitudes.</p>
            </div>
            <div className="training-requests-actions">
              <button type="button" className="btn-secondary" onClick={() => void refresh()} disabled={loading}>
                Actualizar
              </button>
              <button type="button" className="btn-secondary" onClick={closeRequests} aria-label="Cerrar mis solicitudes">
                Cerrar
              </button>
            </div>
          </header>

          {error && <p className="admin-error" role="alert">{error}</p>}
          {loading && <p className="admin-loading">Cargando tus solicitudes…</p>}
          {!loading && requests?.length === 0 && (
            <p className="training-requests-empty">Aún no has registrado solicitudes de ausencia.</p>
          )}

          {requests && requests.length > 0 && (
            <div className="training-requests-table-wrap">
              <table className="training-requests-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha del entrenamiento</th>
                    <th scope="col">Materia</th>
                    <th scope="col">Docente destinatario</th>
                    <th scope="col">Fecha de creación</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span className="sr-only">Detalle</span></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => (
                    <tr key={request.id} className={selectedId === request.id ? "is-selected" : undefined}>
                      <td>{dateOnly(request.trainingDate)}<span className="training-requests-time">{request.startTime}–{request.endTime}</span></td>
                      <td>{request.subjectName}</td>
                      <td>{request.teacherName}<a href={`mailto:${request.teacherEmail}`}>{request.teacherEmail}</a></td>
                      <td>{dateTime(request.createdAt)}</td>
                      <td>
                        <span className={`training-request-status is-${statusClass(request.status)}`}>
                          {request.statusLabel}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="training-request-detail-toggle"
                          aria-expanded={selectedId === request.id}
                          onClick={() => void toggleDetail(request.id)}
                        >
                          {selectedId === request.id ? "Ocultar" : "Ver detalles"}
                        </button>
                        {request.status === 'pending_coach_approval' && (
                          <button type="button" disabled={cancellingId !== null}
                            onClick={() => void cancelRequest(request.id)}
                            className="ml-3 font-semibold text-red-700 hover:underline disabled:opacity-50">
                            {cancellingId === request.id ? 'Cancelando…' : 'Cancelar solicitud'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedId && (
            <section className="training-request-detail" aria-label="Detalle de la solicitud">
              {detailLoading && <p className="admin-loading">Cargando detalle…</p>}
              {detailError && <p className="admin-error" role="alert">{detailError}</p>}
              {detail && detail.id === selectedId && (
                <>
                  <h3>Detalle de la solicitud</h3>
                  <dl>
                    <div><dt>Competencia</dt><dd>{detail.competition.name} · {detail.competition.teamName}</dd></div>
                    <div><dt>Entrenamiento</dt><dd>{dateOnly(detail.trainingDate)}, {detail.startTime}–{detail.endTime}</dd></div>
                    <div><dt>Materia</dt><dd>{detail.subjectName}</dd></div>
                    <div><dt>Docente</dt><dd>{detail.teacherName} · <a href={`mailto:${detail.teacherEmail}`}>{detail.teacherEmail}</a></dd></div>
                    <div><dt>Creada</dt><dd>{dateTime(detail.createdAt)}</dd></div>
                    <div>
                      <dt>Respuesta del entrenador</dt>
                      <dd>{dateTime(detail.coachRespondedAt) ?? "Aún no hay respuesta registrada."}</dd>
                    </div>
                    {detail.status === "rejected_by_coach" && (
                      <div>
                        <dt>Motivo del rechazo</dt>
                        <dd>{detail.rejectionComment || "El entrenador aún no registra una justificación."}</dd>
                      </div>
                    )}
                    {detail.status === "approved_by_coach" && (
                      <div>
                        <dt>Notificación al docente</dt>
                        <dd>
                          {dateTime(detail.teacherEmailSentAt)
                            ? `Correo enviado el ${dateTime(detail.teacherEmailSentAt)}.`
                            : "Aún no hay confirmación de envío del correo."}
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              )}
            </section>
          )}
        </div>
      </dialog>
    </>
  );
}
