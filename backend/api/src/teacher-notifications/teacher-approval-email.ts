import type { TrainingAbsencePermitPdfData } from '../training-absence-requests/training-absence-request-pdf';

// Los datos vienen del formulario del deportista: se escapan antes de ponerlos en el HTML.
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

const trainingDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00.000Z`));

const approvalDate = (value: Date) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(value);

export const NOT_OFFICIAL_PERMIT =
  'Este correo es una notificación informativa de entrenamiento deportivo avalada por el entrenador. ' +
  'No es un permiso oficial ni una excusa de Bienestar Universitario.';

// HU18 CA3: nombre y código del estudiante, disciplina, competencia, fecha y hora del entrenamiento,
// materia y entrenador que avala, con la aclaración de que no es un permiso oficial.
export function composeTeacherApprovalEmail(data: TrainingAbsencePermitPdfData) {
  const date = trainingDate(data.trainingDate);
  const subject = `Aviso de ausencia por entrenamiento: ${data.studentName} (${data.subjectName})`;
  const rows: [string, string][] = [
    ['Estudiante', data.studentName],
    ['Código', data.studentCode],
    ['Disciplina', data.sport],
    ['Competencia', data.competitionName],
    ['Materia', data.subjectName],
    ['Entrenamiento', `${date}, de ${data.startTime} a ${data.endTime}`],
    ['Entrenador que avala', data.coachName],
    ['Fecha del aval', approvalDate(data.approvedAt)],
  ];

  const text = [
    `Cordial saludo, ${data.teacherName}:`,
    '',
    `Le informamos que ${data.studentName} no asistirá a su clase de ${data.subjectName} el ${date}, ` +
      `de ${data.startTime} a ${data.endTime}, porque tiene entrenamiento de preparación para la competencia ${data.competitionName}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Adjuntamos la constancia en PDF.',
    '',
    NOT_OFFICIAL_PERMIT,
    '',
    'Mensaje automático de SportPass Icesi. Por favor no responda a este correo.',
  ].join('\n');

  const html = `
<div style="font-family: Arial, sans-serif; color: #171923; max-width: 620px;">
  <p style="margin: 0 0 4px; color: #5454e9; font-size: 12px; font-weight: bold; letter-spacing: 1px;">SPORTPASS · UNIVERSIDAD ICESI</p>
  <h1 style="margin: 0 0 16px; font-size: 20px;">Aviso de ausencia por entrenamiento</h1>
  <p>Cordial saludo, ${escapeHtml(data.teacherName)}:</p>
  <p>Le informamos que <strong>${escapeHtml(data.studentName)}</strong> no asistirá a su clase de
    <strong>${escapeHtml(data.subjectName)}</strong> el ${escapeHtml(date)}, de ${escapeHtml(data.startTime)} a ${escapeHtml(data.endTime)},
    porque tiene entrenamiento de preparación para la competencia <strong>${escapeHtml(data.competitionName)}</strong>.</p>
  <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
    ${rows.map(([label, value]) => `<tr>
      <td style="padding: 6px 12px 6px 0; color: #747782; font-size: 13px; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(value)}</td>
    </tr>`).join('')}
  </table>
  <p>Adjuntamos la constancia en PDF.</p>
  <p style="padding: 12px 14px; background: #f4f4ff; border-left: 4px solid #5454e9; font-size: 13px;">${escapeHtml(NOT_OFFICIAL_PERMIT)}</p>
  <p style="color: #747782; font-size: 12px;">Mensaje automático de SportPass Icesi. Por favor no responda a este correo.</p>
</div>`.trim();

  return { subject, text, html };
}
