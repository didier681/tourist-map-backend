import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CurrentPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  passwordActual: string;
}
