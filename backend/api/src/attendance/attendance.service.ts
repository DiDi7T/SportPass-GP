import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';

// HU5: porcentaje mínimo de asistencia a entrenamientos para poder ver/competir.
export const MIN_ATTENDANCE_PERCENTAGE = 70;

export type AttendanceSummary = {
  attendedSessions: number;
  totalSessions: number;
  percentage: number;
  meetsMinimum: boolean;
};

// El 100% son las fechas distintas en que hubo entrenamiento registrado en el deporte.
// Sin historial de entrenamientos se asume 100% (nadie puede incumplir algo que no existe).
// La comparación se hace con enteros para que 7 de 10 sea exactamente 70% (sin errores de
// punto flotante), y el porcentaje mostrado se trunca para no mostrar "70%" a quien tiene 69,9%.
export const summarizeAttendance = (attendedSessions: number, totalSessions: number): AttendanceSummary => {
  if (totalSessions === 0) return { attendedSessions, totalSessions, percentage: 100, meetsMinimum: true };
  return {
    attendedSessions,
    totalSessions,
    percentage: Math.floor((attendedSessions * 100) / totalSessions),
    meetsMinimum: attendedSessions * 100 >= totalSessions * MIN_ATTENDANCE_PERCENTAGE,
  };
};

@Injectable()
export class AttendanceService {
  constructor(@InjectRepository(Attendance) private readonly attendances: Repository<Attendance>) {}

  // Asistencia de un atleta a los entrenamientos de un deporte (participants + attendances, HU9).
  // Si el atleta nunca se registró como participante, attended = 0.
  async getSportAttendance(athleteId: string, sportId: string | null): Promise<AttendanceSummary> {
    if (!sportId) return summarizeAttendance(0, 0);
    const row = await this.attendances.createQueryBuilder('attendance')
      .innerJoin('attendance.participant', 'participant')
      .select('COUNT(DISTINCT attendance.session_date)', 'total')
      .addSelect('COUNT(DISTINCT attendance.session_date) FILTER (WHERE participant.athlete_id = :athleteId)', 'attended')
      .where('participant.sport_id = :sportId', { sportId })
      .setParameter('athleteId', athleteId)
      .getRawOne<{ total: string; attended: string }>();
    return summarizeAttendance(Number(row?.attended ?? 0), Number(row?.total ?? 0));
  }
}
