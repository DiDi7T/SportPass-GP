import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { MyCompetitionsService } from './my-competitions.service';

type AuthRequest = Request & { user: { sub: string } };

// HU5 "Mis competencias": va aparte de CompetitionsController porque ese exige
// competitions:manage (coach/admin). Aquí basta con sesión válida; el servicio
// verifica que el usuario sea un deportista oficial activo.
@Controller('me/competitions') @UseGuards(AccessGuard)
export class MyCompetitionsController {
  constructor(private readonly myCompetitions: MyCompetitionsService) {}

  @Get() findMine(@Req() request: AuthRequest) {
    return this.myCompetitions.findMine(request.user.sub);
  }
}
