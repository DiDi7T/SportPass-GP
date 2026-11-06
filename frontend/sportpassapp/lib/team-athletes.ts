
import { apiFetch } from "@/lib/api";

export type AthleteUser = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
};

export type Athlete = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  user: AthleteUser;
};

export type TeamAthlete = {
  id: string;
  active: boolean;
  createdAt: string;
  athlete: Athlete;
};

export type AssignAthleteInput = {
  athleteId: string;
};

export function getTeamAthletes(teamId: string) {
  return apiFetch<TeamAthlete[]>(
    `/team-athletes/team/${teamId}`
  );
}

export function getAvailableAthletes(teamId: string) {
  return apiFetch<Athlete[]>(
    `/team-athletes/available/${teamId}`
  );
}

export function assignAthlete(
  teamId: string,
  data: AssignAthleteInput
) {
  return apiFetch<TeamAthlete>(
    `/team-athletes/team/${teamId}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function removeAthlete(assignmentId: string) {
  return apiFetch<TeamAthlete>(
    `/team-athletes/${assignmentId}`,
    {
      method: "DELETE",
    }
  );
}
