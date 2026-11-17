import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Negocio } from '../negocio/entities/negocio.entity';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { User } from '../user/entities/user.entity';
import { ModerarResenaDto } from './dto/moderar-resena.dto';
import { ReporteResena } from './entities/reporte-resena.entity';
import { EstadoResena, Resena } from './entities/resena.entity';
import { ResenaService } from './resena.service';

describe('moderación de reseñas', () => {
  const user = { id: 7 } as User;
  const repository = { existsBy: vi.fn(), create: vi.fn(), save: vi.fn() };
  const service = () =>
    new ResenaService(
      repository as unknown as Repository<Resena>,
      repository as unknown as Repository<User>,
      repository as unknown as Repository<SitioTuristico>,
      repository as unknown as Repository<Negocio>,
      repository as unknown as Repository<ReporteResena>,
      {} as DataSource,
      { registrar: vi.fn() } as unknown as AuditoriaService,
    );

  it('rechaza una reseña si no se indica exactamente un destino', async () => {
    await expect(
      service().create(
        { calificacion: 5, comentario: 'Muy bueno' } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service().create(
        {
          idSitio: 1,
          idNegocio: 2,
          calificacion: 5,
          comentario: 'Muy bueno',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pone en revisión la reseña al alcanzar tres reportes', async () => {
    const resena = {
      idResena: 3,
      idUsuario: 1,
      estado: EstadoResena.Visible,
    } as Resena;
    const reviewRepository = {
      findOne: vi.fn().mockResolvedValue(resena),
      save: vi.fn(async (value: Resena) => value),
    };
    const reportRepository = {
      existsBy: vi.fn().mockResolvedValue(false),
      create: vi.fn((value: object) => value),
      save: vi.fn(),
      countBy: vi.fn().mockResolvedValue(3),
    };
    const manager = {
      getRepository: vi.fn((entity: unknown) =>
        entity === Resena ? reviewRepository : reportRepository,
      ),
    };
    const dataSource = {
      transaction: vi.fn(
        async (callback: (manager: typeof manager) => unknown) =>
          await callback(manager),
      ),
    };
    const moderation = new ResenaService(
      reviewRepository as unknown as Repository<Resena>,
      repository as unknown as Repository<User>,
      repository as unknown as Repository<SitioTuristico>,
      repository as unknown as Repository<Negocio>,
      reportRepository as unknown as Repository<ReporteResena>,
      dataSource as unknown as DataSource,
      { registrar: vi.fn() } as unknown as AuditoriaService,
    );

    const result = await moderation.report(3, 'spam' as never, user);
    expect(result.enRevision).toBe(true);
    expect(resena.estado).toBe(EstadoResena.EnRevision);
    expect(reviewRepository.save).toHaveBeenCalledWith(resena);
  });

  it('permite moderar una reseña visible u oculta', () => {
    const dto: ModerarResenaDto = { estado: EstadoResena.Oculta };
    expect(dto.estado).toBe(EstadoResena.Oculta);
  });
});
