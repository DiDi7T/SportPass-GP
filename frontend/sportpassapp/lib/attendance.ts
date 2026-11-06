import { apiFetch } from "./api";

// HU9: registro de asistencia a entrenamientos (contrato de /api/attendance).

export type CoachSport = { id: string; name: string };

export type Participant = {
  id: string;
  athleteId: string;
  fullName: string;
  studentCode: string;
  presentToday: boolean;
};

export const fetchMySports = () => apiFetch<CoachSport[]>("/attendance/sports");

export const fetchParticipants = (sportId: string) =>
  apiFetch<Participant[]>(`/attendance/sports/${encodeURIComponent(sportId)}/participants`);

// CA1: primera vez, por cédula.
export const checkInByDocument = (sportId: string, documentNumber: string) =>
  apiFetch<{ participant: Participant; newParticipant: boolean }>(
    `/attendance/sports/${encodeURIComponent(sportId)}/check-in`,
    { method: "POST", body: JSON.stringify({ documentNumber }) },
  );

// CA3: recurrentes, un solo clic.
export const markAttendance = (sportId: string, participantId: string) =>
  apiFetch<{ participant: Participant }>(
    `/attendance/sports/${encodeURIComponent(sportId)}/participants/${encodeURIComponent(participantId)}/attendance`,
    { method: "POST" },
  );

// Quita tildes y mayúsculas para filtrar por nombre ("jose" encuentra "José").
export const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const todayFormatter = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });

export const formatToday = () => todayFormatter.format(new Date());
