// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import ExcelJS from 'exceljs';
import { buildAbsenceRequestsWorkbook } from './absence-request-export';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { AbsenceRequestReviewService } from './absence-request-review.service';

// Query builder encadenable que registra cada llamada para verificar filtros y orden.
function queryBuilder(result: { many?: unknown[]; one?: unknown; raw?: unknown[] } = {}) {
  const calls: [string, ...unknown[]][] = [];
  const builder: any = {};
  for (const method of ['innerJoinAndSelect', 'innerJoin', 'select', 'addSelect', 'setParameter', 'where', 'andWhere', 'orderBy', 'addOrderBy']) {
    builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  }
  builder.getMany = async () => result.many ?? [];
  builder.getOne = async () => result.one ?? null;
  builder.getRawMany = async () => result.raw ?? [];
  builder.calls = calls;
  return builder as { calls: [string, ...unknown[]][] } & Record<string, any>;
}

const request = (overrides: Record<string, unknown> = {}) => ({
  id: 'request-1',
  status: 'pending_coach_approval',
  createdAt: new Date('2026-11-20T15:00:00Z'),
  subjectName: 'Comunicación escrita',
  teacherName: 'Docente Demo Dos',
  teacherEmail: 'docente.demo2@icesi.edu.co',
  trainingDate: '2026-11-27',
  startTime: '08:00:00',
  endTime: '10:00:00',
  coachRespondedAt: null,
  rejectionComment: null,
  teacherEmailSentAt: null,
  athlete: { id: 'athlete-1', studentCode: 'A001', user: { fullName: 'Valentina Deportista', email: 'athlete.demo@icesi.edu.co' } },
  competition: {
    id: 'competition-1', name: 'Copa Regional', startDate: '2026-11-27', endDate: '2026-11-27', startTime: '07:00:00', endTime: '12:00:00',
    location: 'Coliseo', status: 'programada', team: { id: 'team-1', name: 'Selección Voleibol Femenino', sport: 'Voleibol' },
  },
  ...overrides,
});

