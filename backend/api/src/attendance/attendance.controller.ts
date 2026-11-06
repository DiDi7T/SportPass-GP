import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessGuard } from '../auth/guards/access.guard';
import { type Actor, AttendanceRegistrationService } from './attendance-registration.service';
import { CheckInDto } from './dto/check-in.dto';

type AuthRequest = Request & { user: Actor };

// Basta con sesión válida: el servicio verifica que tenga un equipo activo de ese deporte.
@Controller('attendance') @UseGuards(AccessGuard)
export class AttendanceController {
  constructor(private readonly registration: AttendanceRegistrationService) {}

  @Get('sports') findMySports(@Req() request: AuthRequest) {
    return this.registration.findMySports(request.user);
  }

  @Get('sports/:sportId/participants')
  listParticipants(@Param('sportId', ParseUUIDPipe) sportId: string, @Req() request: AuthRequest) {
    return this.registration.listParticipants(request.user, sportId);
  }

  // CA1 / CA2: primera vez, por cédula.
  @Post('sports/:sportId/check-in') @HttpCode(201)
  checkIn(@Param('sportId', ParseUUIDPipe) sportId: string, @Body() dto: CheckInDto, @Req() request: AuthRequest) {
    return this.registration.checkInByDocument(request.user, sportId, dto.documentNumber);
  }

  // CA3 / CA4: recurrentes, un solo clic.
  @Post('sports/:sportId/participants/:participantId/attendance') @HttpCode(201)
  mark(
    @Param('sportId', ParseUUIDPipe) sportId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Req() request: AuthRequest,
  ) {
    return this.registration.markAttendance(request.user, sportId, participantId);
  }
}
