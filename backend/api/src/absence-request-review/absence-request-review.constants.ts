import { ABSENCE_REQUEST_STATUS_LABELS } from '../training-absence-requests/absence-request-status';

// HU16: bandeja del entrenador. Reutiliza el permiso de gestión de permisos deportivos del rol coach.
export const COACH_INBOX_PERMISSION = 'permissions:manage';
// HU20: historial general del administrador.
export const HISTORY_PERMISSION = 'absence-requests:history';

export const ABSENCE_REQUEST_STATUSES = Object.keys(ABSENCE_REQUEST_STATUS_LABELS);
export const PENDING_STATUS = 'pending_coach_approval';
