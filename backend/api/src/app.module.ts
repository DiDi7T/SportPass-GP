import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { AthletesModule } from './athletes/athletes.module';
import { TeamAthletesModule } from './team-athletes/team-athletes.module';
import { RosterImportModule } from './roster-import/roster-import.module';
import { TournamentsModule } from './tournaments/tournaments.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (environment) => {
        if (environment.NODE_ENV === 'production' && !environment.JWT_ACCESS_SECRET) {
          throw new Error('JWT_ACCESS_SECRET must be configured in production.');
        }
        return environment;
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        // Para desarrollo: sincroniza entidades con PostgreSQL al iniciar Nest.
        // En producción debe volver a false y gestionarse el esquema con migraciones.
        synchronize: true,
        ssl: config.get('DB_SSL', 'true') !== 'false' ? { rejectUnauthorized: false } : false,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthModule, UsersModule, RolesModule, TeamsModule, AthletesModule,
    TeamAthletesModule, RosterImportModule, CompetitionsModule, TournamentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
