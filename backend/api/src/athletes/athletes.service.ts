import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Athlete } from './entities/athlete.entity';
import { User } from '../users/entities/user.entity';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';

@Injectable()
export class AthletesService {
  constructor(
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Athlete[]> {
    return this.athleteRepository.find({
      relations: { user: true },
      order: { lastName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Athlete> {
    const athlete = await this.athleteRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!athlete) {
      throw new NotFoundException('El deportista no existe');
    }

    return athlete;
  }

  async create(dto: CreateAthleteDto): Promise<Athlete> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        'No existe una cuenta institucional con ese identificador',
      );
    }

    if (!user.isActive) {
      throw new ConflictException(
        'No se puede registrar un deportista con una cuenta inactiva',
      );
    }

    const existingAthlete = await this.athleteRepository.findOne({
      where: [
        { user: { id: user.id } },
        { studentCode: dto.studentCode },
      ],
    });

    if (existingAthlete) {
      throw new ConflictException(
        'La cuenta o el código estudiantil ya están asociados a un deportista',
      );
    }

    const athlete = this.athleteRepository.create({
      user,
      studentCode: dto.studentCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: dto.isActive ?? true,
    });

    return this.athleteRepository.save(athlete);
  }

  async update(id: string, dto: UpdateAthleteDto): Promise<Athlete> {
    const athlete = await this.findOne(id);

    if (
      dto.studentCode &&
      dto.studentCode !== athlete.studentCode
    ) {
      const existingAthlete = await this.athleteRepository.findOne({
        where: { studentCode: dto.studentCode },
      });

      if (existingAthlete) {
        throw new ConflictException(
          'El código estudiantil ya está registrado',
        );
      }
    }

    if (dto.studentCode !== undefined) {
      athlete.studentCode = dto.studentCode;
    }

    if (dto.firstName !== undefined) {
      athlete.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      athlete.lastName = dto.lastName;
    }

    if (dto.isActive !== undefined) {
      athlete.isActive = dto.isActive;
    }

    return this.athleteRepository.save(athlete);
  }

  async remove(id: string): Promise<Athlete> {
    const athlete = await this.findOne(id);

    athlete.isActive = false;

    return this.athleteRepository.save(athlete);
  }
}