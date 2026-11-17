import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { EstadoSolicitudNegocio } from '../entities/solicitud-negocio.entity';

export class ListSolicitudesNegocioDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoSolicitudNegocio })
  @IsOptional()
  @IsEnum(EstadoSolicitudNegocio)
  estado?: EstadoSolicitudNegocio;
}
