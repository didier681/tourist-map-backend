import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListAuditoriaDto } from './dto/list-auditoria.dto';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar auditoría con filtros por acción, entidad, usuario y fecha',
  })
  findAll(@Query() query: ListAuditoriaDto) {
    return this.auditoriaService.findAll(query);
  }
}
