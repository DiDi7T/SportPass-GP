import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Athlete } from './entities/athlete.entity';
import { User } from '../users/entities/user.entity';
import { AthletesController } from './athletes.controller';
import { AthletesService } from './athletes.service';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { AccessGuard } from '../auth/guards/access.guard';

@Module({
  imports: [
  TypeOrmModule.forFeature([Athlete, User, Session]),
  AuthModule,
],
  providers: [AthletesService, AccessGuard],
  controllers: [AthletesController],
  exports: [AthletesService],
})
export class AthletesModule {}