import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

import { RosterImportService } from './roster-import.service';

@Controller('athletes')
@UseGuards(AccessGuard, PermissionGuard)
export class AthletesImportController {
  constructor(
    private readonly rosterImportService: RosterImportService,
  ) {}

  @Post('import')
  @RequirePermission('manage_team_rosters')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async importAthletes(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes adjuntar el archivo CSV en el campo file.',
      );
    }

    return this.rosterImportService.importAthletes(file);
  }
}