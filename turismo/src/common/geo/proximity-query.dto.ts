import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsBoolean,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../pagination/pagination-query.dto';

export class ProximityQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '8.7500' })
  @IsLatitude({ message: 'lat debe ser una latitud válida' })
  lat: string;

  @ApiProperty({ example: '-75.8833' })
  @IsLongitude({ message: 'lng debe ser una longitud válida' })
  lng: string;

  @ApiPropertyOptional({ default: 5000, maximum: 50000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  @IsOptional()
  radioM = 5000;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  idCategoria?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  idZona?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  abiertoAhora = false;
}
