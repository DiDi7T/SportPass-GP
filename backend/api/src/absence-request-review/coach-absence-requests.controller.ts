import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { COACH_INBOX_PERMISSION } from './absence-request-review.constants';
import { AbsenceRequestReviewService } from './absence-request-review.service';
import { DecideAbsenceRequestDto } from './dto/decide-absence-request.dto';

type AuthRequest = Request & { user: { sub: string } };

// HU16: bandeja del entrenador. Solo consulta; la aprobación o el rechazo corresponden a HU17.
@Controller('coach/absence-requests') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission(COACH_INBOX_PERMISSION)
export class CoachAbsenceRequestsController {
  constructor(private readonly review: AbsenceRequestReviewService) {}

  @Get() findAll(@Req() request: AuthRequest) {
    return this.review.findForCoach(request.user.sub);
  }

  // HU17: validación del permiso existente y titularidad de la bandeja HU16.
  @Patch(':id/decision')
  decide(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideAbsenceRequestDto) {
    return this.review.decideForCoach(request.user.sub, id, dto.decision, dto.reason);
  }

  @Get(':id') findOne(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.review.findOneForCoach(request.user.sub, id);
  }
}
