import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Max,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Datos de entrada de una reseña; la calificación queda limitada de 1 a 5.
export class CreateResenaDto {
  @ApiPropertyOptional({ description: 'Identificador del sitio turístico reseñado.', example: 4 })
  @IsInt()
  @Min(1)
  @IsOptional()
  idSitio?: number | null;

  @ApiPropertyOptional({ description: 'Identificador del negocio reseñado.', example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  idNegocio?: number | null;

  @ApiProperty({
    description: 'Calificación otorgada al sitio o negocio, entre 1 y 5.',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiProperty({
    description: 'Comentario escrito por el usuario sobre el destino.',
    example: 'Un lugar muy agradable para visitar en familia.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, {
    message: 'El comentario no puede superar los 2000 caracteres',
  })
  comentario: string;
}
