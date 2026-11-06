import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { TeamCoach } from './entities/team-coach.entity';

export type PublicCoach = { id: string; fullName: string; email: string };
const publicCoach = (user: User): PublicCoach => ({ id: user.id, fullName: user.fullName, email: user.email });

@Injectable()
export class TeamCoachesService {
  constructor(
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TeamCoach) private readonly assignments: Repository<TeamCoach>,
    private readonly auth: AuthService,
    private readonly db: DataSource,
  ) {}

  private async requireAdmin(userId: string) {
    // No dependemos de roles antiguos contenidos en un token ya emitido.
    const user = await this.auth.me(userId);
    if (!user.roles.includes('admin')) throw new ForbiddenException('Solo un administrador puede gestionar entrenadores.');
  }

  async available(userId: string): Promise<PublicCoach[]> {
    await this.requireAdmin(userId);
    const people = await this.users.createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.name = :role', { role: 'coach' })
      .where('user.isActive = true')
      .orderBy('user.fullName', 'ASC').getMany();
    return people.map(publicCoach);
  }

  async forTeam(userId: string, teamId: string): Promise<PublicCoach[]> {
    await this.requireAdmin(userId);
    const team = await this.teams.findOne({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new NotFoundException('El equipo no existe.');
    return this.lookupCoaches(teamId);
  }

  private async lookupCoaches(teamId: string): Promise<PublicCoach[]> {
    // El JOIN usa el esquema existente de usuarios y evita exponer password_hash.
    const people = await this.users.createQueryBuilder('user')
      .innerJoin(TeamCoach, 'assignment', 'assignment.coach_id = user.id')
      .where('assignment.team_id = :teamId', { teamId })
      .orderBy('user.fullName', 'ASC').getMany();
    return people.map(publicCoach);
  }

  async replace(userId: string, teamId: string, coachIds: string[]): Promise<PublicCoach[]> {
    await this.requireAdmin(userId);
    if (!Array.isArray(coachIds) || coachIds.length > 100 || new Set(coachIds).size !== coachIds.length) {
      throw new BadRequestException('La selección contiene entrenadores repetidos o inválidos.');
    }
    await this.db.transaction(async (manager) => {
      // Bloqueo del equipo: dos administradores no pisan cambios simultáneos.
      const team = await manager.getRepository(Team).createQueryBuilder('team')
        .where('team.id = :teamId', { teamId })
        .setLock('pessimistic_write')
        .getOne();
      if (!team || !team.isActive) throw new NotFoundException('El equipo no existe o está inactivo.');
      if (coachIds.length) {
        const valid = await manager.getRepository(User).createQueryBuilder('user')
          .innerJoin('user.roles', 'role', 'role.name = :coachRole', { coachRole: 'coach' })
          .where('user.id IN (:...coachIds)', { coachIds })
          .andWhere('user.isActive = true').getMany();
        if (valid.length !== coachIds.length) throw new BadRequestException('Todos deben ser entrenadores activos registrados.');
      }
      await manager.getRepository(TeamCoach).delete({ teamId });
      if (coachIds.length) {
        await manager.getRepository(TeamCoach).insert(coachIds.map(coachId => ({ teamId, coachId, assignedBy: userId })));
      }
      // Compatibilidad con HU7 y demás pantallas existentes: su columna coach_id
      // conserva un entrenador principal, siempre perteneciente a la selección.
      const legacyRows: { coach_id: string | null }[] = await manager.query(
        'SELECT coach_id FROM teams WHERE id = $1', [teamId],
      );
      const existingPrimary = legacyRows[0]?.coach_id ?? null;
      const primaryId = existingPrimary && coachIds.includes(existingPrimary)
        ? existingPrimary : (coachIds[0] ?? null);
      await manager.getRepository(Team).createQueryBuilder().update(Team)
        .set({ coach: primaryId ? ({ id: primaryId } as User) : null })
        .where('id = :teamId', { teamId }).execute();
    });
    return this.lookupCoaches(teamId);
  }

  async managedTeamIds(userId: string): Promise<string[]> {
    const [mapped, legacy] = await Promise.all([
      this.assignments.createQueryBuilder('tc')
        .innerJoin(Team, 'team', 'team.id = tc.team_id AND team.is_active = true')
        .where('tc.coach_id = :userId', { userId })
        .select('tc.team_id', 'teamId').getRawMany<{ teamId: string }>(),
      this.teams.createQueryBuilder('team')
        .innerJoin('team.coach', 'coach')
        .where('coach.id = :userId AND team.isActive = true', { userId })
        .select('team.id', 'teamId').getRawMany<{ teamId: string }>(),
    ]);
    return [...new Set([...mapped, ...legacy].map(row => row.teamId))];
  }

  async canCoachAccess(teamId: string, userId: string) {
    // La consulta se repite por petición; revocar la asignación quita acceso de inmediato.
    const ids = await this.managedTeamIds(userId);
    return ids.includes(teamId);
  }
}
