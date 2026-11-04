import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../auth/guards/access.guard';
import { TournamentsService } from './tournaments.service';

// Solo lectura y sin @RequirePermission: cualquier usuario con sesión @icesi.edu.co puede consultar.
@Controller('tournaments') @UseGuards(AccessGuard)
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Get('matches') findMatches() { return this.tournaments.findMatches(); }

  @Get('matches/:id') findMatch(@Param('id', ParseUUIDPipe) id: string) { return this.tournaments.findMatch(id); }
}