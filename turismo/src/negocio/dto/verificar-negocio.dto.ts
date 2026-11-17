import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoVerificacion } from '../entities/negocio.entity';

export class VerificarNegocioDto {
  @ApiProperty({ enum: EstadoVerificacion })
  @IsEnum(EstadoVerificacion)
  estado: EstadoVerificacion;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo?: string;
}
