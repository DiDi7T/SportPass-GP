import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Team } from './entities/team.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({
      relations: { coach: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: { coach: true },
    });

    if (!team) {
      throw new NotFoundException('El equipo no existe');
    }

    return team;
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    let coach: User | null = null;

    if (dto.coachId) {
      coach = await this.userRepository.findOne({
        where: { id: dto.coachId },
      });

      if (!coach) {
        throw new NotFoundException('El entrenador no existe');
      }
    }

    const existingTeam = await this.teamRepository.findOne({
      where: { name: dto.name },
    });

    if (existingTeam) {
      throw new ConflictException('Ya existe un equipo con ese nombre');
    }

    const team = this.teamRepository.create({
      name: dto.name,
      sport: dto.sport,
      coach,
      isActive: dto.isActive ?? true,
    });

    return this.teamRepository.save(team);
  }


  async remove(id: string): Promise<Team> {
    const team = await this.findOne(id);

    
    team.isActive = false;

    return this.teamRepository.save(team);
  }
}