"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { dashboardPath } from "@/lib/auth";
import { fetchCompetitions, fetchMyTeams, formatRange, STATUS_LABELS, TYPE_LABELS, type Competition, type Team } from "@/lib/competitions";
import { useSession } from "./session";
import { CancelCompetitionDialog } from "./cancel-dialog";
import { EditCompetitionDialog } from "./edit-dialog";

export default function CompetitionsPage() {
  return (
    <Suspense fallback={<p className="admin-loading">Cargando…</p>}>
      <Competitions />
    </Suspense>
  );
}

function Competitions() {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const teamId = params.get("equipo") ?? "";
  const createdId = params.get("creada");

  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [cancelling, setCancelling] = useState<Competition | null>(null);
  const [notice, setNotice] = useState<{ title: string; competition: Competition } | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    fetchMyTeams().then(setTeams).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    fetchCompetitions(teamId || undefined)
      .then((list) => {
        setCompetitions(list);
        const created = list.find((competition) => competition.id === createdId);
        if (created) {
          setNotice({ title: "Competencia registrada correctamente.", competition: created });
          setMonth(startOfMonth(parseDate(created.startDate)));
        }
      })
      .catch((err) => setError(err.message));
  }, [teamId, createdId]);

  function selectTeam(id: string) {
    const next = new URLSearchParams();
    if (id) next.set("equipo", id);
    router.replace(next.size ? `${pathname}?${next}` : pathname);
    setNotice(null);
  }

  function onUpdated(updated: Competition) {
    setCompetitions((list) => list?.map((competition) => (competition.id === updated.id ? updated : competition)) ?? null);
    setNotice({ title: "Competencia actualizada correctamente.", competition: updated });
    setMonth(startOfMonth(parseDate(updated.startDate)));
    setEditing(null);
  }

  function onCancelled(cancelled: Competition) {
    setCompetitions((list) => list?.map((competition) => (competition.id === cancelled.id ? cancelled : competition)) ?? null);
    setNotice({ title: "Competencia cancelada correctamente.", competition: cancelled });
    setCancelling(null);
  }

  const selectedTeam = teams.find((team) => team.id === teamId);

  return (
    <div className="space-y-6">
      <Link className="back-link" href={dashboardPath(user.roles[0])}>← Volver a mi inicio</Link>

      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">SPORTPASS · COMPETENCIAS</p>
          <h1>Competencias</h1>
          <p>Registra y actualiza las competencias de tus equipos.</p>
        </div>
        <Link href="/competencias/nueva" className="primary-button">Registrar competencia <span>+</span></Link>
      </div>

      {notice && (
        <div role="status" className="admin-notice">
          <p className="font-bold">{notice.title}</p>
          <p className="mt-1">
            {notice.competition.name} · {formatRange(notice.competition)} · {notice.competition.location}
          </p>
        </div>
      )}
      {error && <p role="alert" className="admin-error">{error}</p>}

      <label className="block max-w-md text-base font-bold">
        Equipo
        <select className="input mt-1" value={teamId} onChange={(event) => selectTeam(event.target.value)}>
          <option value="">Todos mis equipos</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </label>

      <section aria-label="Calendario" className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Calendario {selectedTeam ? `· ${selectedTeam.name}` : ""}</h2>
        </div>
        <MonthCalendar month={month} onMonthChange={setMonth} competitions={competitions ?? []} />
      </section>

      <section aria-label="Listado de competencias" className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Competencias registradas</h2>
        {competitions === null && !error && <p className="admin-loading">Cargando…</p>}
        {competitions?.length === 0 && <p className="admin-loading">Aún no hay competencias registradas.</p>}
        <ul className="space-y-3">
          {competitions?.map((competition) => {
            const cancelled = competition.status === "cancelada";
            return (
              <li key={competition.id} className={`competition-card is-${competition.status}`}>
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="competition-name text-lg font-bold">{competition.name}</span>
                    {STATUS_LABELS[competition.status] && (
                      <span className={`match-status match-status-${competition.status}`}>{STATUS_LABELS[competition.status]}</span>
                    )}
                  </p>
                  <p className="text-(--muted)">{formatRange(competition)}</p>
                  <p className="text-(--muted)">{competition.location}</p>
                  {cancelled && competition.cancellation && (
                    <p className="text-[#9a2929]">Motivo de la cancelación: {competition.cancellation.reason}</p>
                  )}
                  <p className="flex flex-wrap gap-2 pt-1 text-sm">
                    <span className="bg-(--lavender) px-2 py-0.5 text-(--ink)">{competition.team.name}</span>
                    <span className="bg-(--lavender) px-2 py-0.5 font-bold text-(--icesi)">{TYPE_LABELS[competition.type]}</span>
                  </p>
                </div>
                {/* Una competencia cancelada no se edita ni se vuelve a cancelar (HU7). */}
                {!cancelled && (
  <div className="flex flex-wrap gap-2">
    <Link
      href={`/competencias/${competition.id}/convocatoria`}
      className="btn-secondary"
    >
      Gestionar convocatoria
    </Link>

    <button
      onClick={() => setEditing(competition)}
      className="btn-secondary"
    >
      Editar
    </button>

    {competition.canCancel && (
      <button
        onClick={() => setCancelling(competition)}
        className="btn-danger-outline"
      >
        Cancelar competencia
      </button>
    )}
  </div>
)}
              </li>
            );
          })}
        </ul>
      </section>

      {editing && <EditCompetitionDialog competition={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} />}
      {cancelling && <CancelCompetitionDialog competition={cancelling} onClose={() => setCancelling(null)} onCancelled={onCancelled} />}
    </div>
  );
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" });

