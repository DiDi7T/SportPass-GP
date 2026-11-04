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

export const STATUS_STYLES: Record<MatchStatus, string> = {
  programada: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  aplazada: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  finalizada: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
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
