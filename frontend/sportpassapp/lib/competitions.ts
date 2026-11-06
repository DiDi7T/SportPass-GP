import { apiFetch } from "./api";

export const COMPETITION_TYPES = ["local", "regional", "nacional"] as const;
export type CompetitionType = (typeof COMPETITION_TYPES)[number];

export const TYPE_LABELS: Record<CompetitionType, string> = {
  local: "Local",
  regional: "Regional",
  nacional: "Nacional",
};

export type Team = { id: string; name: string; sport: string };

export type CompetitionStatus = "programada" | "aplazada" | "cancelada";

// Solo se etiquetan los estados distintos del normal (HU7 CA3: "Cancelada").
export const STATUS_LABELS: Partial<Record<CompetitionStatus, string>> = {
  aplazada: "Aplazada",
  cancelada: "Cancelada",
};

export type Competition = {
  id: string;
  name: string;
  team: Team;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  type: CompetitionType;
  status: CompetitionStatus;
  cancellation: { reason: string; cancelledAt: string } | null;
  // HU7 CA4: el backend indica si quien consulta es el entrenador del equipo y aún se puede cancelar.
  canCancel: boolean;
};

export type CompetitionForm = {
  name: string;
  teamId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  type: CompetitionType | "";
};

export type CallupAthlete = {
  id: string;
  fullName: string,
  studentCode: string;
  email: string;
  calledUp: boolean;
};

export type CompetitionCallup = {
  competitionId: string;
  competitionName: string;
  teamId: string;
  athletes: CallupAthlete[];
};

export type SaveCallupInput = {
  athleteIds: string[];
};

export const fetchCompetitionCallup = (competitionId: string) =>
  apiFetch<CompetitionCallup>(
    `/competitions/${competitionId}/callup`
  );

export const saveCompetitionCallup = (
  competitionId: string,
  data: SaveCallupInput
) =>
  apiFetch<CompetitionCallup>(
    `/competitions/${competitionId}/callup`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

export type ScheduleChanges = Partial<Pick<Competition, "startDate" | "endDate" | "startTime" | "endTime" | "location">>;

export const MESSAGES = {
  required: "Todos los campos son obligatorios.",
  past: "No se puede registrar una competencia con fecha pasada.",
  endBeforeStart: "La fecha y hora de fin deben ser posteriores a las de inicio.",
};

// Colombia no tiene horario de verano: America/Bogota es siempre UTC-5, igual que en el backend.
const toInstant = (date: string, time: string) => new Date(`${date}T${time}:00-05:00`);

export function scheduleError(value: Pick<Competition, "startDate" | "endDate" | "startTime" | "endTime">) {
  const start = toInstant(value.startDate, value.startTime);
  const end = toInstant(value.endDate, value.endTime);
  if (start <= new Date()) return MESSAGES.past;
  if (end <= start) return MESSAGES.endBeforeStart;
  return null;
}

export const fetchMyTeams = () => apiFetch<Team[]>("/competitions/teams");

export const fetchCompetitions = (teamId?: string) =>
  apiFetch<Competition[]>(`/competitions${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`);

export const createCompetition = (form: CompetitionForm) =>
  apiFetch<Competition>("/competitions", { method: "POST", body: JSON.stringify(form) });

export const updateCompetition = (id: string, changes: ScheduleChanges) =>
  apiFetch<Competition>(`/competitions/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const CANCELLATION_REASON_REQUIRED = "El motivo de la cancelación es obligatorio.";

export const cancelCompetition = (id: string, reason: string) =>
  apiFetch<Competition>(`/competitions/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });

const dateFormatter = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function formatRange(competition: Competition) {
  const start = `${formatDate(competition.startDate)} · ${competition.startTime}`;
  const end = competition.startDate === competition.endDate ? competition.endTime : `${formatDate(competition.endDate)} · ${competition.endTime}`;
  return `${start} – ${end}`;
}
