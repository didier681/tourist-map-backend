import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { Zona } from '../zona/entities/zona.entity';
import { Negocio } from './entities/negocio.entity';
import { NegocioService } from './negocio.service';

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
});
