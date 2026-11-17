import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MotivoReporteResena } from '../entities/reporte-resena.entity';

export class ReportarResenaDto {
  @ApiProperty({ enum: MotivoReporteResena })
  @IsEnum(MotivoReporteResena)
  motivo: MotivoReporteResena;
}
