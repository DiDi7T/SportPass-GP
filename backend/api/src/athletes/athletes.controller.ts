import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { AccessGuard } from '../auth/guards/access.guard';

@Controller('athletes')
@UseGuards(AccessGuard)
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @Get()
  findAll() {
    return this.athletesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.athletesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAthleteDto) {
    return this.athletesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAthleteDto,
  ) {
    return this.athletesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.athletesService.remove(id);
  }
}