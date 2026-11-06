"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  COMPETITION_TYPES,
  createCompetition,
  fetchMyTeams,
  MESSAGES,
  scheduleError,
  TYPE_LABELS,
  type CompetitionForm,
  type Team,
} from "@/lib/competitions";
import { useCompetitionPermissions } from "../session";

const EMPTY: CompetitionForm = { name: "", teamId: "", startDate: "", endDate: "", startTime: "", endTime: "", location: "", type: "" };
const FIELD_LABELS: Record<keyof CompetitionForm, string> = {
  name: "Nombre del torneo",
  teamId: "Equipo",
  startDate: "Fecha de inicio",
  endDate: "Fecha de fin",
  startTime: "Hora de inicio",
  endTime: "Hora de fin",
  location: "Lugar",
  type: "Tipo",
};

export default function NewCompetitionPage() {
  const router = useRouter();
  const { canCreate, isAthlete } = useCompetitionPermissions();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [form, setForm] = useState<CompetitionForm>(EMPTY);
  const [missing, setMissing] = useState<Set<keyof CompetitionForm>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canCreate || isAthlete) return;

    fetchMyTeams()
      .then((list) => {
        setTeams(list);
        if (list.length === 1) setForm((current) => ({ ...current, teamId: list[0].id }));
      })
      .catch((err) => setError(err.message));
  }, [canCreate, isAthlete]);

  const set = (field: keyof CompetitionForm) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setMissing((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate || isAthlete) return;

    const empty = (Object.keys(form) as (keyof CompetitionForm)[]).filter((field) => !form[field].trim());
    setMissing(new Set(empty));
    if (empty.length) return setError(MESSAGES.required);
    const invalidSchedule = scheduleError(form);
    if (invalidSchedule) return setError(invalidSchedule);

    setSubmitting(true);
    setError(null);
    try {
      const created = await createCompetition(form);
      // Con cacheComponents, Next.js conserva esta página oculta (Activity) al navegar:
      // hay que dejar el formulario limpio para cuando el entrenador registre otra.
      setForm({ ...EMPTY, teamId: teams?.length === 1 ? teams[0].id : "" });
      setSubmitting(false);
      router.push(`/competencias?equipo=${created.team.id}&creada=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la competencia.");
      setSubmitting(false);
    }
  }

  const fieldClass = (field: keyof CompetitionForm) => `input mt-1 ${missing.has(field) ? "input-invalid" : ""}`;
  const label = (field: keyof CompetitionForm) => (
    <span>
      {FIELD_LABELS[field]} <span className="text-[#9a2929]" aria-hidden>*</span>
    </span>
  );

  if (!canCreate || isAthlete) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="admin-error" role="alert">
          <p className="font-bold text-base">Acceso restringido</p>
          <p className="mt-1">
            Los deportistas no tienen permisos para registrar una competencia. Esta acción está reservada para entrenadores y administradores.
          </p>
          <div className="pt-3">
            <Link href="/competencias" className="btn-secondary">
              Volver a competencias
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (teams && teams.length === 0) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="admin-loading">No tienes equipos a cargo. Pide a un administrador que te asigne como entrenador de un equipo.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5 text-base">
      <BackLink />
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">SPORTPASS · COMPETENCIAS</p>
          <h1>Registrar competencia</h1>
          <p>Los campos marcados con * son obligatorios.</p>
        </div>
      </div>

      <label className="block font-bold">
        {label("name")}
        <input className={fieldClass("name")} value={form.name} onChange={set("name")} maxLength={160} placeholder="Ej. Juegos Universitarios ASCUN" />
      </label>

      <label className="block font-bold">
        {label("teamId")}
        <select className={fieldClass("teamId")} value={form.teamId} onChange={set("teamId")} disabled={!teams}>
          <option value="">{teams ? "Selecciona un equipo" : "Cargando equipos…"}</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block font-bold">
          {label("startDate")}
          <input type="date" className={fieldClass("startDate")} value={form.startDate} onChange={set("startDate")} />
        </label>
        <label className="block font-bold">
          {label("startTime")}
          <input type="time" className={fieldClass("startTime")} value={form.startTime} onChange={set("startTime")} />
        </label>
        <label className="block font-bold">
          {label("endDate")}
          <input type="date" className={fieldClass("endDate")} value={form.endDate} min={form.startDate || undefined} onChange={set("endDate")} />
        </label>
        <label className="block font-bold">
          {label("endTime")}
          <input type="time" className={fieldClass("endTime")} value={form.endTime} onChange={set("endTime")} />
        </label>
      </div>

      <label className="block font-bold">
        {label("location")}
        <input className={fieldClass("location")} value={form.location} onChange={set("location")} maxLength={200} placeholder="Ej. Coliseo Universidad Icesi" />
      </label>

      <fieldset className="font-bold">
        <legend>{label("type")}</legend>
        <div className={`mt-2 flex gap-2 rounded-lg ${missing.has("type") ? "ring-2 ring-red-500" : ""}`}>
          {COMPETITION_TYPES.map((type) => (
            <label key={type} className="flex-1">
              <input type="radio" name="type" value={type} checked={form.type === type} onChange={set("type")} className="peer sr-only" />
              <span className="block cursor-pointer rounded-[10px] border border-(--line) px-3 py-2.5 text-center font-normal peer-checked:border-(--icesi) peer-checked:bg-(--icesi) peer-checked:font-bold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-(--icesi)">
                {TYPE_LABELS[type]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="admin-error">{error}</p>}

      <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}

function BackLink() {
  return <Link href="/competencias" className="back-link">← Volver a competencias</Link>;
}
