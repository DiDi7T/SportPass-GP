import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { MyCompetitionsService } from './my-competitions.service';

type AuthRequest = Request & { user: { sub: string } };


@Controller('me/competitions') @UseGuards(AccessGuard)
export class MyCompetitionsController {
  constructor(private readonly myCompetitions: MyCompetitionsService) {}

  @Get() findMine(@Req() request: AuthRequest) {
    return this.myCompetitions.findMine(request.user.sub);
  }
}
