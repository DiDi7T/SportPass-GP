import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { parse } from 'csv-parse/sync';

import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';

import type { AthleteImportResult } from './interfaces/athlete-import-result.interface';

interface RosterRow {
  email: string;
  student_code: string;
}

export interface RosterImportResult {
  teamId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: {
    row: number;
    email: string;
    reason: string;
  }[];
}

@Injectable()
export class RosterImportService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // =====================================================
  // IMPORTACIÓN GENERAL DE DEPORTISTAS
  // =====================================================

  async importAthletes(
    file: Express.Multer.File,
  ): Promise<AthleteImportResult> {
    const rows = this.parseCsv(file);

    const result: AthleteImportResult = {
      totalRows: rows.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    const processedEmails = new Set<string>();
    const processedCodes = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      const email = String(row.email ?? '')
        .trim()
        .toLowerCase();

      const studentCode = String(row.student_code ?? '').trim();

      try {
        this.validateRow(row);

        if (processedEmails.has(email)) {
          throw new Error(
            'El correo está duplicado dentro del archivo CSV.',
          );
        }

        if (processedCodes.has(studentCode)) {
          throw new Error(
            'El código estudiantil está duplicado dentro del archivo CSV.',
          );
        }

        processedEmails.add(email);
        processedCodes.add(studentCode);

        await this.processAthleteRow(row);

        result.imported++;
      } catch (error) {
        result.failed++;

        result.errors.push({
          row: rowNumber,
          email,
          reason:
            error instanceof Error
              ? error.message
              : 'No se pudo procesar el registro.',
        });
      }
    }

    return result;
  }

  private async processAthleteRow(row: RosterRow): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const athleteRepository = manager.getRepository(Athlete);

      const email = row.email.trim().toLowerCase();
      const studentCode = row.student_code.trim();

      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error(
          'No existe una cuenta institucional registrada con este correo.',
        );
      }

      if (!user.isActive) {
        throw new Error('La cuenta institucional está inactiva.');
      }

      const athleteByUser = await athleteRepository.findOne({
        where: {
          user: { id: user.id },
        },
        relations: {
          user: true,
        },
      });

      const athleteByCode = await athleteRepository.findOne({
        where: { studentCode },
        relations: {
          user: true,
        },
      });

      if (athleteByCode && athleteByCode.user.id !== user.id) {
        throw new Error(
          'El código estudiantil ya está asociado a otro usuario.',
        );
      }

      let athlete = athleteByUser;

      if (!athlete) {
        athlete = athleteRepository.create({
          user,
          studentCode,
          isActive: true,
        });
      } else {
        athlete.studentCode = studentCode;
        athlete.isActive = true;
      }

      await athleteRepository.save(athlete);
    });
  }

  // =====================================================
  // IMPORTACIÓN DE DEPORTISTAS A UN EQUIPO
  // =====================================================

  async importCsv(
    teamId: string,
    file: Express.Multer.File,
  ): Promise<RosterImportResult> {
    const rows = this.parseCsv(file);

    const teamRepository = this.dataSource.getRepository(Team);

    const team = await teamRepository.findOne({
      where: {
        id: teamId,
        isActive: true,
      },
    });

    if (!team) {
      throw new NotFoundException(
        'El equipo no existe o está inactivo.',
      );
    }

    const result: RosterImportResult = {
      teamId,
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const processedEmails = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      const email = String(row.email ?? '')
        .trim()
        .toLowerCase();

      try {
        this.validateRow(row);

        if (processedEmails.has(email)) {
          throw new Error(
            'El correo está duplicado dentro del archivo CSV.',
          );
        }

        processedEmails.add(email);

        const status = await this.processTeamRow(teamId, row);

        if (status === 'imported') {
          result.imported++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.failed++;

        result.errors.push({
          row: rowNumber,
          email,
          reason:
            error instanceof Error
              ? error.message
              : 'No se pudo procesar el registro.',
        });
      }
    }

    return result;
  }

  private async processTeamRow(
    teamId: string,
    row: RosterRow,
  ): Promise<'imported' | 'skipped'> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const teamRepository = manager.getRepository(Team);
      const athleteRepository = manager.getRepository(Athlete);
      const teamAthleteRepository = manager.getRepository(TeamAthlete);

      const email = row.email.trim().toLowerCase();
      const studentCode = row.student_code.trim();

      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error(
          'No existe una cuenta institucional registrada con este correo.',
        );
      }

      if (!user.isActive) {
        throw new Error('La cuenta institucional está inactiva.');
      }

      const team = await teamRepository.findOne({
        where: {
          id: teamId,
          isActive: true,
        },
      });

      if (!team) {
        throw new Error('El equipo no existe o está inactivo.');
      }

      const athleteByUser = await athleteRepository.findOne({
        where: {
          user: { id: user.id },
        },
        relations: {
          user: true,
        },
      });

      const athleteByCode = await athleteRepository.findOne({
        where: { studentCode },
        relations: {
          user: true,
        },
      });

      if (athleteByCode && athleteByCode.user.id !== user.id) {
        throw new Error(
          'El código estudiantil ya está asociado a otro usuario.',
        );
      }

      let athlete = athleteByUser;

      if (!athlete) {
        athlete = athleteRepository.create({
          user,
          studentCode,
          isActive: true,
        });
      } else {
        athlete.studentCode = studentCode;
        athlete.isActive = true;
      }

      athlete = await athleteRepository.save(athlete);

      const existingAssignment = await teamAthleteRepository.findOne({
        where: {
          team: { id: teamId },
          athlete: { id: athlete.id },
        },
      });

      if (existingAssignment?.active) {
        return 'skipped';
      }

      if (existingAssignment) {
        existingAssignment.active = true;
        await teamAthleteRepository.save(existingAssignment);
      } else {
        const assignment = teamAthleteRepository.create({
          team,
          athlete,
          active: true,
        });

        await teamAthleteRepository.save(assignment);
      }

      return 'imported';
    });
  }

  // =====================================================
  // VALIDACIONES Y LECTURA DEL CSV
  // =====================================================

  private parseCsv(file: Express.Multer.File): RosterRow[] {
    if (!file) {
      throw new BadRequestException(
        'Debes adjuntar un archivo CSV.',
      );
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException(
        'El archivo debe tener extensión .csv.',
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }

    let rows: RosterRow[];

    try {
      rows = parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as RosterRow[];
    } catch {
      throw new BadRequestException(
        'No se pudo procesar el CSV. Verifica su formato.',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'El archivo no contiene registros para importar.',
      );
    }

    if (rows.length > 1000) {
      throw new BadRequestException(
        'El archivo no puede contener más de 1000 registros.',
      );
    }

    const requiredHeaders = [
      'email',
      'student_code',
    ];

    const headers = Object.keys(rows[0]);

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias: ${missingHeaders.join(', ')}`,
      );
    }

    return rows;
  }

  private validateRow(row: RosterRow): void {
    const email = String(row.email ?? '').trim();
    const studentCode = String(row.student_code ?? '').trim();
    if (!email || !studentCode) {
      throw new Error('Todos los campos son obligatorios.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new Error(
        'El correo electrónico no tiene un formato válido.',
      );
    }

    if (studentCode.length > 30) {
      throw new Error(
        'El código estudiantil no puede superar 30 caracteres.',
      );
    }

  }
}
