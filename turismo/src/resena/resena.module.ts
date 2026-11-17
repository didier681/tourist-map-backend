import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { User } from '../user/entities/user.entity';
import { ResenaController } from './resena.controller';
import { Resena } from './entities/resena.entity';
import { ResenaService } from './resena.service';
import { Negocio } from '../negocio/entities/negocio.entity';
import { ReporteResena } from './entities/reporte-resena.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resena, User, SitioTuristico, Negocio, ReporteResena]),
  ],
  controllers: [ResenaController],
  providers: [ResenaService],
  exports: [ResenaService],
})
// Registra el CRUD de reseñas y sus entidades relacionadas.
export class ResenaModule {}
