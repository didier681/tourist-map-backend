import { DataSource, Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NegocioService } from '../negocio/negocio.service';
import { User, UserRole } from '../user/entities/user.entity';
import {
  EstadoSolicitudNegocio,
  SolicitudNegocio,
} from './entities/solicitud-negocio.entity';
import { SolicitudNegocioService } from './solicitud-negocio.service';

describe('aprobación de solicitud de negocio', () => {
  it('actualiza rol, crea negocio verificado y audita dentro de una transacción', async () => {
    const solicitud = {
      idSolicitud: 8,
      idUsuario: 10,
      estado: EstadoSolicitudNegocio.Pendiente,
      datosNegocio: { idZona: 1, nombreComercial: 'Café' },
    } as SolicitudNegocio;
    const solicitante = { id: 10, role: UserRole.Usuario } as User;
    const solicitudRepository = {
      findOne: vi.fn().mockResolvedValue(solicitud),
      save: vi.fn(async (value: SolicitudNegocio) => value),
    };
    const userRepository = {
      findOne: vi.fn().mockResolvedValue(solicitante),
      save: vi.fn(async (value: User) => value),
    };
    const manager = {
      getRepository: vi.fn((entity: unknown) =>
        entity === SolicitudNegocio ? solicitudRepository : userRepository,
      ),
    };
    const dataSource = {
      transaction: vi.fn(
        async (callback: (manager: typeof manager) => unknown) =>
          await callback(manager),
      ),
    };
    const negocio = { idNegocio: 20, estadoVerificacion: 'verificado' };
    const negocios = {
      createVerifiedFromRequest: vi.fn().mockResolvedValue(negocio),
    };
    const auditoria = { registrar: vi.fn() };
    const service = new SolicitudNegocioService(
      {} as Repository<SolicitudNegocio>,
      dataSource as unknown as DataSource,
      negocios as unknown as NegocioService,
      auditoria as unknown as AuditoriaService,
    );

    const result = await service.approve(
      8,
      { id: 2, role: UserRole.Admin } as User,
      '127.0.0.1',
    );

    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(solicitante.role).toBe(UserRole.Negocio);
    expect(solicitud.estado).toBe(EstadoSolicitudNegocio.Aprobada);
    expect(negocios.createVerifiedFromRequest).toHaveBeenCalledWith(
      solicitud.datosNegocio,
      10,
      manager,
    );
    expect(result.negocio).toBe(negocio);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'aprobacion_solicitud_negocio' }),
      manager,
    );
  });
});
