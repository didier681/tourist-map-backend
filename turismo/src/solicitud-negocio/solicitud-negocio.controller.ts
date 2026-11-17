import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../user/entities/user.entity';
import { CreateSolicitudNegocioDto } from './dto/create-solicitud-negocio.dto';
import { ListSolicitudesNegocioDto } from './dto/list-solicitudes-negocio.dto';
import { RechazarSolicitudNegocioDto } from './dto/rechazar-solicitud-negocio.dto';
import { SolicitudNegocioService } from './solicitud-negocio.service';

@Controller('solicitudes-negocio')
@ApiTags('Solicitud de negocio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudNegocioController {
  constructor(private readonly service: SolicitudNegocioService) {}

  @Post()
  @Roles('usuario')
  @ApiOperation({ summary: 'Solicitar aprobación para registrar un negocio' })
  create(@Body() dto: CreateSolicitudNegocioDto, @GetUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get('mias')
  @Roles('usuario')
  @ApiOperation({ summary: 'Consultar las solicitudes propias' })
  mias(@GetUser() user: User) {
    return this.service.findMine(user);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar solicitudes de negocio con filtro y paginación' })
  findAll(@Query() query: ListSolicitudesNegocioDto) {
    return this.service.findAll(query);
  }

  @Patch(':id/aprobar')
  @Roles('admin')
  @ApiOperation({
    summary: 'Aprobar solicitud, cambiar rol y crear negocio verificado',
  })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.service.approve(id, user, request.ip);
  }

  @Patch(':id/rechazar')
  @Roles('admin')
  @ApiOperation({ summary: 'Rechazar una solicitud indicando el motivo' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudNegocioDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.service.reject(id, dto, user, request.ip);
  }
}
