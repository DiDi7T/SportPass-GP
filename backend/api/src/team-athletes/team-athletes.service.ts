
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeamAthlete } from './entities/team-athlete.entity';
import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { AssignAthleteDto } from './dto/assign-athlete.dto';

@Injectable()
export class TeamAthletesService {
  constructor(
    @InjectRepository(TeamAthlete)
    private readonly teamAthleteRepository: Repository<TeamAthlete>,

    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,

    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
  ) {}

  // Comprueba que el equipo exista y que el usuario sea su entrenador.
  private async validateCoach(
    teamId: string,
    userId: string,
  ): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: { coach: true },
    });

    if (!team) {
      throw new NotFoundException('El equipo no existe');
    }

    if (!team.coach || team.coach.id !== userId) {
      throw new ForbiddenException(
        'No eres el entrenador asignado a este equipo',
      );
    }

    return team;
  }

  // Deportistas que todavía no pertenecen al equipo.
  async findAvailable(
    teamId: string,
    userId: string,
  ): Promise<Athlete[]> {
    await this.validateCoach(teamId, userId);

    return this.athleteRepository
      .createQueryBuilder('athlete')
      .innerJoinAndSelect('athlete.user', 'user')
      .where('athlete.isActive = :active', { active: true })
      .andWhere('user.isActive = :active', { active: true })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(TeamAthlete, 'ta')
          .where('ta.athlete_id = athlete.id')
          .andWhere('ta.team_id = :teamId')
          .andWhere('ta.active = true')
          .getQuery();

        return `NOT EXISTS ${subQuery}`;
      })
      .setParameter('teamId', teamId)
      .orderBy('athlete.lastName', 'ASC')
      .addOrderBy('athlete.firstName', 'ASC')
      .getMany();
  }

  // Consultar integrantes activos.
  async findByTeam(
    teamId: string,
    userId: string,
  ): Promise<TeamAthlete[]> {
    await this.validateCoach(teamId, userId);

    return this.teamAthleteRepository.find({
      where: {
        team: { id: teamId },
        active: true,
      },
      relations: {
        athlete: {
          user: true,
        },
        team: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  // Incorporar un deportista al equipo.
  async assign(
    teamId: string,
    dto: AssignAthleteDto,
    userId: string,
  ): Promise<TeamAthlete> {
    const team = await this.validateCoach(teamId, userId);

    if (!team.isActive) {
      throw new ConflictException(
        'No se pueden asignar deportistas a un equipo inactivo',
      );
    }

    const athlete = await this.athleteRepository.findOne({
      where: { id: dto.athleteId },
      relations: { user: true },
    });

    if (!athlete) {
      throw new NotFoundException('El deportista no existe');
    }

    if (!athlete.isActive || !athlete.user.isActive) {
      throw new ConflictException(
        'El deportista o su cuenta institucional están inactivos',
      );
    }

    const existingAssignment =
      await this.teamAthleteRepository.findOne({
        where: {
          team: { id: teamId },
          athlete: { id: dto.athleteId },
        },
      });

    if (existingAssignment) {
      if (existingAssignment.active) {
        throw new ConflictException(
          'El deportista ya pertenece a este equipo',
        );
      }

      // Reactivar una pertenencia anterior.
      existingAssignment.active = true;

      return this.teamAthleteRepository.save(existingAssignment);
    }

    const assignment = this.teamAthleteRepository.create({
      team,
      athlete,
      active: true,
    });

    return this.teamAthleteRepository.save(assignment);
  }

  // Retirar un deportista sin eliminar el historial.
  async remove(
    id: string,
    userId: string,
  ): Promise<TeamAthlete> {
    const assignment = await this.teamAthleteRepository.findOne({
      where: { id },
      relations: {
        team: {
          coach: true,
        },
        athlete: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'La asignación del deportista no existe',
      );
    }

    if (
      !assignment.team.coach ||
      assignment.team.coach.id !== userId
    ) {
      throw new ForbiddenException(
        'No eres el entrenador asignado a este equipo',
      );
    }

    if (!assignment.active) {
      throw new ConflictException(
        'El deportista ya está retirado de este equipo',
      );
    }

    assignment.active = false;

    return this.teamAthleteRepository.save(assignment);
  }
}
