import {
  ConflictException,
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

  async findByTeam(teamId: string): Promise<TeamAthlete[]> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('El equipo no existe');
    }

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

  async assign(
    teamId: string,
    dto: AssignAthleteDto,
  ): Promise<TeamAthlete> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('El equipo no existe');
    }

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

    const existingAssignment = await this.teamAthleteRepository.findOne({
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

  async remove(id: string): Promise<TeamAthlete> {
    const assignment = await this.teamAthleteRepository.findOne({
      where: { id },
      relations: {
        team: true,
        athlete: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'La asignación del deportista no existe',
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