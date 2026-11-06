import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { AttendanceService, AttendanceSummary, MIN_ATTENDANCE_PERCENTAGE, summarizeAttendance } from '../attendance/attendance.service';
import { Sport } from '../sports/entities/sport.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';
import { Team } from '../teams/entities/team.entity';
import { hasEnded } from './competitions.service';
import { Competition } from './entities/competition.entity';

export const ATTENDANCE_BELOW_MINIMUM = 'ATTENDANCE_BELOW_MINIMUM';
export const NOT_AN_ATHLETE = 'NOT_AN_ATHLETE';

// Colombia es siempre UTC-5: "hoy" en Bogotá para filtrar competencias ya terminadas.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const bogotaToday = (now: Date) => new Date(now.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);

type SportStatus = AttendanceSummary & { sport: string; teamIds: string[] };

const toSportResponse = ({ sport, percentage, attendedSessions, totalSessions, meetsMinimum }: SportStatus) =>
  ({ sport, attendancePercentage: percentage, attendedSessions, totalSessions, meetsMinimum });

const toCompetitionResponse = (competition: Competition) => ({
  id: competition.id,
  name: competition.name,
  team: { id: competition.team.id, name: competition.team.name, sport: competition.team.sport },
  startDate: competition.startDate,
  endDate: competition.endDate,
  startTime: competition.startTime.slice(0, 5),
  endTime: competition.endTime.slice(0, 5),
  location: competition.location,
  venueAddress: competition.venueAddress,
  opponent: competition.opponent,
  type: competition.type,
  status: competition.status,
});

// Porcentaje acumulado de varios deportes: suma de asistencias sobre suma de sesiones.
const aggregate = (sports: SportStatus[]) =>
  summarizeAttendance(
    sports.reduce((sum, sport) => sum + sport.attendedSessions, 0),
    sports.reduce((sum, sport) => sum + sport.totalSessions, 0),
  );

@Injectable()
export class MyCompetitionsService {
  constructor(
    @InjectRepository(Athlete) private readonly athletes: Repository<Athlete>,
    @InjectRepository(TeamAthlete) private readonly teamAthletes: Repository<TeamAthlete>,
    @InjectRepository(Sport) private readonly sports: Repository<Sport>,
    @InjectRepository(Competition) private readonly competitions: Repository<Competition>,
    private readonly attendance: AttendanceService,
  ) {}

  
  async findMine(userId: string, now = new Date()) {
    const athlete = await this.athletes.findOne({ where: { user: { id: userId }, isActive: true } });
    if (!athlete) {
      throw new ForbiddenException({ statusCode: 403, code: NOT_AN_ATHLETE, message: 'Solo los deportistas oficiales pueden consultar sus competencias.' });
    }

    const memberships = await this.teamAthletes.find({
      where: { athlete: { id: athlete.id }, active: true, team: { isActive: true } },
      relations: { team: true },
    });
    const sports = await this.evaluateSports(athlete.id, memberships.map(membership => membership.team));
    const eligible = sports.filter(sport => sport.meetsMinimum);
    const blocked = sports.filter(sport => !sport.meetsMinimum);

    if (sports.length > 0 && eligible.length === 0) {
      const { percentage } = aggregate(blocked);
      throw new ForbiddenException({
        statusCode: 403,
        code: ATTENDANCE_BELOW_MINIMUM,
        message: `No cumples con el ${MIN_ATTENDANCE_PERCENTAGE}% de asistencia mínima para competir. Tu asistencia actual es del ${percentage}%.`,
        attendancePercentage: percentage,
        minimumPercentage: MIN_ATTENDANCE_PERCENTAGE,
        sports: blocked.map(toSportResponse),
      });
    }

    return {
      attendancePercentage: aggregate(eligible).percentage,
      minimumPercentage: MIN_ATTENDANCE_PERCENTAGE,
      sports: sports.map(toSportResponse),
      blockedSports: blocked.map(toSportResponse),
      competitions: await this.findUpcoming(eligible.flatMap(sport => sport.teamIds), now),
    };
  }

  // Agrupa los equipos por deporte y calcula la asistencia una vez por deporte.
  // El deporte se toma de teams.sport_id
  private async evaluateSports(athleteId: string, teams: Team[]): Promise<SportStatus[]> {
    const groups = new Map<string, { sportId: string | null; sport: string; teamIds: string[] }>();
    for (const team of teams) {
      const sportId = team.sportId ?? (await this.sports.findOne({ where: { name: team.sport } }))?.id ?? null;
      const key = sportId ?? `name:${team.sport}`;
      const group = groups.get(key) ?? { sportId, sport: team.sport, teamIds: [] };
      group.teamIds.push(team.id);
      groups.set(key, group);
    }
    return Promise.all([...groups.values()].map(async ({ sportId, sport, teamIds }) => ({
      sport,
      teamIds,
      ...(await this.attendance.getSportAttendance(athleteId, sportId)),
    })));
  }

//mostramos por su estado
 private async findUpcoming(teamIds: string[], now: Date) {
    if (teamIds.length === 0) return [];
    const competitions = await this.competitions.find({
      where: { teamId: In(teamIds), status: Not('cancelada'), endDate: MoreThanOrEqual(bogotaToday(now)) },
      relations: { team: true },
      order: { startDate: 'ASC', startTime: 'ASC' },
    });
    return competitions.filter(competition => !hasEnded(competition, now)).map(toCompetitionResponse);
  }
}
