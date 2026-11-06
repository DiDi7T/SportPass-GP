import { apiFetch } from './api';

export type AcademicConflict = {
  classSessionId: string;
  subjectName: string;
  subjectCode: string;
  nrc: string;
  startsAt: string;
  endsAt: string;
  teacher: { fullName: string; email: string };
};
export type ConflictsResponse = {
  competitionId: string;
  status: 'schedule_unavailable' | 'checked';
  hasConflicts: boolean | null;
  message: string;
  conflicts: AcademicConflict[];
};
export const fetchAcademicConflicts = (competitionId: string) =>
  apiFetch<ConflictsResponse>(`/me/competitions/${competitionId}/conflicts`);
