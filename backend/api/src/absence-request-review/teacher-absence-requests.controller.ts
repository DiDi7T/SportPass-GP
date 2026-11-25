import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { REVIEW_PERMISSION } from './absence-request-review.constants';
import { AbsenceRequestReviewService } from './absence-request-review.service';
import { TeacherAbsenceRequestFiltersDto } from './dto/absence-request-filters.dto';

type AuthRequest = Request & { user: { sub: string } };

// HU16: bandeja del profesor. Solo lectura: la aprobación corresponde al entrenador.
@Controller('teacher/absence-requests') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission(REVIEW_PERMISSION)
export class TeacherAbsenceRequestsController {
  constructor(private readonly review: AbsenceRequestReviewService) {}

  @Get() findAll(@Req() request: AuthRequest, @Query() filters: TeacherAbsenceRequestFiltersDto) {
    return this.review.findForTeacher(request.user.sub, filters);
  }

  // Va antes de ':id' para que Nest no interprete "courses" como un identificador.
  @Get('courses') findCourses(@Req() request: AuthRequest) {
    return this.review.findTeacherCourses(request.user.sub);
  }

  @Get(':id') findOne(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.review.findOneForTeacher(request.user.sub, id);
  }
}
