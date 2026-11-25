// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import ExcelJS from 'exceljs';
import { buildAbsenceRequestsWorkbook } from './absence-request-export';
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
  return builder;
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
  const requests: any = { createQueryBuilder: jest.fn() };
  const requestCoaches: any = { find: jest.fn() };
  const callups: any = { createQueryBuilder: jest.fn() };
  const users: any = { findOne: jest.fn() };
  let service: AbsenceRequestReviewService;
  let main: ReturnType<typeof queryBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AbsenceRequestReviewService(requests, requestCoaches, callups, users);
    main = queryBuilder({ many: [request()], one: request() });
    requests.createQueryBuilder.mockReturnValue(main);
    users.findOne.mockResolvedValue({ id: 'teacher-1', email: 'Docente.Demo2@icesi.edu.co' });
    requestCoaches.find.mockResolvedValue([{ requestId: 'request-1', coach: { fullName: 'Camilo Entrenador', email: 'coach.demo@icesi.edu.co' } }]);
    callups.createQueryBuilder.mockReturnValue(queryBuilder({ many: [{ athlete: { id: 'athlete-1' }, competition: { id: 'competition-1' } }] }));
  });

  describe('HU16 · bandeja del profesor', () => {
    it('CA1: limita las solicitudes al correo del profesor autenticado', async () => {
      await service.findForTeacher('teacher-1', {});
      expect(main.calls).toContainEqual(['where', 'LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: 'docente.demo2@icesi.edu.co' }]);
    });

    it('CA1: ordena primero las pendientes y luego por la competencia más próxima', async () => {
      await service.findForTeacher('teacher-1', {});
      const order = main.calls.filter(([method]) => method === 'orderBy' || method === 'addOrderBy');
      expect(main.calls).toContainEqual(['setParameter', 'pendingStatus', 'pending_coach_approval']);
      expect(order.slice(0, 3)).toEqual([
        ['orderBy', 'pending_rank', 'ASC'],
        ['addOrderBy', 'competition.startDate', 'ASC'],
        ['addOrderBy', 'competition.startTime', 'ASC'],
      ]);
    });

    it('CA2: aplica los filtros de curso, estado y fecha', async () => {
      await service.findForTeacher('teacher-1', { course: 'Comunicación escrita', status: 'approved_by_coach', date: '2026-11-27' });
      expect(main.calls).toEqual(expect.arrayContaining([
        ['andWhere', 'request.subjectName = :course', { course: 'Comunicación escrita' }],
        ['andWhere', 'request.status = :status', { status: 'approved_by_coach' }],
        ['andWhere', 'request.trainingDate = :date', { date: '2026-11-27' }],
      ]));
    });

    it('CA3: indica la convocatoria oficial y el entrenador, sin datos académicos', async () => {
      const [result] = await service.findForTeacher('teacher-1', {});
      expect(result.officialCallup).toBe(true);
      expect(result.coaches).toEqual([{ fullName: 'Camilo Entrenador', email: 'coach.demo@icesi.edu.co' }]);
      expect(Object.keys(result.athlete).sort()).toEqual(['email', 'fullName', 'id', 'studentCode']);
      expect(JSON.stringify(result)).not.toMatch(/average|promedio|gpa|history|historial/i);
    });

    it('CA3: marca la solicitud cuando el deportista no tiene convocatoria registrada', async () => {
      callups.createQueryBuilder.mockReturnValue(queryBuilder({ many: [] }));
      const [result] = await service.findForTeacher('teacher-1', {});
      expect(result.officialCallup).toBe(false);
    });

    it('no permite abrir una solicitud dirigida a otro profesor', async () => {
      requests.createQueryBuilder.mockReturnValue(queryBuilder({ one: null }));
      await expect(service.findOneForTeacher('teacher-1', 'request-2')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza a un usuario inactivo o inexistente', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(service.findForTeacher('teacher-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('HU20 · historial general', () => {
    it('CA1: aplica todos los filtros seleccionados', async () => {
      await service.findForAdmin({
        teamId: 'team-1', athleteId: 'athlete-1', competitionId: 'competition-1', teacherEmail: 'Docente.Demo2@icesi.edu.co',
        status: 'rejected_by_coach', from: '2026-11-01', to: '2026-11-30',
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
    });

    it('arma las opciones de filtro sin duplicados', async () => {
      requests.createQueryBuilder.mockReturnValue(queryBuilder({ many: [request(), request({ id: 'request-2' })] }));
      const options = await service.findAdminFilterOptions();
      expect(options.teams).toEqual([{ id: 'team-1', label: 'Selección Voleibol Femenino' }]);
      expect(options.teachers).toEqual([{ id: 'docente.demo2@icesi.edu.co', label: 'Docente Demo Dos (docente.demo2@icesi.edu.co)' }]);
    });
  });
});
