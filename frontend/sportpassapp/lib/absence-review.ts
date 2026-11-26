import { apiDownload, apiFetch } from "./api";

export const STATUS_OPTIONS = [
  { value: "pending_coach_approval", label: "Pendiente" },
  { value: "approved_by_coach", label: "Aprobada por entrenador" },
  { value: "rejected_by_coach", label: "Rechazada" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export type ReviewedAbsenceRequest = {
  id: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  trainingDate: string;
  startTime: string;
  endTime: string;
  coachRespondedAt: string | null;
  rejectionComment: string | null;
  teacherEmailSentAt: string | null;
  athlete: { id: string; fullName: string; email: string; studentCode: string };
  competition: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    status: string;
    team: { id: string; name: string; sport: string };
  };
  officialCallup: boolean;
  coaches: { fullName: string; email: string }[];
};

export type AdminFilters = {
  teamId: string;
  athleteId: string;
  competitionId: string;
  teacherEmail: string;
  coachId: string;
  status: string;
  from: string;
  to: string;
};

export type FilterOption = { id: string; label: string };

export type AdminFilterOptions = {
  teams: FilterOption[];
  athletes: FilterOption[];
  competitions: FilterOption[];
  teachers: FilterOption[];
  coaches: FilterOption[];
};

// Solo se envían los filtros con valor para no restringir la consulta con campos vacíos.
export function toQuery(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return params.size ? `?${params}` : "";
}

export const fetchCoachRequests = () => apiFetch<ReviewedAbsenceRequest[]>("/coach/absence-requests");

export const fetchCoachRequest = (id: string) =>
  apiFetch<ReviewedAbsenceRequest>(`/coach/absence-requests/${id}`);

// HU17: el servidor determina quién puede responder y valida el estado actual.
export const decideCoachRequest = (id: string, decision: 'approve' | 'reject', reason?: string) =>
  apiFetch<ReviewedAbsenceRequest>(`/coach/absence-requests/${id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason }),
  });

export const fetchAdminRequests = (filters: AdminFilters) =>
  apiFetch<ReviewedAbsenceRequest[]>(`/admin/absence-requests${toQuery(filters)}`);

export const fetchAdminFilterOptions = () => apiFetch<AdminFilterOptions>("/admin/absence-requests/filters");

export const fetchAdminRequest = (id: string) =>
  apiFetch<ReviewedAbsenceRequest>(`/admin/absence-requests/${id}`);

export function exportAdminRequests(filters: AdminFilters) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return apiDownload(`/admin/absence-requests/export${toQuery(filters)}`, `historial-solicitudes-${today}.xlsx`);
}

const dateFormat = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

export const formatDay = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));
export const formatDateTime = (value: string | null) => (value ? dateTimeFormat.format(new Date(value)) : null);

export const STATUS_STYLES: Record<string, string> = {
  pending_coach_approval: "bg-amber-100 text-amber-800",
  approved_by_coach: "bg-emerald-100 text-emerald-800",
  rejected_by_coach: "bg-red-100 text-red-800",
  cancelled: "bg-slate-200 text-slate-700",
};
