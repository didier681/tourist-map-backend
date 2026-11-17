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
  Put,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../user/entities/user.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { Negocio } from './entities/negocio.entity';
import { UpdateMembresiaDto } from './dto/update-membresia.dto';
import { NegocioService } from './negocio.service';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { SiteListQueryDto } from '../common/pagination/site-list-query.dto';
import { PaginatedResult } from '../common/pagination/paginated-result';
import { VerificarNegocioDto } from './dto/verificar-negocio.dto';
import { ReemplazarHorariosDto } from './dto/horario-negocio.dto';
import { Request } from 'express';

@Controller('negocios')
@ApiTags('Negocio')
// Expone las operaciones CRUD de los negocios turísticos.
export class NegocioController {
  // Inyecta el servicio que gestiona los negocios.
  constructor(private readonly negocioService: NegocioService) {}

  // Crea un negocio con los datos validados de la solicitud.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('negocio', 'admin')
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'La latitud o longitud está fuera del rango permitido.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un negocio registrado con ese NIT o documento.',
  })
  @ApiNotFoundResponse({ description: 'La zona o el sitio indicado no existe.' })
  create(
    @Body() dto: CreateNegocioDto,
    @GetUser() user: User,
  ): Promise<Negocio> {
    return this.negocioService.create(dto, user);
  }

  // Devuelve todos los negocios con sus relaciones.
  @Get()
  findAll(
    @Query() query: SiteListQueryDto,
  ): Promise<PaginatedResult<Negocio>> {
    return this.negocioService.findAll(query);
  }

  @Get('cercanos')
  // La consulta pública solo expone datos del negocio necesarios para encontrarlo.
  cercanos(@Query() query: ProximityQueryDto) {
    return this.negocioService.findNearby(query);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar los negocios propios en cualquier estado' })
  mios(@GetUser() user: User): Promise<Negocio[]> {
    return this.negocioService.findMine(user);
  }

  @Get('pendientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar negocios pendientes de verificación' })
  pendientes(): Promise<Negocio[]> {
    return this.negocioService.findPending();
  }

  @Get(':id/calificacion')
  @ApiOperation({ summary: 'Consultar promedio de reseñas visibles de un negocio' })
  calificacion(@Param('id', ParseIntPipe) id: number) {
    return this.negocioService.findCalificacion(id);
  }

  // Busca un negocio por su identificador.
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Negocio> {
    return this.negocioService.findOne(id);
  }

  // Actualiza parcialmente el negocio indicado.
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('negocio', 'admin')
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'La latitud o longitud está fuera del rango permitido.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un negocio registrado con ese NIT o documento.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNegocioDto,
    @GetUser() user: User,
  ): Promise<Negocio> {
    return this.negocioService.update(id, dto, user);
  }

  @Patch(':id/membresia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  // Solo administradores pueden cambiar el nivel contratado por el negocio.
  updateMembresia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMembresiaDto,
    @GetUser() user: User,
    @Req() request: Request,
  ): Promise<Negocio> {
    return this.negocioService.updateMembresia(
      id,
      dto.estadoMembresia,
      user,
      request.ip,
    );
  }

  @Patch(':id/verificacion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar, rechazar o suspender un negocio' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El rechazo o suspensión requiere motivo.',
  })
  verificar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerificarNegocioDto,
    @GetUser() user: User,
    @Req() request: Request,
  ): Promise<Negocio> {
    return this.negocioService.verify(id, dto, user, request.ip);
  }

  @Put(':id/horarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('negocio', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reemplazar los horarios semanales del negocio',
    description:
      'Día 0 es domingo y día 6 sábado; la apertura debe preceder al cierre.',
  })
  horarios(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarHorariosDto,
    @GetUser() user: User,
  ) {
    return this.negocioService.replaceHorarios(id, dto.horarios, user);
  }

  // Elimina el negocio indicado y responde sin contenido.
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('negocio', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.negocioService.remove(id, user);
  }
}
