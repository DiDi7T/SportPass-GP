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

export function importRoster(teamId: string, file: File) {
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