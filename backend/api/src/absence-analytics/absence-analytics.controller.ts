
import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

import {
  COACH_INBOX_PERMISSION,
  HISTORY_PERMISSION,
} from '../absence-request-review/absence-request-review.constants';

import { AbsenceAnalyticsFiltersDto } from './dto/absence-analytics-filters.dto';
import { AbsenceAnalyticsService } from './absence-analytics.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    roles?: string[];
  };
};

@Controller('absence-analytics')
@UseGuards(AccessGuard, PermissionGuard)
export class AbsenceAnalyticsController {
  constructor(
    private readonly analytics: AbsenceAnalyticsService,
  ) {}

  @Get('admin')
  @RequirePermission(HISTORY_PERMISSION)
  getAdminDashboard(
    @Query() filters: AbsenceAnalyticsFiltersDto,
  ) {
    return this.analytics.getDashboard(filters);
  }

  @Get('coach')
  @RequirePermission(COACH_INBOX_PERMISSION)
  getCoachDashboard(
    @Query() filters: AbsenceAnalyticsFiltersDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analytics.getDashboard(
      filters,
      request.user.sub,
    );
  }
}
