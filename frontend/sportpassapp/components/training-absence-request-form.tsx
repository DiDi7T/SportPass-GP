"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createTrainingAbsenceRequest,
  fetchEligibleCompetitions,
  type CreateTrainingAbsenceRequest,
  type EligibleCompetition,
} from "@/lib/training-absence-requests";
import { useRoleSession } from "@/lib/use-role-session";

const EMPTY_FORM: CreateTrainingAbsenceRequest = {
  competitionId: "",
  trainingDate: "",
  startTime: "",
  endTime: "",
  subjectName: "",
  teacherName: "",
  teacherEmail: "",
};

export default function TrainingAbsenceRequestForm() {
  const { handleAuthError } = useRoleSession();
  const [competitions, setCompetitions] = useState<EligibleCompetition[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetchEligibleCompetitions()
      .then(result => {
        if (!active) return;
        setCompetitions(result);
        setForm(current => ({
          ...current,
          competitionId: current.competitionId || result[0]?.id || "",
        }));
      })
      .catch(err => {
        if (!active) return;
        handleAuthError(err);
        setError(err instanceof Error ? err.message : "No fue posible consultar tus convocatorias.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [handleAuthError]);

  function update<K extends keyof CreateTrainingAbsenceRequest>(
    key: K,
    value: CreateTrainingAbsenceRequest[K],
  ) {
    setForm(current => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const request = await createTrainingAbsenceRequest(form);
      setSuccess(`Solicitud registrada. Estado: ${request.statusLabel}.`);
      setForm({ ...EMPTY_FORM, competitionId: form.competitionId });
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible registrar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="admin-panel training-absence-panel space-y-5" aria-labelledby="training-absence-title">
      <div className="admin-panel-heading">
        <div>
          <p className="eyebrow">AVISO DE ENTRENAMIENTO</p>
          <h2 id="training-absence-title">Solicitar notificación de ausencia</h2>
          <p>Registra el entrenamiento preparatorio asociado a una competencia para que lo valide tu entrenador.</p>
        </div>
      </div>

      <p className="training-absence-notice rounded-lg border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-950">
        Este trámite es un aviso de entrenamiento sujeto al aval de tu entrenador. No reemplaza las excusas oficiales emitidas por Bienestar Universitario para competencias.
      </p>

      {error && <p role="alert" className="admin-error">{error}</p>}
      {success && <p role="status" className="admin-notice">{success}</p>}
      {loading && <p className="admin-loading">Consultando tus convocatorias activas…</p>}
      {!loading && competitions?.length === 0 && (
        <p role="status" className="admin-loading">
          El formulario está disponible cuando tengas una convocatoria activa registrada para una competencia.
        </p>
      )}

      {!loading && Boolean(competitions?.length) && (
        <form className="training-absence-form grid md:grid-cols-2" onSubmit={submit}>
          <label className="field-label md:col-span-2">
            Competencia asociada
            <select
              className="input mt-1"
              required
              value={form.competitionId}
              onChange={event => update("competitionId", event.target.value)}
            >
              {competitions?.map(competition => (
                <option key={competition.id} value={competition.id}>
                  {competition.name} · {competition.team.name} ({competition.team.sport})
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Fecha del entrenamiento
            <input
              className="input mt-1"
              type="date"
              required
              value={form.trainingDate}
              onChange={event => update("trainingDate", event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">
              Desde
              <input
                className="input mt-1"
                type="time"
                required
                value={form.startTime}
                onChange={event => update("startTime", event.target.value)}
              />
            </label>
            <label className="field-label">
              Hasta
              <input
                className="input mt-1"
                type="time"
                required
                value={form.endTime}
                onChange={event => update("endTime", event.target.value)}
              />
            </label>
          </div>
          <label className="field-label">
            Materia
            <input
              className="input mt-1"
              type="text"
              maxLength={200}
              required
              value={form.subjectName}
              onChange={event => update("subjectName", event.target.value)}
            />
          </label>
          <label className="field-label">
            Nombre del docente
            <input
              className="input mt-1"
              type="text"
              maxLength={160}
              required
              value={form.teacherName}
              onChange={event => update("teacherName", event.target.value)}
            />
          </label>
          <label className="field-label md:col-span-2">
            Correo institucional del docente
            <input
              className="input mt-1"
              type="email"
              maxLength={254}
              pattern="^[^@\s]+@icesi\.edu\.co$"
              title="Debe ser un correo del dominio @icesi.edu.co"
              required
              value={form.teacherEmail}
              onChange={event => update("teacherEmail", event.target.value)}
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="training-absence-submit btn-primary" disabled={submitting}>
              {submitting ? "Registrando solicitud…" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
