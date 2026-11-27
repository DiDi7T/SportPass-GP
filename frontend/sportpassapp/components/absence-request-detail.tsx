"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDateTime, formatDay, STATUS_STYLES, type ReviewedAbsenceRequest } from "@/lib/absence-review";

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"}`}>
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

// Vista de solo lectura: no ofrece acciones sobre la solicitud (HU20 CA3). La aprobación o el
// rechazo por parte del entrenador corresponden a HU17.
export default function AbsenceRequestDetail({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: ReviewedAbsenceRequest;
  onClose: () => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');

  async function perform(action: 'approve' | 'reject') {
    if (working) return;
    if (action === 'approve' && !window.confirm('¿Confirmas la aprobación de esta solicitud?')) return;
    if (action === 'reject' && !reason.trim()) {
      setActionError('Debes escribir el motivo del rechazo.'); return;
    }
    setWorking(true); setActionError('');
    try {
      if (action === 'approve') await onApprove?.(request.id);
      else await onReject?.(request.id, reason.trim());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No fue posible procesar la solicitud.');
    } finally { setWorking(false); }
  }

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const { athlete, competition } = request;
  const responded = formatDateTime(request.coachRespondedAt);
  const emailSent = formatDateTime(request.teacherEmailSentAt);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="absence-request-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="space-y-4 p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Solicitud de ausencia</p>
            <h2 id="absence-request-title" className="text-xl font-bold">{athlete.fullName}</h2>
            <p className="text-sm text-slate-500">Entrenamiento del {formatDay(request.trainingDate)} · {request.startTime} – {request.endTime}</p>
          </div>
          <StatusBadge status={request.status} label={request.statusLabel} />
        </header>

        {request.officialCallup ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <strong>Convocado oficialmente</strong> a {competition.name} ({competition.team.name}).
          </p>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Sin convocatoria registrada</strong> para {competition.name}. Verifica con el entrenador.
          </p>
        )}

        <Section title="Deportista">
          <Field label="Nombre">{athlete.fullName}</Field>
          <Field label="Código estudiantil">{athlete.studentCode}</Field>
          <Field label="Correo">{athlete.email}</Field>
          <Field label={request.coaches.length > 1 ? "Entrenadores" : "Entrenador"}>
            {request.coaches.length
              ? request.coaches.map((coach) => <span key={coach.email} className="block">{coach.fullName} · {coach.email}</span>)
              : "Sin entrenador asignado"}
          </Field>
        </Section>

        <Section title="Entrenamiento y asignatura">
          <Field label="Fecha y horario del entrenamiento">{formatDay(request.trainingDate)} · {request.startTime} – {request.endTime}</Field>
          <Field label="Asignatura afectada">{request.subjectName}</Field>
          <Field label="Docente">{request.teacherName}</Field>
          <Field label="Correo del docente">{request.teacherEmail}</Field>
        </Section>

        <Section title="Competencia">
          <Field label="Nombre">{competition.name}</Field>
          <Field label="Equipo">{competition.team.name} ({competition.team.sport})</Field>
          <Field label="Inicio">{formatDay(competition.startDate)} · {competition.startTime}</Field>
          <Field label="Fin">{formatDay(competition.endDate)} · {competition.endTime}</Field>
          <Field label="Lugar">{competition.location}</Field>
        </Section>

        <Section title="Seguimiento">
          <Field label="Solicitada">{formatDateTime(request.createdAt)}</Field>
          <Field label="Respuesta del entrenador">{responded ?? "Sin respuesta"}</Field>
          {request.rejectionComment && <Field label="Motivo del rechazo">{request.rejectionComment}</Field>}
          <Field label="Correo al docente">{emailSent ? `Enviado el ${emailSent}` : "Sin confirmación de envío"}</Field>
        </Section>

        {onApprove && onReject && request.status === 'pending_coach_approval' && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Decisión del entrenador">
            <h3 className="font-bold text-slate-900">Responder solicitud</h3>
            <p className="text-sm text-slate-600">La decisión es definitiva. Verifica la convocatoria antes de aprobar.</p>
            {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={working} onClick={() => void perform('approve')}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Aprobar</button>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Motivo del rechazo (obligatorio)
              <textarea rows={2} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="Ejemplo: deportista no convocado" />
            </label>
            <button type="button" disabled={working || !reason.trim()} onClick={() => void perform('reject')}
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Rechazar solicitud</button>
          </section>
        )}

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
}
