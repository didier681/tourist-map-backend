import { Repository } from 'typeorm';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { User } from '../user/entities/user.entity';
import { Zona } from '../zona/entities/zona.entity';
import { Visita } from './entities/visita.entity';
import { VisitaService } from './visita.service';

describe('VisitaService', () => {
  it('acepta un check-in dentro de 300 metros del sitio', async () => {
    const sitio = {
      idSitio: 5,
      idZona: 2,
      latitud: '8.7500',
      longitud: '-75.8833',
      estado: 'activo',
      estadoRevision: 'aprobado',
    };
    const service = new VisitaService(
      {
        create: vi.fn((value) => value),
        save: vi.fn(async (value) => value),
      } as unknown as Repository<Visita>,
      { existsBy: vi.fn().mockResolvedValue(true) } as unknown as Repository<User>,
      {
        findOneBy: vi.fn().mockResolvedValue({ idZona: 2 }),
      } as unknown as Repository<Zona>,
      {
        findOneBy: vi.fn().mockResolvedValue(sitio),
      } as unknown as Repository<SitioTuristico>,
    );

    await expect(
      service.create(
        {
          idZona: 2,
          idSitio: 5,
          latitud: '8.7510',
          longitud: '-75.8833',
        },
        { id: 21 } as User,
      ),
    ).resolves.toMatchObject({ idUsuario: 21, idSitio: 5 });
  });

  it('rechaza un check-in a 300 metros o más del sitio', async () => {
    const service = new VisitaService(
      {} as Repository<Visita>,
      { existsBy: vi.fn().mockResolvedValue(true) } as unknown as Repository<User>,
      {
        findOneBy: vi.fn().mockResolvedValue({ idZona: 2 }),
      } as unknown as Repository<Zona>,
      {
        findOneBy: vi.fn().mockResolvedValue({
          idSitio: 5,
          idZona: 2,
          latitud: '8.7500',
          longitud: '-75.8833',
          estado: 'activo',
          estadoRevision: 'aprobado',
        }),
      } as unknown as Repository<SitioTuristico>,
    );

    await expect(
      service.create(
        {
          idZona: 2,
          idSitio: 5,
          latitud: '8.7540',
          longitud: '-75.8833',
        },
        { id: 21 } as User,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only visits belonging to the authenticated user', async () => {
    const find = vi.fn().mockResolvedValue([]);
    const service = new VisitaService(
      { find } as unknown as Repository<Visita>,
      {} as Repository<User>,
      {} as Repository<Zona>,
      {} as Repository<SitioTuristico>,
    );

    await service.findMias({ id: 21 } as User);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idUsuario: 21 } }),
    );
  });
});
import { BadRequestException } from '@nestjs/common';
