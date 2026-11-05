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

import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AccessGuard } from '../auth/guards/access.guard';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@Controller('teams')
@UseGuards(AccessGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.teamsService.findByCoach(req.user.sub);
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.remove(id);
  }
}