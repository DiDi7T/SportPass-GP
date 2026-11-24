export const ABSENCE_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending_coach_approval: 'Pendiente',
  approved_by_coach: 'Aprobada por entrenador',
  rejected_by_coach: 'Rechazada',
  cancelled: 'Cancelada',
};

export const absenceRequestStatusLabel = (status: string) =>
  ABSENCE_REQUEST_STATUS_LABELS[status] ?? `Estado: ${status}`;
