import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NegocioService } from '../negocio/negocio.service';
import { User, UserRole } from '../user/entities/user.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PaginatedResult } from '../common/pagination/paginated-result';
import { CreateSolicitudNegocioDto } from './dto/create-solicitud-negocio.dto';
import { ListSolicitudesNegocioDto } from './dto/list-solicitudes-negocio.dto';
import { RechazarSolicitudNegocioDto } from './dto/rechazar-solicitud-negocio.dto';
import {
  EstadoSolicitudNegocio,
  SolicitudNegocio,
} from './entities/solicitud-negocio.entity';

@Injectable()
export class SolicitudNegocioService {
  constructor(
    @InjectRepository(SolicitudNegocio)
    private readonly solicitudRepository: Repository<SolicitudNegocio>,
    private readonly dataSource: DataSource,
    private readonly negocioService: NegocioService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(dto: CreateSolicitudNegocioDto, user: User): Promise<SolicitudNegocio> {
    if (user.role !== UserRole.Usuario) {
      throw new BadRequestException(
        'Solo los usuarios pueden solicitar una cuenta de negocio',
      );
    }
    return await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const currentUser = await users.findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentUser || currentUser.role !== UserRole.Usuario) {
        throw new ConflictException(
          'El usuario ya no puede presentar esta solicitud',
        );
      }
      const solicitudes = manager.getRepository(SolicitudNegocio);
      const pending = await solicitudes.findOneBy({
        idUsuario: user.id,
        estado: EstadoSolicitudNegocio.Pendiente,
      });
      if (pending) {
        throw new ConflictException(
          'Ya tienes una solicitud de negocio pendiente',
        );
      }
      return await solicitudes.save(
        solicitudes.create({
          idUsuario: user.id,
          datosNegocio: datosNegocioDto(dto),
          soporteUrl: dto.soporteUrl ?? null,
          estado: EstadoSolicitudNegocio.Pendiente,
          motivo: null,
        }),
      );
    });
  }

  async findAll(
    query: ListSolicitudesNegocioDto,
  ): Promise<PaginatedResult<SolicitudNegocio>> {
    const where = query.estado ? { estado: query.estado } : {};
    const [data, total] = await this.solicitudRepository.findAndCount({
      where,
      relations: { usuario: true },
      order: { fechaSolicitud: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findMine(user: User): Promise<SolicitudNegocio[]> {
    return await this.solicitudRepository.find({
      where: { idUsuario: user.id },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  async approve(
    id: number,
    admin: User,
    ip?: string,
  ): Promise<{ solicitud: SolicitudNegocio; negocio: unknown }> {
    return await this.dataSource.transaction(async (manager) => {
      const solicitudes = manager.getRepository(SolicitudNegocio);
      const solicitud = await solicitudes.findOne({
        where: { idSolicitud: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud) {
        throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
      }
      if (solicitud.estado !== EstadoSolicitudNegocio.Pendiente) {
        throw new ConflictException('La solicitud ya fue atendida');
      }
      const userRepository = manager.getRepository(User);
      const solicitante = await userRepository.findOne({
        where: { id: solicitud.idUsuario },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitante || solicitante.role !== UserRole.Usuario) {
        throw new ConflictException(
          'El solicitante ya no tiene el rol de usuario',
        );
      }
      const negocio = await this.negocioService.createVerifiedFromRequest(
        solicitud.datosNegocio,
        solicitante.id,
        manager,
      );
      solicitante.role = UserRole.Negocio;
      solicitante.soporteUrl = solicitud.soporteUrl;
      await userRepository.save(solicitante);
      solicitud.estado = EstadoSolicitudNegocio.Aprobada;
      solicitud.motivo = null;
      await solicitudes.save(solicitud);
      await this.auditoriaService.registrar(
        {
          idUsuario: admin.id,
          accion: 'aprobacion_solicitud_negocio',
          entidad: 'solicitud_negocio',
          idEntidad: id,
          detalle: { idNegocio: negocio.idNegocio },
          ip,
        },
        manager,
      );
      return { solicitud, negocio };
    });
  }

  async reject(
    id: number,
    dto: RechazarSolicitudNegocioDto,
    admin: User,
    ip?: string,
  ): Promise<SolicitudNegocio> {
    return await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SolicitudNegocio);
      const solicitud = await repository.findOne({
        where: { idSolicitud: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud) {
        throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
      }
      if (solicitud.estado !== EstadoSolicitudNegocio.Pendiente) {
        throw new ConflictException('La solicitud ya fue atendida');
      }
      solicitud.estado = EstadoSolicitudNegocio.Rechazada;
      solicitud.motivo = dto.motivo.trim();
      await repository.save(solicitud);
      await this.auditoriaService.registrar(
        {
          idUsuario: admin.id,
          accion: 'rechazo_solicitud_negocio',
          entidad: 'solicitud_negocio',
          idEntidad: id,
          detalle: { motivo: solicitud.motivo },
          ip,
        },
        manager,
      );
      return solicitud;
    });
  }
}

function datosNegocioDto(
  dto: CreateSolicitudNegocioDto,
): CreateSolicitudNegocioDto {
  const { soporteUrl: _soporteUrl, ...datos } = dto;
  return datos;
}
