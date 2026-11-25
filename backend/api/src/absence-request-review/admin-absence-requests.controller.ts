import { Controller, Get, Param, ParseUUIDPipe, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { buildAbsenceRequestsWorkbook } from './absence-request-export';
import { HISTORY_PERMISSION } from './absence-request-review.constants';
import { AbsenceRequestReviewService } from './absence-request-review.service';
import { AdminAbsenceRequestFiltersDto } from './dto/absence-request-filters.dto';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// HU20: historial general. Solo consulta y exportación; no expone operaciones de escritura (CA3).
@Controller('admin/absence-requests') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission(HISTORY_PERMISSION)
export class AdminAbsenceRequestsController {
  constructor(private readonly review: AbsenceRequestReviewService) {}

  @Get() findAll(@Query() filters: AdminAbsenceRequestFiltersDto) {
    return this.review.findForAdmin(filters);
  }

  // Las rutas fijas van antes de ':id' para que Nest no las interprete como un identificador.
  @Get('filters') findFilterOptions() {
    return this.review.findAdminFilterOptions();
  }

  @Get('export')
  async export(@Query() filters: AdminAbsenceRequestFiltersDto) {
    const workbook = await buildAbsenceRequestsWorkbook(await this.review.findForAdmin(filters));
    const date = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
    return new StreamableFile(workbook, { type: XLSX_TYPE, disposition: `attachment; filename="historial-solicitudes-${date}.xlsx"` });
  }

  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.review.findOneForAdmin(id);
  }
}
