"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cancelCompetition, CANCELLATION_REASON_REQUIRED, formatRange, type Competition } from "@/lib/competitions";

const MAX_REASON = 500;

// HU7 CA1: antes de cancelar se pide confirmación y un motivo obligatorio.
// Cancelar no borra la competencia: queda "Cancelada" y no se puede editar ni volver a cancelar.
export function CancelCompetitionDialog({ competition, onClose, onCancelled }: {
  competition: Competition;
  onClose: () => void;
  onCancelled: (competition: Competition) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return setError(CANCELLATION_REASON_REQUIRED);

    setSaving(true);
    setError(null);
    try {
      onCancelled(await cancelCompetition(competition.id, reason.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cancelar la competencia.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="cancel-competition-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md border-t-4 border-[#c94a4a] bg-white p-0 text-(--ink) backdrop:bg-[#191d4c]/50"
    >
      <form onSubmit={submit} noValidate className="space-y-4 p-6 text-base">
        <div>
          <p className="eyebrow mb-2! text-[#9a2929]!">CANCELAR COMPETENCIA</p>
          <h2 id="cancel-competition-title" className="text-xl font-bold">{competition.name}</h2>
          <p className="text-(--muted)">{competition.team.name} · {formatRange(competition)}</p>
        </div>
        <p className="admin-error mb-0!">
          La competencia quedará como <strong>Cancelada</strong>: no se podrá editar ni recibir nuevas solicitudes de permiso, y las
          solicitudes pendientes o aprobadas quedarán anuladas.
        </p>
        <label className="block font-bold">
          Motivo de la cancelación <span className="text-[#9a2929]" aria-hidden>*</span>
          <textarea
            className={`input mt-1 min-h-24 ${error === CANCELLATION_REASON_REQUIRED ? "input-invalid" : ""}`}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(event) => {
              setReason(event.target.value);
              if (error === CANCELLATION_REASON_REQUIRED) setError(null);
            }}
            placeholder="Ej. El organizador suspendió el torneo."
          />
          <span className="mt-1 block text-right text-sm font-normal text-(--muted)">{reason.length}/{MAX_REASON}</span>
        </label>
        {error && <p role="alert" className="admin-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="btn-secondary">Volver</button>
          <button className="btn-danger" disabled={saving}>{saving ? "Cancelando…" : "Sí, cancelar competencia"}</button>
        </div>
      </form>
    </dialog>
  );
}
