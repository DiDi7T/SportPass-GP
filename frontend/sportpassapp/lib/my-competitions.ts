import { ApiError, apiFetch } from "./api";
import { formatDate, type CompetitionType } from "./competitions";

// HU5 "Mis competencias": contrato de GET /api/me/competitions.

export type SportAttendance = {
  sport: string;
  attendancePercentage: number;
  attendedSessions: number;
  totalSessions: number;
  meetsMinimum: boolean;
};

export type MyCompetition = {
  id: string;
  name: string;
  team: { id: string; name: string; sport: string };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  venueAddress: string | null;
  opponent: string | null;
  type: CompetitionType;
  status: "programada" | "aplazada";
};

export type MyCompetitionsResponse = {
  attendancePercentage: number;
  minimumPercentage: number;
  sports: SportAttendance[];
  // Caso borde: deportes del atleta donde no cumple el mínimo (sus competencias no se muestran).
  blockedSports: SportAttendance[];
  competitions: MyCompetition[];
};

// CA3: el backend responde 403 con este cuerpo cuando la asistencia es inferior al mínimo.
export type AttendanceBlock = {
  code: "ATTENDANCE_BELOW_MINIMUM";
  message: string;
  attendancePercentage: number;
  minimumPercentage: number;
  sports: SportAttendance[];
};

export const fetchMyCompetitions = () => apiFetch<MyCompetitionsResponse>("/me/competitions");

export function attendanceBlock(error: unknown): AttendanceBlock | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const body = error.body as Partial<AttendanceBlock> | null;
  return body?.code === "ATTENDANCE_BELOW_MINIMUM" ? (body as AttendanceBlock) : null;
}

// Entrenamientos seguidos que le faltan para llegar al mínimo, contando que cada nuevo
// entrenamiento suma una sesión al total y una a sus asistencias:
// (asistidos + k) / (total + k) >= mínimo  →  k >= (mínimo·total − 100·asistidos) / (100 − mínimo)
export function sessionsToReachMinimum({ attendedSessions, totalSessions }: SportAttendance, minimumPercentage: number) {
  const missing = (minimumPercentage * totalSessions - 100 * attendedSessions) / (100 - minimumPercentage);
  return Math.max(0, Math.ceil(missing));
}

export function formatMyCompetitionRange(competition: MyCompetition) {
  const start = `${formatDate(competition.startDate)} · ${competition.startTime}`;
  const end = competition.startDate === competition.endDate ? competition.endTime : `${formatDate(competition.endDate)} · ${competition.endTime}`;
  return `${start} – ${end}`;
}
