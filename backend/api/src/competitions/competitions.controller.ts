import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,Put } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { type Actor, CompetitionsService } from './competitions.service';
import { CancelCompetitionDto } from './dto/cancel-competition.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { SaveCallupDto } from './dto/save-callup.dto';
type AuthRequest = Request & { user: Actor };

@Controller('competitions') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission('competitions:manage')
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Post() create(@Body() dto: CreateCompetitionDto, @Req() request: AuthRequest) {
    return this.competitions.create(dto, request.user);
  }

  // Va antes de ':id' para que Nest no intente interpretar "teams" como un id.
  @Get('teams') findManagedTeams(@Req() request: AuthRequest) {
    return this.competitions.findManagedTeams(request.user);
  }

  @Get() findManaged(@Req() request: AuthRequest, @Query('teamId', new ParseUUIDPipe({ optional: true })) teamId?: string) {
    return this.competitions.findManaged(request.user, teamId);
  }

  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthRequest) {
    return this.competitions.findOne(id, request.user);
  }

  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompetitionDto, @Req() request: AuthRequest) {
    return this.competitions.update(id, dto, request.user);
  }

  // HU7: cancelar con motivo obligatorio. Solo el entrenador del equipo (se valida en el servicio).
  @Post(':id/cancel') @HttpCode(200) cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelCompetitionDto, @Req() request: AuthRequest) {
    return this.competitions.cancel(id, dto, request.user);
  }

  @Get(':id/callup')
findCallup(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() request: AuthRequest,
) {
  return this.competitions.findCallup(id, request.user);
}

@Put(':id/callup')
saveCallup(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: SaveCallupDto,
  @Req() request: AuthRequest,
) {
  return this.competitions.saveCallup(id, dto, request.user);
}
}
