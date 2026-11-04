"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { scheduleError, updateCompetition, type Competition, type ScheduleChanges } from "@/lib/competitions";

const EDITABLE = ["startDate", "startTime", "endDate", "endTime", "location"] as const;
type Editable = (typeof EDITABLE)[number];

// HU6: solo se editan fecha, hora y lugar. Se envían únicamente los campos que
// cambiaron, así el resto de la competencia se conserva sin alteraciones (CA3).
export function EditCompetitionDialog({ competition, onClose, onUpdated }: {
  competition: Competition;
  onClose: () => void;
  onUpdated: (competition: Competition) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<Record<Editable, string>>(() => Object.fromEntries(EDITABLE.map((field) => [field, competition[field]])) as Record<Editable, string>);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const set = (field: Editable) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const changes: ScheduleChanges = {};
    for (const field of EDITABLE) if (form[field].trim() !== competition[field]) changes[field] = form[field].trim();

    if (Object.keys(changes).length === 0) return setError("No has modificado ningún dato.");
    if (EDITABLE.some((field) => !form[field].trim())) return setError("La fecha, la hora y el lugar no pueden quedar vacíos.");
    const scheduleChanged = Object.keys(changes).some((field) => field !== "location");
    const invalidSchedule = scheduleChanged ? scheduleError(form) : null;
    if (invalidSchedule) return setError(invalidSchedule);

    setSaving(true);
    setError(null);
    try {
      onUpdated(await updateCompetition(competition.id, changes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la competencia.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md border-t-4 border-(--icesi) bg-white p-0 text-(--ink) backdrop:bg-[#191d4c]/50"
    >
      <form onSubmit={submit} noValidate className="space-y-4 p-6 text-base">
        <div>
          <p className="eyebrow mb-2!">EDITAR COMPETENCIA</p>
          <h2 className="text-xl font-bold">{competition.name}</h2>
          <p className="text-(--muted)">{competition.team.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block font-bold">
            Fecha de inicio
            <input type="date" className="input mt-1" value={form.startDate} onChange={set("startDate")} />
          </label>
          <label className="block font-bold">
            Hora de inicio
            <input type="time" className="input mt-1" value={form.startTime} onChange={set("startTime")} />
          </label>
          <label className="block font-bold">
            Fecha de fin
            <input type="date" className="input mt-1" value={form.endDate} min={form.startDate || undefined} onChange={set("endDate")} />
          </label>
          <label className="block font-bold">
            Hora de fin
            <input type="time" className="input mt-1" value={form.endTime} onChange={set("endTime")} />
          </label>
        </div>
        <label className="block font-bold">
          Lugar
          <input className="input mt-1" value={form.location} onChange={set("location")} maxLength={200} />
        </label>
        {error && <p role="alert" className="admin-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="btn-secondary">Cancelar</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </form>
    </dialog>
  );
}
