import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { CreateTrainingAbsenceRequestDto } from './dto/create-training-absence-request.dto';
import { TrainingAbsenceRequestsService } from './training-absence-requests.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('me/training-absence-requests')
@UseGuards(AccessGuard)
export class TrainingAbsenceRequestsController {
  constructor(private readonly requests: TrainingAbsenceRequestsService) {}

  @Get('eligible-competitions')
  findEligibleCompetitions(@Req() request: AuthRequest) {
    return this.requests.findEligibleCompetitions(request.user.sub);
  }

  @Get()
  findMine(@Req() request: AuthRequest) {
    return this.requests.findMine(request.user.sub);
  }

  @Get(':id')
  findOneMine(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findOneMine(request.user.sub, id);
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() dto: CreateTrainingAbsenceRequestDto) {
    return this.requests.create(request.user.sub, dto);
  }
}
