import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegocioModule } from '../negocio/negocio.module';
import { SolicitudNegocio } from './entities/solicitud-negocio.entity';
import { SolicitudNegocioController } from './solicitud-negocio.controller';
import { SolicitudNegocioService } from './solicitud-negocio.service';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudNegocio]), NegocioModule],
  controllers: [SolicitudNegocioController],
  providers: [SolicitudNegocioService],
})
export class SolicitudNegocioModule {}
