import { jest } from '@jest/globals';
import { applyRedirect } from '../mail/mail.service';
import { composeTeacherApprovalEmail, NOT_OFFICIAL_PERMIT } from './teacher-approval-email';
import { TeacherApprovalEmailService } from './teacher-approval-email.service';

// HU18 (SCRUM-35) – Notificar al docente por correo al aprobarse la solicitud.
const approvedAt = new Date('2026-11-25T20:00:00Z');
const approved = (overrides: object = {}) => ({
  id: 'request-1',
  status: 'approved_by_coach',
  trainingDate: '2026-11-27',
  startTime: '14:00:00',
  endTime: '16:00:00',
  subjectName: 'Cálculo',
  teacherName: 'Miguel Triana',
  teacherEmail: 'docente.prueba@icesi.edu.co',
  coachRespondedAt: approvedAt,
  teacherEmailSentAt: null,
  athlete: { studentCode: 'A00123456', user: { fullName: 'Valentina Deportista', email: 'athlete.demo@icesi.edu.co' } },
  competition: { name: 'Copa Universitaria', team: { sport: 'Voleibol' } },
  respondedByCoach: { fullName: 'Camilo Entrenador' },
  ...overrides,
});

describe('TeacherApprovalEmailService', () => {
  const requests: any = { findOne: jest.fn(), update: jest.fn() };
  const mail: any = { send: jest.fn() };
  let service: TeacherApprovalEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeacherApprovalEmailService(requests, mail);
    requests.findOne.mockResolvedValue(approved());
    requests.update.mockResolvedValue({ affected: 1 });
    mail.send.mockResolvedValue({ messageId: 'id-1', previewUrl: null });
  });

  it('CA2: envía al correo del docente registrado, con copia al deportista', async () => {
    expect(await service.notifyTeacherOfApproval('request-1')).toBe('sent');
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'docente.prueba@icesi.edu.co',
      cc: 'athlete.demo@icesi.edu.co',
    }));
  });

  it('CA3: adjunta el comprobante PDF de HU15', async () => {
    await service.notifyTeacherOfApproval('request-1');
    const [{ attachments }] = mail.send.mock.calls[0] as any[];
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({ filename: 'constancia-sportpass-request-1.pdf', contentType: 'application/pdf' });
    expect(attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('CA4: registra el envío exitoso y llena teacher_email_sent_at', async () => {
    await service.notifyTeacherOfApproval('request-1');
    expect(requests.update).toHaveBeenCalledWith({ id: 'request-1' }, {
      teacherEmailStatus: 'sent',
      teacherEmailError: null,
      teacherEmailAttemptedAt: expect.any(Date),
      teacherEmailSentAt: expect.any(Date),
    });
  });

  it('CA4: si el envío falla, registra el error sin lanzar y sin marcar el correo como enviado', async () => {
    mail.send.mockRejectedValue(new Error('Invalid login: 535 Authentication failed'));
    expect(await service.notifyTeacherOfApproval('request-1')).toBe('failed');
    expect(requests.update).toHaveBeenCalledWith({ id: 'request-1' }, {
      teacherEmailStatus: 'failed',
      teacherEmailError: 'Invalid login: 535 Authentication failed',
      teacherEmailAttemptedAt: expect.any(Date),
    });
    expect(requests.update.mock.calls.flat()).not.toContainEqual(expect.objectContaining({ teacherEmailSentAt: expect.anything() }));
  });

  it('CA4: registra como fallo una aprobación sin entrenador registrado', async () => {
    requests.findOne.mockResolvedValue(approved({ respondedByCoach: null }));
    expect(await service.notifyTeacherOfApproval('request-1')).toBe('failed');
    expect(mail.send).not.toHaveBeenCalled();
    expect(requests.update).toHaveBeenCalledWith({ id: 'request-1' }, expect.objectContaining({ teacherEmailStatus: 'failed' }));
  });

  it('CA1: no envía nada si la solicitud no está aprobada', async () => {
    for (const status of ['pending_coach_approval', 'rejected_by_coach', 'cancelled']) {
      requests.findOne.mockResolvedValue(approved({ status }));
      expect(await service.notifyTeacherOfApproval('request-1')).toBe('skipped');
    }
    expect(mail.send).not.toHaveBeenCalled();
    expect(requests.update).not.toHaveBeenCalled();
  });

  it('CA1: no envía dos veces el mismo correo', async () => {
    requests.findOne.mockResolvedValue(approved({ teacherEmailSentAt: new Date() }));
    expect(await service.notifyTeacherOfApproval('request-1')).toBe('skipped');
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('no hace nada si la solicitud no existe', async () => {
    requests.findOne.mockResolvedValue(null);
    expect(await service.notifyTeacherOfApproval('missing')).toBe('skipped');
  });
});

describe('composeTeacherApprovalEmail (CA3)', () => {
  const data = {
    studentName: 'Valentina Deportista',
    studentCode: 'A00123456',
    sport: 'Voleibol',
    competitionName: 'Copa Universitaria',
    trainingDate: '2026-11-27',
    startTime: '14:00',
    endTime: '16:00',
    subjectName: 'Cálculo',
    teacherName: 'Miguel Triana',
    coachName: 'Camilo Entrenador',
    approvedAt,
  };

  it('incluye estudiante, código, disciplina, competencia, entrenamiento, materia y entrenador', () => {
    const { subject, text, html } = composeTeacherApprovalEmail(data);
    expect(subject).toBe('Aviso de ausencia por entrenamiento: Valentina Deportista (Cálculo)');
    for (const value of ['Valentina Deportista', 'A00123456', 'Voleibol', 'Copa Universitaria', 'Cálculo', '14:00', '16:00', 'Camilo Entrenador', '27 de noviembre de 2026']) {
      expect(text).toContain(value);
      expect(html).toContain(value);
    }
  });

  it('aclara que no es un permiso oficial de Bienestar Universitario', () => {
    const { text, html } = composeTeacherApprovalEmail(data);
    expect(NOT_OFFICIAL_PERMIT).toContain('Bienestar Universitario');
    expect(text).toContain(NOT_OFFICIAL_PERMIT);
    expect(html).toContain(NOT_OFFICIAL_PERMIT);
  });

  it('escapa en el HTML los datos escritos por el deportista', () => {
    const { html } = composeTeacherApprovalEmail({ ...data, subjectName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('applyRedirect (MAIL_REDIRECT_TO)', () => {
  const message = { to: 'docente.prueba@icesi.edu.co', cc: 'athlete.demo@icesi.edu.co', subject: 'Aviso', text: 't', html: 'h' };

  it('desvía todo a la dirección configurada y deja en el asunto a quién iba dirigido', () => {
    expect(applyRedirect(message, 'yo@gmail.com')).toMatchObject({
      to: 'yo@gmail.com',
      cc: undefined,
      subject: '[Para: docente.prueba@icesi.edu.co; CC: athlete.demo@icesi.edu.co] Aviso',
    });
  });

  it('con MAIL_REDIRECT_CC_TO envía el correo a una dirección y la copia a otra', () => {
    expect(applyRedirect(message, 'institucional@u.icesi.edu.co', 'personal@gmail.com')).toMatchObject({
      to: 'institucional@u.icesi.edu.co',
      cc: 'personal@gmail.com',
      subject: '[Para: docente.prueba@icesi.edu.co; CC: athlete.demo@icesi.edu.co] Aviso',
    });
  });

  it('no agrega copia si el correo original no tenía', () => {
    const withoutCc = { ...message, cc: undefined };
    expect(applyRedirect(withoutCc, 'yo@gmail.com', 'personal@gmail.com')).toMatchObject({
      to: 'yo@gmail.com',
      cc: undefined,
      subject: '[Para: docente.prueba@icesi.edu.co] Aviso',
    });
  });

  it('MAIL_REDIRECT_CC_TO sola no redirige nada (nunca envía a destinatarios reales por error a medias)', () => {
    expect(applyRedirect(message, undefined, 'personal@gmail.com')).toBe(message);
  });

  it('sin redirección (producción) envía a los destinatarios reales', () => {
    expect(applyRedirect(message, undefined)).toBe(message);
    expect(applyRedirect(message, '  ')).toBe(message);
  });
});
