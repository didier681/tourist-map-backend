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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
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
