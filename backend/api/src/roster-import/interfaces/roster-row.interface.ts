
export interface RosterRow {
  email: string;
  student_code: string;
  first_name: string;
  last_name: string;
}

export interface RosterRowError {
  row: number;
  email: string;
  reason: string;
}

export interface RosterImportResult {
  teamId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: RosterRowError[];
}
