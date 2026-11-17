import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';
import { CreateNegocioDto } from '../../negocio/dto/create-negocio.dto';

export class CreateSolicitudNegocioDto extends CreateNegocioDto {
  @ApiPropertyOptional({ example: 'https://ejemplo.com/documentos/soporte.pdf' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  soporteUrl?: string;
}
