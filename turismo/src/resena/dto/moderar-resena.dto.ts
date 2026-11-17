import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { EstadoResena } from '../entities/resena.entity';

export class ModerarResenaDto {
  @ApiProperty({ enum: [EstadoResena.Visible, EstadoResena.Oculta] })
  @IsIn([EstadoResena.Visible, EstadoResena.Oculta])
  estado: EstadoResena.Visible | EstadoResena.Oculta;
}
