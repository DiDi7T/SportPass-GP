import { apiFetch } from "@/lib/api";

export type RosterImportError = {
  row: number;
  email: string;
  reason: string;
};

export type RosterImportResult = {
  teamId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: RosterImportError[];
};

export function importTeamRoster(
  teamId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<RosterImportResult>(
    `/roster-import/teams/${teamId}`,
    {
      method: "POST",
      body: formData,
    },
  );
}

// Importación general de deportistas

export type AthleteImportResult = {
  totalRows: number;
  imported: number;
  failed: number;
  errors: RosterImportError[];
};

export function importAthletes(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<AthleteImportResult>(
    "/athletes/import",
    {
      method: "POST",
      body: formData,
    },
  );
}