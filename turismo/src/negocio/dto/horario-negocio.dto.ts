import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioDiaDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 domingo, 6 sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaApertura: string;

  @ApiProperty({ example: '18:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaCierre: string;
}

export class ReemplazarHorariosDto {
  @ApiProperty({ type: [HorarioDiaDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => HorarioDiaDto)
  horarios: HorarioDiaDto[];
}
