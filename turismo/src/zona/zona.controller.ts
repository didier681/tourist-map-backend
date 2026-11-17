import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateZonaDto } from './dto/create-zona.dto';
import { UpdateZonaDto } from './dto/update-zona.dto';
import { ZonaService } from './zona.service';
import { Zona } from './entities/zona.entity';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { PaginatedResult } from '../common/pagination/paginated-result';

@Controller('zonas')
@ApiTags('Zona')
// Expone las operaciones HTTP para administrar zonas.
export class ZonaController {
  constructor(private readonly zonaService: ZonaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  create(@Body() dto: CreateZonaDto): Promise<Zona> {
    return this.zonaService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<Zona>> {
    return this.zonaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Zona> {
    return this.zonaService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZonaDto,
  ): Promise<Zona> {
    return this.zonaService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.zonaService.remove(id);
  }
}
