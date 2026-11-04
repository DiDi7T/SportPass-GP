"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { fetchCompetitions, fetchMyTeams, formatRange, TYPE_LABELS, type Competition, type Team } from "@/lib/competitions";
import { useSession } from "./session";
import { EditCompetitionDialog } from "./edit-dialog";

export default function CompetitionsPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-zinc-500">Cargando…</p>}>
      <Competitions />
    </Suspense>
  );
}

function Competitions() {
  const { user, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const teamId = params.get("equipo") ?? "";
  const createdId = params.get("creada");

  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Competition | null>(null);
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

  const selectedTeam = teams.find((team) => team.id === teamId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Competencias</h1>
          <p className="text-sm text-zinc-500">{user.fullName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={signOut} className="text-sm text-zinc-500 hover:underline">Salir</button>
          <Link href="/competencias/nueva" className="btn-primary">+ Registrar competencia</Link>
        </div>
      </header>

      {notice && (
        <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="font-medium">{notice.title}</p>
          <p className="mt-1">
            {notice.competition.name} · {formatRange(notice.competition)} · {notice.competition.location}
          </p>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <label className="block text-sm font-medium">
        Equipo
        <select className="input mt-1" value={teamId} onChange={(event) => selectTeam(event.target.value)}>
          <option value="">Todos mis equipos</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </label>

      <section aria-label="Calendario" className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Calendario {selectedTeam ? `· ${selectedTeam.name}` : ""}</h2>
        <MonthCalendar month={month} onMonthChange={setMonth} competitions={competitions ?? []} />
      </section>

      <section aria-label="Listado de competencias" className="space-y-3">
        <h2 className="text-lg font-semibold">Competencias registradas</h2>
        {competitions === null && !error && <p className="text-sm text-zinc-500">Cargando…</p>}
        {competitions?.length === 0 && <p className="text-sm text-zinc-500">Aún no hay competencias registradas.</p>}
        <ul className="space-y-3">
          {competitions?.map((competition) => (
            <li key={competition.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{competition.name}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatRange(competition)}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{competition.location}</p>
                <p className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{competition.team.name}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-300">{TYPE_LABELS[competition.type]}</span>
                </p>
              </div>
              <button onClick={() => setEditing(competition)} className="btn-secondary">Editar</button>
            </li>
          ))}
        </ul>
      </section>

      {editing && <EditCompetitionDialog competition={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} />}
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
        <button onClick={() => shift(-1)} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mes anterior">‹</button>
        <p className="font-medium">{monthLabel(month)}</p>
        <button onClick={() => shift(1)} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mes siguiente">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((day) => <div key={day} className="py-1 font-medium text-zinc-500">{day}</div>)}
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
              className={`flex min-h-14 min-w-0 flex-col items-stretch gap-0.5 rounded-md p-1 ${events.length ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900" : ""} ${key === today ? "ring-1 ring-zinc-400" : ""} ${selected === key ? "ring-2 ring-blue-500" : ""}`}
            >
              <span>{index + 1}</span>
              {events.slice(0, hidden > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((event) => {
                const continued = event.startDate !== key;
                return (
                  <span
                    key={event.id}
                    title={`${event.name} · ${hoursOnDay(event, key)}`}
                    className={`truncate rounded px-0.5 text-left text-[10px] leading-4 ${continued ? "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100" : "bg-blue-600 text-white"}`}
                  >
                    {continued && "↳ "}{event.name}
                  </span>
                );
              })}
              {hidden > 0 && <span className="text-[10px] leading-4 text-blue-700 dark:text-blue-300">+{hidden + 1} más</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-600 align-middle" />Inicia ese día</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-200 align-middle dark:bg-blue-800" />↳ Continúa de un día anterior</span>
      </p>

      {selected && selectedEvents.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-sm font-medium first-letter:uppercase">{dayFormatter.format(parseDate(selected))}</p>
          <ul className="space-y-1.5">
            {selectedEvents.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-medium">{event.name}</span>
                <span className="text-zinc-500"> · {hoursOnDay(event, selected)} · {event.location} · {event.team.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
