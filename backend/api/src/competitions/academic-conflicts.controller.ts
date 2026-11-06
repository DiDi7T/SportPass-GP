import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { AcademicConflictsService } from './academic-conflicts.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('me/competitions')
@UseGuards(AccessGuard)
export class AcademicConflictsController {
  constructor(private readonly conflicts: AcademicConflictsService) {}
  @Get(':id/conflicts') find(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.conflicts.findForCompetition(req.user.sub, id);
  }
}
