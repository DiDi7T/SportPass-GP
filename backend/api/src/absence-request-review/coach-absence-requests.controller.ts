import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { COACH_INBOX_PERMISSION } from './absence-request-review.constants';
import { AbsenceRequestReviewService } from './absence-request-review.service';

type AuthRequest = Request & { user: { sub: string } };

// HU16: bandeja del entrenador. Solo consulta; la aprobación o el rechazo corresponden a HU17.
@Controller('coach/absence-requests') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission(COACH_INBOX_PERMISSION)
export class CoachAbsenceRequestsController {
  constructor(private readonly review: AbsenceRequestReviewService) {}

  @Get() findAll(@Req() request: AuthRequest) {
    return this.review.findForCoach(request.user.sub);
  }

  @Get(':id') findOne(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.review.findOneForCoach(request.user.sub, id);
  }
}
