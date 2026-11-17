import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class SiteListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  idZona?: number;

  @ApiPropertyOptional({ description: 'Busca por nombre (insensible a mayúsculas).' })
  @IsString()
  @IsOptional()
  q?: string;
}
