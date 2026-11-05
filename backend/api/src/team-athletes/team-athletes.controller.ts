
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { TeamAthletesService } from './team-athletes.service';
import { AssignAthleteDto } from './dto/assign-athlete.dto';
import { AccessGuard } from '../auth/guards/access.guard';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@Controller('team-athletes')
@UseGuards(AccessGuard)
export class TeamAthletesController {
  constructor(
    private readonly teamAthletesService: TeamAthletesService,
  ) {}

  // Deportistas que pueden incorporarse al equipo.
  @Get('available/:teamId')
  findAvailable(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teamAthletesService.findAvailable(
      teamId,
      req.user.sub,
    );
  }

  // Integrantes actuales del equipo.
  @Get('team/:teamId')
  findByTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teamAthletesService.findByTeam(
      teamId,
      req.user.sub,
    );
  }

  // Incorporar deportista al equipo.
  @Post('team/:teamId')
  assign(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: AssignAthleteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teamAthletesService.assign(
      teamId,
      dto,
      req.user.sub,
    );
  }

  // Retirar deportista del equipo.
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teamAthletesService.remove(
      id,
      req.user.sub,
    );
  }
}
