import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { Zona } from '../zona/entities/zona.entity';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { ConfirmacionSitio } from './entities/confirmacion-sitio.entity';
import { SitioTuristico } from './entities/sitio-turistico.entity';
import { SitioTuristicoService } from './sitio-turistico.service';

describe('búsqueda de sitios por proximidad', () => {
  it('prefiltra por caja, calcula distancias y pagina por proximidad', async () => {
    const builder = {
      leftJoinAndSelect: vi.fn(),
      where: vi.fn(),
      andWhere: vi.fn(),
      distinct: vi.fn(),
      getMany: vi.fn().mockResolvedValue([
        { idSitio: 2, latitud: '8.7510', longitud: '-75.8833' },
        { idSitio: 1, latitud: '8.7501', longitud: '-75.8833' },
        { idSitio: 3, latitud: '8.9000', longitud: '-75.8833' },
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

    const service = new SitioTuristicoService(
      {
        createQueryBuilder: vi.fn().mockReturnValue(
          builder as unknown as SelectQueryBuilder<SitioTuristico>,
        ),
      } as unknown as Repository<SitioTuristico>,
      {} as Repository<Zona>,
      {} as Repository<GestorZona>,
      {} as Repository<ConfirmacionSitio>,
      {} as DataSource,
    );

    const result = await service.findNearby({
      lat: '8.7500',
      lng: '-75.8833',
      radioM: 5000,
      page: 1,
      limit: 1,
    } as ProximityQueryDto);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].idSitio).toBe(1);
    expect(result.data[0].distanciaM).toBeGreaterThan(0);
    expect(result.total).toBe(2);
    expect(builder.andWhere).toHaveBeenCalledWith(
      'sitio.latitud BETWEEN :minLat AND :maxLat',
      expect.objectContaining({ minLat: expect.any(Number) }),
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'sitio.estado = :estado',
      { estado: 'activo' },
    );
  });
});
