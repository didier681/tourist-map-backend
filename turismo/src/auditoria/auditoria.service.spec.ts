import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  it('persiste metadatos y elimina campos con credenciales del detalle', async () => {
    const repository = {
      create: vi.fn((value: object) => value),
      save: vi.fn(async (value: object) => value),
    };
    const service = new AuditoriaService(
      repository as unknown as Repository<Auditoria>,
    );

    await service.registrar({
      idUsuario: 5,
      accion: 'moderacion_resena',
      entidad: 'resena',
      idEntidad: 12,
      detalle: {
        estado: 'oculta',
        accessToken: 'no-debe-guardarse',
        nested: { password: 'no-debe-guardarse' },
      },
      ip: '127.0.0.1',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: 5,
        accion: 'moderacion_resena',
        idEntidad: 12,
        detalle: { estado: 'oculta', nested: {} },
      }),
    );
  });
});
