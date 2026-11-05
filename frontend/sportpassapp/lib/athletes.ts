import { apiFetch } from "@/lib/api";

export type Athlete = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
};

export function getAthletes() {
  return apiFetch<Athlete[]>("/athletes");
}

export function deactivateAthlete(id: string) {
  return apiFetch<Athlete>(`/athletes/${id}`, {
    method: "DELETE",
  });
}