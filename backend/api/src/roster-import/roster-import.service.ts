
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { parse } from 'csv-parse/sync';

import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';

import {
  RosterImportResult,
  RosterRow,
  RosterRowError,
} from './interfaces/roster-row.interface';

@Injectable()
export class RosterImportService {
  constructor(private readonly dataSource: DataSource) {}

  async importCsv(
    teamId: string,
    file: Express.Multer.File,
  ): Promise<RosterImportResult> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo CSV.');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('El archivo debe tener extensión .csv.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }

    const team = await this.dataSource
      .getRepository(Team)
      .findOne({
        where: { id: teamId },
      });

    if (!team) {
      throw new NotFoundException('El equipo no existe.');
    }

    if (!team.isActive) {
      throw new BadRequestException('El equipo está inactivo.');
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
      'first_name',
      'last_name',
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
      const email = String(row.email ?? '').trim().toLowerCase();

      try {
        this.validateRow(row);

        if (processedEmails.has(email)) {
          throw new Error(
            'El correo está duplicado dentro del archivo CSV.',
          );
        }

        processedEmails.add(email);

        const status = await this.processRow(teamId, row);

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

  private validateRow(row: RosterRow): void {
    const email = String(row.email ?? '').trim();
    const studentCode = String(row.student_code ?? '').trim();
    const firstName = String(row.first_name ?? '').trim();
    const lastName = String(row.last_name ?? '').trim();

    if (!email || !studentCode || !firstName || !lastName) {
      throw new Error(
        'Todos los campos son obligatorios: email, student_code, first_name y last_name.',
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('El correo institucional no tiene un formato válido.');
    }

    if (studentCode.length > 30) {
      throw new Error('El código estudiantil supera los 30 caracteres.');
    }

    if (firstName.length > 100 || lastName.length > 100) {
      throw new Error('El nombre o apellido supera los 100 caracteres.');
    }
  }

  private async processRow(
    teamId: string,
    row: RosterRow,
  ): Promise<'imported' | 'skipped'> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const athleteRepository = manager.getRepository(Athlete);
      const teamRepository = manager.getRepository(Team);
      const teamAthleteRepository = manager.getRepository(TeamAthlete);

      const email = row.email.trim().toLowerCase();
      const studentCode = row.student_code.trim();

      // 1. Buscar la cuenta institucional existente.
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

      // 2. Verificar que el equipo siga existiendo y activo.
      const team = await teamRepository.findOne({
        where: { id: teamId, isActive: true },
      });

      if (!team) {
        throw new Error('El equipo no existe o está inactivo.');
      }

      // 3. Buscar deportista por usuario o código estudiantil.
      const athleteByUser = await athleteRepository.findOne({
        where: { user: { id: user.id } },
      });

      const athleteByCode = await athleteRepository.findOne({
        where: { studentCode },
      });

      if (
        athleteByCode &&
        athleteByCode.user?.id !== user.id
      ) {
        throw new Error(
          'El código estudiantil ya está asociado a otro usuario.',
        );
      }

      let athlete = athleteByUser;

      if (!athlete) {
        athlete = athleteRepository.create({
          user,
          studentCode,
          firstName: row.first_name.trim(),
          lastName: row.last_name.trim(),
          isActive: true,
        });
      } else {
        athlete.studentCode = studentCode;
        athlete.firstName = row.first_name.trim();
        athlete.lastName = row.last_name.trim();
        athlete.isActive = true;
      }

      // 4. Guardar o actualizar el deportista.
      athlete = await athleteRepository.save(athlete);

      // 5. Buscar si ya existe la relación con el equipo.
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
}
