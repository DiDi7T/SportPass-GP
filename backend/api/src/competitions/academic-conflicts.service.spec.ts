import { jest } from '@jest/globals';
import { AcademicConflictsService, intervalsOverlap, toBogotaInstant } from './academic-conflicts.service';
import type { MyCompetitionsService } from './my-competitions.service';
import type { DataSource } from 'typeorm';

const athleteId = '11111111-1111-4111-8111-111111111111';
const competition = {
  id: '22222222-2222-4222-8222-222222222222',
  startDate: '2026-11-10', endDate: '2026-11-10',
  startTime: '09:00', endTime: '11:00',
};

function createFixture(synced = true, classes: Record<string, unknown>[] = []) {
  const mine = { findMine: jest.fn().mockResolvedValue({ competitions: [competition] }) };
  const db = { query: jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM athletes')) return [{ id: athleteId }];
    if (sql.includes('FROM academic_schedule_sync')) return synced ? [{
      status: 'synced', coverage_start: '2026-11-10T00:00:00-05:00', coverage_end: '2026-11-11T00:00:00-05:00',
    }] : [];
    if (sql.includes('FROM academic_class_sessions')) return classes;
    throw new Error('Consulta inesperada: ' + sql);
  }) };
  const service = new AcademicConflictsService(db as unknown as DataSource, mine as unknown as MyCompetitionsService);
  return { service, mine, db };
}

describe('HU10 — cruces académicos', () => {
  it('no afirma ausencia de cruces cuando el horario no está sincronizado', async () => {
    const { service } = createFixture(false);
    const result = await service.findForCompetition('user-id', competition.id);
    expect(result.status).toBe('schedule_unavailable');
    expect(result.hasConflicts).toBeNull();
  });

  it('informa correctamente cuando no existen cruces', async () => {
    const { service } = createFixture();
    const result = await service.findForCompetition('user-id', competition.id);
    expect(result.status).toBe('checked');
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });

  it('devuelve asignatura, NRC y contacto institucional cuando existe cruce', async () => {
    const { service } = createFixture(true, [{
      id: 'class-1', subjectName: 'Cálculo', subjectCode: 'MAT100', nrc: '23000',
      startsAt: '2026-11-10T14:00:00.000Z', endsAt: '2026-11-10T15:00:00.000Z',
      teacherName: 'Profesor Ejemplo', teacherEmail: 'ejemplo@icesi.edu.co',
    }]);
    const result = await service.findForCompetition('user-id', competition.id);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts[0].teacher.email).toBe('ejemplo@icesi.edu.co');
    expect(result.conflicts[0].nrc).toBe('23000');
  });

  it('rechaza una competencia ajena antes de consultar datos académicos', async () => {
    const { service, db } = createFixture();
    await expect(service.findForCompetition('user-id', 'other-id')).rejects.toMatchObject({ status: 404 });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('no cuenta extremos contiguos como cruce', () => {
    expect(intervalsOverlap(toBogotaInstant('2026-11-10', '08:00'), toBogotaInstant('2026-11-10', '09:00'),
      toBogotaInstant('2026-11-10', '09:00'), toBogotaInstant('2026-11-10', '11:00'))).toBe(false);
  });
});
