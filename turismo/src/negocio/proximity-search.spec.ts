import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { Zona } from '../zona/entities/zona.entity';
import { Negocio } from './entities/negocio.entity';
import { NegocioService } from './negocio.service';
import { HorarioNegocio } from './entities/horario-negocio.entity';
import { Resena } from '../resena/entities/resena.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('búsqueda de negocios por proximidad', () => {
  it('ordena por distancia y no expone el NIT ni el ID de usuario', async () => {
    const builder = {
      leftJoinAndSelect: vi.fn(),
      where: vi.fn(),
      andWhere: vi.fn(),
      distinct: vi.fn(),
      getMany: vi.fn().mockResolvedValue([
        {
          idNegocio: 2,
          idUsuario: 44,
          nitDocumento: '900123456',
          latitud: '8.7510',
          longitud: '-75.8833',
        },
        {
          idNegocio: 1,
          idUsuario: 45,
          nitDocumento: '900654321',
          latitud: '8.7501',
          longitud: '-75.8833',
        },
      ]),
    };
    for (const method of [
      builder.leftJoinAndSelect,
      builder.where,
      builder.andWhere,
      builder.distinct,
    ]) {
      method.mockReturnValue(builder);
    }

    const service = new NegocioService(
      {
        createQueryBuilder: vi.fn().mockReturnValue(
          builder as unknown as SelectQueryBuilder<Negocio>,
        ),
      } as unknown as Repository<Negocio>,
      {} as Repository<SitioTuristico>,
      {} as Repository<Zona>,
    );

    const result = await service.findNearby({
      lat: '8.7500',
      lng: '-75.8833',
      radioM: 5000,
      page: 1,
      limit: 20,
    } as ProximityQueryDto);

    expect(result.data.map((negocio) => negocio.idNegocio)).toEqual([1, 2]);
    expect(result.data[0].distanciaM).toBeLessThan(result.data[1].distanciaM);
    expect(result.data[0]).not.toHaveProperty('nitDocumento');
    expect(result.data[0]).not.toHaveProperty('idUsuario');
  });

  it('filtra por horario actual colombiano cuando abiertoAhora es true', async () => {
    const builder = {
      leftJoinAndSelect: vi.fn(),
      where: vi.fn(),
      andWhere: vi.fn(),
      distinct: vi.fn(),
      getMany: vi.fn().mockResolvedValue([
        {
          idNegocio: 1,
          idUsuario: 4,
          nitDocumento: '1',
          latitud: '8.7501',
          longitud: '-75.8833',
        },
        {
          idNegocio: 2,
          idUsuario: 5,
          nitDocumento: '2',
          latitud: '8.7502',
          longitud: '-75.8833',
        },
      ]),
    };
    for (const method of [
      builder.leftJoinAndSelect,
      builder.where,
      builder.andWhere,
      builder.distinct,
    ]) {
      method.mockReturnValue(builder);
    }
    const negocioRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(
        builder as unknown as SelectQueryBuilder<Negocio>,
      ),
    };
    const horarioRepository = {
      findBy: vi.fn().mockResolvedValue(
        [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
          idNegocio: 1,
          diaSemana,
          horaApertura: '00:00:00',
          horaCierre: '23:59:00',
        })),
      ),
    };
    const service = new NegocioService(
      negocioRepository as unknown as Repository<Negocio>,
      {} as Repository<SitioTuristico>,
      {} as Repository<Zona>,
      horarioRepository as unknown as Repository<HorarioNegocio>,
      {} as Repository<Resena>,
      { registrar: vi.fn() } as unknown as AuditoriaService,
    );

    const result = await service.findNearby({
      lat: '8.7500',
      lng: '-75.8833',
      radioM: 5000,
      page: 1,
      limit: 20,
      abiertoAhora: true,
    } as ProximityQueryDto);

    expect(result.data.map((negocio) => negocio.idNegocio)).toEqual([1]);
  });
});