describe('AbsenceRequestReviewService', () => {
  const requests: any = { createQueryBuilder: jest.fn(), update: jest.fn() };
  const requestCoaches: any = { find: jest.fn() };
  const callups: any = { createQueryBuilder: jest.fn() };
  let service: AbsenceRequestReviewService;
  let main: ReturnType<typeof queryBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AbsenceRequestReviewService(requests, requestCoaches, callups);
    main = queryBuilder({ many: [request()], one: request() });
    requests.createQueryBuilder.mockReturnValue(main);
    requests.update.mockResolvedValue({ affected: 1 });
    requestCoaches.find.mockResolvedValue([{ requestId: 'request-1', coachId: 'coach-1', coach: { fullName: 'Camilo Entrenador', email: 'coach.demo@icesi.edu.co' } }]);
    callups.createQueryBuilder.mockReturnValue(queryBuilder({ many: [{ athlete: { id: 'athlete-1' }, competition: { id: 'competition-1' } }] }));
  });

  describe('HU16 · bandeja del entrenador', () => {
    it('CA1: limita la bandeja a las solicitudes asignadas al entrenador autenticado', async () => {
      await service.findForCoach('coach-1');
      expect(main.calls).toContainEqual([
        'innerJoin', TrainingAbsenceRequestCoach, 'assignment',
        'assignment.requestId = request.id AND assignment.coachId = :coachId', { coachId: 'coach-1' },
      ]);
    });

    it('CA2: incluye deportista, competencia, entrenamiento, asignatura y correo del docente', async () => {
      const [result] = await service.findForCoach('coach-1');
      expect(result).toMatchObject({
        athlete: { fullName: 'Valentina Deportista' },
        competition: { name: 'Copa Regional' },
        trainingDate: '2026-11-27',
        startTime: '08:00',
        endTime: '10:00',
        subjectName: 'Comunicación escrita',
        teacherEmail: 'docente.demo2@icesi.edu.co',
      });
    });

    it('CA3: ordena primero las pendientes por la fecha de entrenamiento más próxima', async () => {
      await service.findForCoach('coach-1');
      const order = main.calls.filter(([method]) => method === 'orderBy' || method === 'addOrderBy');
      expect(main.calls).toContainEqual(['setParameter', 'pendingStatus', 'pending_coach_approval']);
      expect(order).toEqual([
        ['orderBy', 'pending_rank', 'ASC'],
        ['addOrderBy', 'pending_training_date', 'ASC'],
        ['addOrderBy', 'request.trainingDate', 'DESC'],
        ['addOrderBy', 'request.startTime', 'ASC'],
      ]);
    });

    it('indica si el deportista está convocado oficialmente a la competencia', async () => {
      const [withCallup] = await service.findForCoach('coach-1');
      expect(withCallup.officialCallup).toBe(true);
      callups.createQueryBuilder.mockReturnValue(queryBuilder({ many: [] }));
      const [withoutCallup] = await service.findForCoach('coach-1');
      expect(withoutCallup.officialCallup).toBe(false);
    });

    it('no permite abrir una solicitud asignada a otro entrenador', async () => {
      requests.createQueryBuilder.mockReturnValue(queryBuilder({ one: null }));
      await expect(service.findOneForCoach('coach-2', 'request-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('HU17 · decidir como entrenador', () => {
    it('CA1: aprueba y guarda la fecha de respuesta de la solicitud pendiente', async () => {
      const result = await service.decideForCoach('coach-1', 'request-1', 'approve');
      expect(result.status).toBe('pending_coach_approval'); // El stub de lectura no cambia de estado.
      expect(requests.update).toHaveBeenCalledWith(
        { id: 'request-1', status: 'pending_coach_approval' },
        expect.objectContaining({ status: 'approved_by_coach', coachRespondedAt: expect.any(Date), respondedByCoach: { id: 'coach-1' }, rejectionComment: null }),
      );
    });

    it('CA2: exige un motivo para rechazar', async () => {
      await expect(service.decideForCoach('coach-1', 'request-1', 'reject', '   ')).rejects.toThrow('motivo');
      expect(requests.update).not.toHaveBeenCalled();
    });

    it('CA2: guarda el motivo al rechazar', async () => {
      await service.decideForCoach('coach-1', 'request-1', 'reject', ' No estaba convocado ');
      expect(requests.update).toHaveBeenCalledWith(
        { id: 'request-1', status: 'pending_coach_approval' },
        expect.objectContaining({ status: 'rejected_by_coach', respondedByCoach: { id: 'coach-1' }, rejectionComment: 'No estaba convocado' }),
      );
    });

    it('CA3: no modifica solicitudes previamente resueltas', async () => {
      requests.createQueryBuilder.mockReturnValue(queryBuilder({ one: request({ status: 'cancelled' }) }));
      await expect(service.decideForCoach('coach-1', 'request-1', 'approve')).rejects.toThrow('ya fue procesada');
      expect(requests.update).not.toHaveBeenCalled();
    });
  });

  describe('HU20 · historial general', () => {
    it('CA1: aplica todos los filtros seleccionados', async () => {
      await service.findForAdmin({
        teamId: 'team-1', athleteId: 'athlete-1', competitionId: 'competition-1', teacherEmail: 'Docente.Demo2@icesi.edu.co',
        status: 'rejected_by_coach', from: '2026-11-01', to: '2026-11-30', coachId: 'coach-1',
      });
      expect(main.calls).toEqual(expect.arrayContaining([
        ['andWhere', 'team.id = :teamId', { teamId: 'team-1' }],
        ['andWhere', 'athlete.id = :athleteId', { athleteId: 'athlete-1' }],
        ['andWhere', 'competition.id = :competitionId', { competitionId: 'competition-1' }],
        ['andWhere', 'LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: 'docente.demo2@icesi.edu.co' }],
        ['andWhere', 'request.status = :status', { status: 'rejected_by_coach' }],
        ['andWhere', 'request.trainingDate >= :from', { from: '2026-11-01' }],
        ['andWhere', 'request.trainingDate <= :to', { to: '2026-11-30' }],
      ]));
      expect(main.calls).toContainEqual(['andWhere', expect.any(Function), { coachId: 'coach-1' }]);
    });

    it('CA1: sin filtros devuelve todas las solicitudes', async () => {
      const result = await service.findForAdmin({});
      expect(main.calls.some(([method]) => method === 'andWhere')).toBe(false);
      expect(result).toHaveLength(1);
    });

    it('CA2: exporta a Excel las solicitudes recibidas, con encabezados', async () => {
      const rows = await service.findForAdmin({});
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await buildAbsenceRequestsWorkbook(rows) as any);
      const sheet = workbook.getWorksheet('Solicitudes')!;
      expect(sheet.rowCount).toBe(2);
      expect(sheet.getRow(1).getCell(1).value).toBe('Fecha de solicitud');
      expect(sheet.getRow(2).getCell(3).value).toBe('Valentina Deportista');
      expect(sheet.getRow(2).getCell(2).value).toBe('Pendiente');
      expect(sheet.getRow(1).getCell(12).value).toBe('Fecha del entrenamiento');
    });

    it('arma las opciones de filtro sin duplicados', async () => {
      requests.createQueryBuilder.mockReturnValue(queryBuilder({ many: [request(), request({ id: 'request-2' })] }));
      const options = await service.findAdminFilterOptions();
      expect(options.teams).toEqual([{ id: 'team-1', label: 'Selección Voleibol Femenino' }]);
      expect(options.teachers).toEqual([{ id: 'docente.demo2@icesi.edu.co', label: 'Docente Demo Dos (docente.demo2@icesi.edu.co)' }]);
      expect(options.coaches).toEqual([{ id: 'coach-1', label: 'Camilo Entrenador' }]);
    });
  });
});
