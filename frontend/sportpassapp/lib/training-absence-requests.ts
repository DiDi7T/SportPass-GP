import { apiFetch } from './api';

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

export const fetchEligibleCompetitions = () =>
  apiFetch<EligibleCompetition[]>('/me/training-absence-requests/eligible-competitions');

export const createTrainingAbsenceRequest = (data: CreateTrainingAbsenceRequest) =>
  apiFetch<TrainingAbsenceRequestCreated>('/me/training-absence-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
