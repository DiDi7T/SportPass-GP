import ExcelJS from 'exceljs';
import type { ReviewedAbsenceRequest } from './absence-request-review.service';

// Excel no maneja zonas horarias: se escribe la hora local de Bogotá (UTC-5, sin horario de verano).
const bogota = (value: Date | string | null) => (value ? new Date(new Date(value).getTime() - 5 * 3600 * 1000) : null);

type Column = { header: string; width: number; dateTime?: boolean; value: (request: ReviewedAbsenceRequest) => string | Date | null };

const COLUMNS: Column[] = [
  { header: 'Fecha de solicitud', width: 20, dateTime: true, value: r => bogota(r.createdAt) },
  { header: 'Estado', width: 24, value: r => r.statusLabel },
  { header: 'Deportista', width: 30, value: r => r.athlete.fullName },
  { header: 'Código estudiantil', width: 18, value: r => r.athlete.studentCode },
  { header: 'Correo del deportista', width: 32, value: r => r.athlete.email },
  { header: 'Equipo', width: 28, value: r => r.competition.team.name },
  { header: 'Competencia', width: 32, value: r => r.competition.name },
  { header: 'Inicio de la competencia', width: 22, value: r => `${r.competition.startDate} ${r.competition.startTime}` },
  { header: 'Materia', width: 30, value: r => r.subjectName },
  { header: 'Profesor', width: 28, value: r => r.teacherName },
  { header: 'Correo del profesor', width: 32, value: r => r.teacherEmail },
  { header: 'Fecha de la clase', width: 16, value: r => r.trainingDate },
  { header: 'Horario de la clase', width: 18, value: r => `${r.startTime} - ${r.endTime}` },
  { header: 'Entrenadores', width: 32, value: r => r.coaches.map(coach => coach.fullName).join(', ') },
  { header: 'Convocatoria oficial', width: 18, value: r => (r.officialCallup ? 'Sí' : 'No') },
  { header: 'Respuesta del entrenador', width: 22, dateTime: true, value: r => bogota(r.coachRespondedAt) },
  { header: 'Comentario de rechazo', width: 40, value: r => r.rejectionComment },
  { header: 'Correo enviado al profesor', width: 24, dateTime: true, value: r => bogota(r.teacherEmailSentAt) },
];

// HU20 CA2: el archivo contiene exactamente las solicitudes que devuelve el historial con los filtros aplicados.
export async function buildAbsenceRequestsWorkbook(requests: ReviewedAbsenceRequest[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SportPass';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Solicitudes', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS.map(column => ({ header: column.header, width: column.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  for (const request of requests) sheet.addRow(COLUMNS.map(column => column.value(request)));
  for (const [index, column] of COLUMNS.entries()) {
    if (column.dateTime) sheet.getColumn(index + 1).numFmt = 'yyyy-mm-dd hh:mm';
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
