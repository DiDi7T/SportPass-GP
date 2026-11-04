import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition, type CompetitionStatus } from '../competitions/entities/competition.entity';

// Colombia no tiene horario de verano: America/Bogota es siempre UTC-5 (igual que en competitions).
const BOGOTA_OFFSET = '-05:00';
const toInstant = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00${BOGOTA_OFFSET}`);

export type MatchStatus = CompetitionStatus | 'finalizada';

export function resolveStatus(competition: Pick<Competition, 'status' | 'endDate' | 'endTime'>, now = new Date()): MatchStatus {
  if (competition.status === 'cancelada') return 'cancelada';
  if (toInstant(competition.endDate, competition.endTime) <= now) return 'finalizada';
  return competition.status;
}

// Solo datos públicos del partido: no se expone quién creó la competencia ni datos del entrenador.
const toMatch = (competition: Competition, now: Date) => ({
  id: competition.id,
  tournament: competition.name,
  type: competition.type,
  teams: { icesi: competition.team.name, sport: competition.team.sport, opponent: competition.opponent },
  startDate: competition.startDate,
  endDate: competition.endDate,
  startTime: competition.startTime.slice(0, 5),
  endTime: competition.endTime.slice(0, 5),
  venue: { name: competition.location, address: competition.venueAddress },
  status: resolveStatus(competition, now),
});

@Injectable()
export class TournamentsService {
  constructor(@InjectRepository(Competition) private readonly competitions: Repository<Competition>) {}

  async findMatches(now = new Date()) {
    const matches = await this.competitions.createQueryBuilder('competition')
      .innerJoinAndSelect('competition.team', 'team')
      .where('team.isActive = :active', { active: true })
      .orderBy('competition.startDate', 'ASC')
      .addOrderBy('competition.startTime', 'ASC')
      .getMany();
    return matches.map(match => toMatch(match, now));
  }

  async findMatch(id: string, now = new Date()) {
    const match = await this.competitions.findOne({ where: { id, team: { isActive: true } }, relations: { team: true } });
    if (!match) throw new NotFoundException('Partido no encontrado.');
    return toMatch(match, now);
  }
}