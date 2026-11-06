import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MyCompetitionsService } from './my-competitions.service';

// Las competencias de SportPass son horarios locales de Cali (UTC-05:00).
export const toBogotaInstant = (day: string, hour: string) => new Date(`${day}T${hour.slice(0, 5)}:00-05:00`);
export const intervalsOverlap = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) =>
  leftStart.getTime() < rightEnd.getTime() && leftEnd.getTime() > rightStart.getTime();

@Injectable()
export class AcademicConflictsService {
  constructor(private readonly db: DataSource, private readonly myCompetitions: MyCompetitionsService) {}

  async findForCompetition(userId: string, competitionId: string) {
    // Reutiliza la validación del grupo: atleta oficial, equipo activo y asistencia mínima.
    // Una competencia ajena o bloqueada nunca se revela mediante esta HU.
    const mine = await this.myCompetitions.findMine(userId);
    const competition = mine.competitions.find(item => item.id === competitionId);
    if (!competition) throw new NotFoundException('La competencia no está disponible para tu usuario.');

    const start = toBogotaInstant(competition.startDate, competition.startTime);
    const end = toBogotaInstant(competition.endDate, competition.endTime);
    const athleteRows: { id: string }[] = await this.db.query(
      `SELECT id FROM athletes WHERE user_id = $1 AND is_active = true LIMIT 1`, [userId],
    );
    if (!athleteRows.length) throw new NotFoundException('Deportista no encontrado.');
    const athleteId = athleteRows[0].id;
    const states: { status: string; coverage_start: Date; coverage_end: Date }[] = await this.db.query(
      `SELECT status, coverage_start, coverage_end FROM academic_schedule_sync WHERE athlete_id = $1`, [athleteId],
    );
    const covered = states.some(state => state.status === 'synced' &&
      new Date(state.coverage_start).getTime() <= start.getTime() &&
      new Date(state.coverage_end).getTime() >= end.getTime());

    if (!covered) return {
      competitionId, status: 'schedule_unavailable', hasConflicts: null, conflicts: [],
      message: 'Tu horario académico aún no está sincronizado para esta competencia. No es posible confirmar si hay cruces.',
    };

    type ClassRow = {
      id: string; subjectName: string; subjectCode: string; nrc: string;
      startsAt: Date; endsAt: Date; teacherName: string; teacherEmail: string;
    };
    const sessions: ClassRow[] = await this.db.query(`
      SELECT s.id, c.name AS "subjectName", c.code AS "subjectCode", c.nrc,
             s.starts_at AS "startsAt", s.ends_at AS "endsAt",
             c.teacher_name AS "teacherName", c.teacher_email AS "teacherEmail"
      FROM academic_class_sessions s
      JOIN academic_courses c ON c.id = s.course_id
      JOIN academic_enrollments e ON e.course_id = c.id
      WHERE e.athlete_id = $1 AND s.status = 'scheduled'
        AND s.starts_at < $3::timestamptz AND s.ends_at > $2::timestamptz
      ORDER BY s.starts_at, c.name`, [athleteId, start, end]);
    const conflicts = sessions.filter(row => intervalsOverlap(new Date(row.startsAt), new Date(row.endsAt), start, end))
      .map(row => ({
        classSessionId: row.id, subjectName: row.subjectName, subjectCode: row.subjectCode,
        nrc: row.nrc, startsAt: row.startsAt, endsAt: row.endsAt,
        teacher: { fullName: row.teacherName, email: row.teacherEmail },
      }));
    return {
      competitionId, status: 'checked', hasConflicts: conflicts.length > 0, conflicts,
      message: conflicts.length > 0
        ? `Tienes ${conflicts.length} clase(s) que se cruzan con esta competencia.`
        : 'No hay cruces con tus clases para esta competencia; no requieres trámite de permisos por horario.',
    };
  }
}
