import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { TeamAthletesService } from './team-athletes.service';
import { AssignAthleteDto } from './dto/assign-athlete.dto';
import { AccessGuard } from '../auth/guards/access.guard';

@Controller('team-athletes')
@UseGuards(AccessGuard)
export class TeamAthletesController {
  constructor(
    private readonly teamAthletesService: TeamAthletesService,
  ) {}

  @Get('team/:teamId')
  findByTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    return this.teamAthletesService.findByTeam(teamId);
  }

  @Post('team/:teamId')
  assign(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: AssignAthleteDto,
  ) {
    return this.teamAthletesService.assign(teamId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamAthletesService.remove(id);
  }
}