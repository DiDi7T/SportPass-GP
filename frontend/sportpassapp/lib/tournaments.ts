import { apiFetch } from "./api";
import { formatDate, type CompetitionType } from "./competitions";

export const MATCH_STATUSES = ["programada", "aplazada", "cancelada", "finalizada"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const STATUS_LABELS: Record<MatchStatus, string> = {
  programada: "Programado",
  aplazada: "Aplazado",
  cancelada: "Cancelado",
  finalizada: "Finalizado",
};

export type Match = {
  id: string;
  tournament: string;
  type: CompetitionType;
  teams: { icesi: string; sport: string; opponent: string | null };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: { name: string; address: string | null };
  status: MatchStatus;
};

export const fetchMatches = () => apiFetch<Match[]>("/tournaments/matches");

export const fetchMatch = (id: string) => apiFetch<Match>(`/tournaments/matches/${encodeURIComponent(id)}`);

export function matchup(match: Match) {
  return `${match.teams.icesi} vs ${match.teams.opponent ?? "Rival por confirmar"}`;
}

export function formatMatchRange(match: Match) {
  const start = `${formatDate(match.startDate)} · ${match.startTime}`;
  const end = match.startDate === match.endDate ? match.endTime : `${formatDate(match.endDate)} · ${match.endTime}`;
  return `${start} – ${end}`;
}

const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

// Día y mes cortos para el bloque de fecha de cada tarjeta ("04", "NOV").
export function dateBadge(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return { day: date.slice(8, 10), month: monthFormatter.format(value).replace(".", "").toUpperCase() };
}
