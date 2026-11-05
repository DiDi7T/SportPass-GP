export interface AthleteImportError {
  row: number;
  email: string;
  reason: string;
}

export interface AthleteImportResult {
  totalRows: number;
  imported: number;
  failed: number;
  errors: AthleteImportError[];
}