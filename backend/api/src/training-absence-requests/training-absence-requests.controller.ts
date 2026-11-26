import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { CreateTrainingAbsenceRequestDto } from './dto/create-training-absence-request.dto';
import { MyAbsenceRequestHistoryFiltersDto } from './dto/my-absence-request-history-filters.dto';
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

  // HU14: va antes de ':id' para que Nest no interprete "history" como un id.
  @Get('history')
  findHistory(@Req() request: AuthRequest, @Query() filters: MyAbsenceRequestHistoryFiltersDto) {
    return this.requests.findHistory(request.user.sub, filters);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="constancia-sportpass.pdf"')
  async downloadPermitPdf(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const pdf = await this.requests.createPermitPdfMine(request.user.sub, id);
    return new StreamableFile(pdf);
  }

  @Get(':id')
  findOneMine(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findOneMine(request.user.sub, id);
  }

  // HU13. Protección por sesión y titularidad en el servicio.
  @Patch(':id/cancel')
  cancel(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.cancel(request.user.sub, id);
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() dto: CreateTrainingAbsenceRequestDto) {
    return this.requests.create(request.user.sub, dto);
  }
}
