import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { ReplaceCoachesDto } from './dto/replace-coaches.dto';
import { TeamCoachesService } from './team-coaches.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('teams')
@UseGuards(AccessGuard)
export class TeamCoachesController {
  constructor(private readonly coaches: TeamCoachesService) {}
  // Ruta estática antes de las dinámicas.
  @Get('coaches/available') available(@Req() req: AuthRequest) {
    return this.coaches.available(req.user.sub);
  }
  @Get(':id/coaches') list(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.coaches.forTeam(req.user.sub, id);
  }
  @Put(':id/coaches') replace(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceCoachesDto) {
    return this.coaches.replace(req.user.sub, id, dto.coachIds);
  }
}
