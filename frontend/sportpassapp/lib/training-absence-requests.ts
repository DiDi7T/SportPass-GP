import { apiDownload, apiFetch } from './api';

export type EligibleCompetition = {
  id: string;
  name: string;
  team: { id: string; name: string; sport: string };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

export type CreateTrainingAbsenceRequest = {
  competitionId: string;
  trainingDate: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
};

export type TrainingAbsenceRequestCreated = CreateTrainingAbsenceRequest & {
  id: string;
  status: 'pending_coach_approval';
  statusLabel: string;
  createdAt: string;
  coaches: { id: string; fullName: string }[];
};

export type TrainingAbsenceRequestStatus =
  | 'pending_coach_approval'
  | 'approved_by_coach'
  | 'rejected_by_coach'
  | 'cancelled';

export type MyTrainingAbsenceRequest = {
  id: string;
  competition: { id: string; name: string; teamName: string };
  trainingDate: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  status: TrainingAbsenceRequestStatus | string;
  statusLabel: string;
  createdAt: string;
  coachRespondedAt: string | null;
  rejectionComment: string | null;
  teacherEmailSentAt: string | null;
};

export const fetchEligibleCompetitions = () =>
  apiFetch<EligibleCompetition[]>('/me/training-absence-requests/eligible-competitions');

export const fetchMyTrainingAbsenceRequests = () =>
  apiFetch<MyTrainingAbsenceRequest[]>('/me/training-absence-requests');

// HU14: filtros del historial. Las fechas aplican sobre el día del entrenamiento.
export type AbsenceRequestHistoryFilters = {
  status?: string;
  from?: string;
  to?: string;
  subject?: string;
};

export const fetchMyAbsenceRequestHistory = (filters: AbsenceRequestHistoryFilters = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value?.trim()) params.set(key, value.trim());
  return apiFetch<MyTrainingAbsenceRequest[]>(`/me/training-absence-requests/history${params.size ? `?${params}` : ''}`);
};

export const fetchMyTrainingAbsenceRequest = (id: string) =>
  apiFetch<MyTrainingAbsenceRequest>(`/me/training-absence-requests/${id}`);

// HU15. El servidor valida titularidad y estado aprobado antes de entregar el PDF.
export const downloadMyTrainingAbsenceRequestPdf = (id: string) =>
  apiDownload(`/me/training-absence-requests/${id}/pdf`, `constancia-sportpass-${id}.pdf`);

// HU13. Solo ejecuta la cancelación después de confirmar desde la interfaz.
export const cancelTrainingAbsenceRequest = (id: string) =>
  apiFetch<MyTrainingAbsenceRequest>(`/me/training-absence-requests/${id}/cancel`, { method: 'PATCH' });

export const createTrainingAbsenceRequest = (data: CreateTrainingAbsenceRequest) =>
  apiFetch<TrainingAbsenceRequestCreated>('/me/training-absence-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
