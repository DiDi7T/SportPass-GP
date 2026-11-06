import { apiFetch } from './api';

export type CoachChoice = { id: string; fullName: string; email: string };
export const fetchAvailableCoaches = () => apiFetch<CoachChoice[]>('/teams/coaches/available');
export const fetchTeamCoaches = (id: string) => apiFetch<CoachChoice[]>(`/teams/${id}/coaches`);
export const saveTeamCoaches = (id: string, coachIds: string[]) => apiFetch<CoachChoice[]>(`/teams/${id}/coaches`, {
  method: 'PUT', body: JSON.stringify({ coachIds }),
});
