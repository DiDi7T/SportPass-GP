import { Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { NotificationsService } from './notifications.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('me/notifications')
@UseGuards(AccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(@Req() request: AuthRequest) {
    return this.notifications.findMine(request.user.sub);
  }

  @Patch(':id/read')
  markMineAsRead(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markMineAsRead(request.user.sub, id);
  }
}
