import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: 'María Pérez' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @IsOptional()
  idiomaPref?: string;
}