function monthLabel(month: Date) {
  const label = monthFormatter.format(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MAX_CHIPS = 2;
const dayFormatter = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });

// Horario de la competencia dentro de un día concreto (las de varios días empiezan, siguen o terminan).
function hoursOnDay(competition: Competition, key: string) {
  const starts = competition.startDate === key;
  const ends = competition.endDate === key;
  if (starts && ends) return `${competition.startTime} – ${competition.endTime}`;
  if (starts) return `Desde las ${competition.startTime} (continúa)`;
  if (ends) return `Hasta las ${competition.endTime}`;
  return "Todo el día (continúa)";
}

function MonthCalendar({ month, onMonthChange, competitions }: { month: Date; onMonthChange: (month: Date) => void; competitions: Competition[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Cada día entre la fecha de inicio y la de fin (inclusive) muestra la competencia.
  const byDay = useMemo(() => {
    const map = new Map<string, Competition[]>();
    for (const competition of competitions) {
      for (let day = parseDate(competition.startDate); toKey(day) <= competition.endDate; day.setDate(day.getDate() + 1)) {
        map.set(toKey(day), [...(map.get(toKey(day)) ?? []), competition]);
      }
    }
    for (const [key, events] of map) {
      events.sort((a, b) => (a.startDate === key ? a.startTime : "00:00").localeCompare(b.startDate === key ? b.startTime : "00:00"));
    }
    return map;
  }, [competitions]);

  const leadingBlanks = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = toKey(new Date());
  const shift = (delta: number) => {
    setSelected(null);
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };
  const selectedEvents = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded px-3 py-1 text-xl text-(--icesi) hover:bg-(--lavender)" aria-label="Mes anterior">‹</button>
        <p className="text-lg font-bold">{monthLabel(month)}</p>
        <button onClick={() => shift(1)} className="rounded px-3 py-1 text-xl text-(--icesi) hover:bg-(--lavender)" aria-label="Mes siguiente">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS.map((day) => <div key={day} className="py-1 font-bold text-(--muted)">{day}</div>)}
        {Array.from({ length: leadingBlanks }, (_, index) => <div key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const key = toKey(new Date(month.getFullYear(), month.getMonth(), index + 1));
          const events = byDay.get(key) ?? [];
          const hidden = events.length - MAX_CHIPS;
          return (
            <button
              key={key}
              type="button"
              disabled={!events.length}
              onClick={() => setSelected(selected === key ? null : key)}
              aria-label={`${index + 1}: ${events.length ? events.map((event) => event.name).join(", ") : "sin competencias"}`}
              aria-pressed={selected === key}
              className={`flex min-h-14 min-w-0 flex-col items-stretch gap-0.5 rounded-md p-1 ${events.length ? "bg-(--lavender) hover:bg-[#e8e8ff]" : ""} ${key === today ? "ring-1 ring-(--muted)" : ""} ${selected === key ? "ring-2 ring-(--icesi)" : ""}`}
            >
              <span>{index + 1}</span>
              {events.slice(0, hidden > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((event) => {
                const continued = event.startDate !== key;
                // HU7 CA3: la cancelada sigue en el calendario, tachada y en rojo.
                const chip = event.status === "cancelada"
                  ? "bg-[#fff2f2] text-[#9a2929] line-through"
                  : continued ? "bg-[#dcdcff] text-(--icesi-dark)" : "bg-(--icesi) text-white";
                return (
                  <span
                    key={event.id}
                    title={`${event.name} · ${hoursOnDay(event, key)}${event.status === "cancelada" ? " · Cancelada" : ""}`}
                    className={`truncate rounded px-0.5 text-left text-[10px] leading-4 ${chip}`}
                  >
                    {continued && "↳ "}{event.name}
                  </span>
                );
              })}
              {hidden > 0 && <span className="text-[10px] leading-4 text-(--icesi)">+{hidden + 1} más</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--muted)">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-(--icesi) align-middle" />Inicia ese día</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#dcdcff] align-middle" />↳ Continúa de un día anterior</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-[#f0cccc] bg-[#fff2f2] align-middle" />Cancelada</span>
      </p>

      {selected && selectedEvents.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-(--line) pt-3">
          <p className="font-bold first-letter:uppercase">{dayFormatter.format(parseDate(selected))}</p>
          <ul className="space-y-1.5">
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <span className={`font-bold ${event.status === "cancelada" ? "line-through" : ""}`}>{event.name}</span>
                {event.status === "cancelada" && <span className="font-bold text-[#9a2929]"> · Cancelada</span>}
                <span className="text-(--muted)"> · {hoursOnDay(event, selected)} · {event.location} · {event.team.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
