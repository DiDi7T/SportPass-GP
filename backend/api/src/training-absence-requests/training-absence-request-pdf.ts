import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

export type TrainingAbsencePermitPdfData = {
  studentName: string;
  studentCode: string;
  sport: string;
  competitionName: string;
  trainingDate: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  coachName: string;
  approvedAt: Date;
};

type Field = { label: string; value: string };
type FieldRow = [Field, Field?];

const brandBlue = '#5454E9';
const black = '#111111';
const white = '#FFFFFF';
const logoPathCandidates = [
  join(process.cwd(), 'src/assets/ICESI_logo.svg'),
  join(process.cwd(), 'dist/assets/ICESI_logo.svg'),
  join(process.cwd(), 'assets/ICESI_logo.svg'),
  join(process.cwd(), 'backend/api/src/assets/ICESI_logo.svg'),
  join(process.cwd(), 'backend/api/dist/assets/ICESI_logo.svg'),
];
const logoPath = logoPathCandidates.find((candidate) => existsSync(candidate));
if (!logoPath) throw new Error('No se encontró el recurso del logo oficial de Icesi.');
const logoSvg = readFileSync(logoPath, 'utf8');
const logoPaths = [...logoSvg.matchAll(/<path\b[^>]*\bd="([^"]+)"/gs)].map((match) => match[1]);

if (logoPaths.length === 0) {
  throw new Error('No se pudieron leer las formas del logo oficial de Icesi.');
}

function formatTrainingDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatApprovalDate(value: Date) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(value);
}

function drawField(doc: PDFKit.PDFDocument, field: Field, x: number, y: number, width: number) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(brandBlue)
    .text(field.label.toLocaleUpperCase('es-CO'), x, y, { width });
  const valueY = y + 13;
  doc.font('Helvetica').fontSize(10.5).fillColor(black)
    .text(field.value, x, valueY, { width, lineGap: 2 });
  return valueY + doc.heightOfString(field.value, { width, lineGap: 2 }) + 10;
}

export function buildTrainingAbsencePermitPdf(data: TrainingAbsencePermitPdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    info: {
      Title: 'Constancia de aval de entrenamiento deportivo',
      Author: 'SportPass Icesi',
      Subject: `Constancia para ${data.studentName}`,
    },
  });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    const headerHeight = 178;

    // Encabezado Icesi en su azul institucional, con el logo oficial en blanco.
    doc.rect(0, 0, pageWidth, headerHeight).fill(brandBlue);
    const logoWidth = 385;
    const logoScale = logoWidth / 560;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.save().translate(logoX, -15).scale(logoScale);
    for (const path of logoPaths) doc.path(path).fill(white);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(white)
      .text('SPORTPASS', margin, 153, { width: contentWidth, align: 'center', characterSpacing: 1.4 });

    doc.font('Helvetica-Bold').fontSize(17).fillColor(brandBlue)
      .text('Constancia de aval de entrenamiento deportivo', margin, 204, { width: contentWidth });
    doc.font('Helvetica').fontSize(9.5).fillColor(black)
      .text('Documento informativo asociado a una solicitud aprobada por el entrenador.', margin, 230, { width: contentWidth });

    const fields: FieldRow[] = [
      [{ label: 'Estudiante deportista', value: data.studentName }],
      [
        { label: 'Código estudiantil', value: data.studentCode },
        { label: 'Disciplina deportiva', value: data.sport },
      ],
      [{ label: 'Competencia', value: data.competitionName }],
      [{ label: 'Fecha y hora del entrenamiento', value: `${formatTrainingDate(data.trainingDate)}  ·  ${data.startTime} a ${data.endTime}` }],
      [
        { label: 'Materia', value: data.subjectName },
        { label: 'Docente', value: data.teacherName },
      ],
      [{ label: 'Entrenador que avala', value: data.coachName }],
    ];
    const cardX = margin;
    const cardY = 258;
    const padding = 18;
    const columnGap = 20;
    const columnWidth = (contentWidth - padding * 2 - columnGap) / 2;
    let cardHeight = padding * 2;
    for (const row of fields) {
      doc.font('Helvetica').fontSize(10.5);
      const leftHeight = 13 + doc.heightOfString(row[0].value, { width: row[1] ? columnWidth : contentWidth - padding * 2, lineGap: 2 }) + 10;
      const rightHeight = row[1]
        ? 13 + doc.heightOfString(row[1].value, { width: columnWidth, lineGap: 2 }) + 10
        : 0;
      cardHeight += Math.max(leftHeight, rightHeight) + 9;
    }
    doc.roundedRect(cardX, cardY, contentWidth, cardHeight, 12)
      .fillAndStroke(white, brandBlue);

    let y = cardY + padding;
    for (const row of fields) {
      const leftWidth = row[1] ? columnWidth : contentWidth - padding * 2;
      const leftBottom = drawField(doc, row[0], cardX + padding, y, leftWidth);
      const rightBottom = row[1]
        ? drawField(doc, row[1], cardX + padding + columnWidth + columnGap, y, columnWidth)
        : y;
      y = Math.max(leftBottom, rightBottom) + 9;
    }

    const approvalY = cardY + cardHeight + 16;
    doc.roundedRect(margin, approvalY, contentWidth, 58, 10)
      .fillAndStroke(white, brandBlue);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(brandBlue)
      .text('FECHA Y HORA DE APROBACIÓN', margin + 16, approvalY + 12, { width: contentWidth - 32 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(black)
      .text(formatApprovalDate(data.approvedAt), margin + 16, approvalY + 27, { width: contentWidth - 32 });

    const footerY = pageHeight - 108;
    doc.moveTo(margin, footerY - 14).lineTo(pageWidth - margin, footerY - 14)
      .lineWidth(0.8).strokeColor(brandBlue).stroke();
    const legal = 'Este es un documento informativo de aval de entrenamiento deportivo y no constituye una incapacidad ni un permiso oficial de Bienestar Universitario.';
    doc.font('Helvetica-Bold').fontSize(8).fillColor(brandBlue)
      .text('ACLARACIÓN', margin, footerY, { width: contentWidth, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(black)
      .text(legal, margin + 12, footerY + 14, { width: contentWidth - 24, align: 'center', lineGap: 2 });
    doc.font('Helvetica').fontSize(7).fillColor(black)
      .text('SPORTPASS ICESI  ·  Documento generado desde la plataforma', margin, pageHeight - 68, { width: contentWidth, align: 'center' });

    doc.end();
  });
}
