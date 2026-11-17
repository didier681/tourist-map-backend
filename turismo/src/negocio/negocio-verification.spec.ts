import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { Zona } from '../zona/entities/zona.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { HorarioNegocio } from './entities/horario-negocio.entity';
import { EstadoVerificacion, Negocio } from './entities/negocio.entity';
import { NegocioService } from './negocio.service';

describe('verificación de negocios', () => {
  const negocio: Negocio = {
    idNegocio: 4,
    estadoVerificacion: EstadoVerificacion.Pendiente,
    motivoRechazo: null,
  } as Negocio;
  const negocioRepository = {
    findOneBy: vi.fn().mockResolvedValue(negocio),
    save: vi.fn(async (value: Negocio) => value),
    findOne: vi.fn().mockResolvedValue(negocio),
  };
  const auditoria = { registrar: vi.fn() };
  const service = new NegocioService(
    negocioRepository as unknown as Repository<Negocio>,
    {} as Repository<SitioTuristico>,
    {} as Repository<Zona>,
    {} as Repository<HorarioNegocio>,
    {} as Repository<import('../resena/entities/resena.entity').Resena>,
    auditoria as unknown as AuditoriaService,
  );

  it('cambia estado y registra la verificación administrativa', async () => {
    const admin = { id: 2, role: UserRole.Admin } as User;
    await service.verify(
      4,
      { estado: EstadoVerificacion.Verificado },
      admin,
      '127.0.0.1',
    );
    expect(negocio.estadoVerificacion).toBe(EstadoVerificacion.Verificado);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: 2,
        accion: 'verificacion_negocio',
        entidad: 'negocio',
        idEntidad: 4,
        ip: '127.0.0.1',
      }),
    );
  });

  it('exige motivo para rechazar o suspender', async () => {
    await expect(
      service.verify(
        4,
        { estado: EstadoVerificacion.Rechazado },
        { id: 2, role: UserRole.Admin } as User,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
