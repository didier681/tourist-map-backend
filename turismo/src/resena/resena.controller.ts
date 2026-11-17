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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../user/entities/user.entity';
import { CreateResenaDto } from './dto/create-resena.dto';
import { UpdateResenaDto } from './dto/update-resena.dto';
import { Resena } from './entities/resena.entity';
import { ResenaService } from './resena.service';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResult } from '../common/pagination/paginated-result';
import { ReportarResenaDto } from './dto/reportar-resena.dto';
import { ModerarResenaDto } from './dto/moderar-resena.dto';

class ResenaListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  idSitio?: number;
}

@Controller('resenas')
@ApiTags('Resena')
// Expone las operaciones HTTP para administrar reseñas.
export class ResenaController {
  constructor(private readonly resenaService: ResenaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConflictResponse({
    description: 'El usuario ya tiene una reseña para este sitio.',
  })
  @ApiNotFoundResponse({ description: 'El usuario o sitio indicado no existe.' })
  create(
    @Body() dto: CreateResenaDto,
    @GetUser() user: User,
  ): Promise<Resena> {
    return this.resenaService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: ResenaListQueryDto,
  ): Promise<PaginatedResult<Resena>> {
    return this.resenaService.findAll(query);
  }

  @Get('en-revision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar reseñas que alcanzaron el umbral de reportes' })
  findPending(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<Resena>> {
    return this.resenaService.findPending(query);
  }

  @Patch(':id/moderar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hacer visible u ocultar una reseña reportada' })
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerarResenaDto,
    @GetUser() user: User,
    @Req() request: Request,
  ): Promise<Resena> {
    return this.resenaService.moderate(id, dto, user, request.ip);
  }

  @Post(':id/reportar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reportar una reseña ofensiva, falsa o spam' })
  report(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportarResenaDto,
    @GetUser() user: User,
  ) {
    return this.resenaService.report(id, dto.motivo, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Resena> {
    return this.resenaService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResenaDto,
    @GetUser() user: User,
  ): Promise<Resena> {
    return this.resenaService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.resenaService.remove(id, user);
  }
}
