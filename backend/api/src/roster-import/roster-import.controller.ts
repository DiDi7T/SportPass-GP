
import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { RosterImportService } from './roster-import.service';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('roster-import')
@UseGuards(AccessGuard, PermissionGuard)
export class RosterImportController {
  constructor(
    private readonly rosterImportService: RosterImportService,
  ) {}

  @Post('teams/:teamId')
  @RequirePermission('manage_team_rosters')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async importRoster(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes adjuntar el archivo CSV en el campo file.',
      );
    }

    return this.rosterImportService.importCsv(teamId, file);
  }
}
