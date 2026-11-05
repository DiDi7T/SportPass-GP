import { apiFetch } from "@/lib/api";

export type TeamCoach = {
  id: string;
  email: string;
  fullName: string;
};

export type Team = {
  id: string;
  name: string;
  sport: string;
  coach: TeamCoach | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTeamInput = {
  name: string;
  sport: string;
  coachId?: string;
  isActive?: boolean;
};

export function getTeams() {
  return apiFetch<Team[]>("/teams");
}

export function getTeam(id: string) {
  return apiFetch<Team>(`/teams/${id}`);
}

export function createTeam(data: CreateTeamInput) {
  return apiFetch<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deactivateTeam(id: string) {
  return apiFetch<Team>(`/teams/${id}`, {
    method: "DELETE",
  });
}