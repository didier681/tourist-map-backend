import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaginatedResult } from '../common/pagination/paginated-result';
import { ListAuditoriaDto } from './dto/list-auditoria.dto';
import { Auditoria } from './entities/auditoria.entity';

function quitarDatosSensibles(
  detalle: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(detalle)
      .filter(([clave]) => !/(password|contraseñ|token|secret)/i.test(clave))
      .map(([clave, valor]) => [
        clave,
        Array.isArray(valor)
          ? valor.map((item) =>
              typeof item === 'object' && item !== null
                ? quitarDatosSensibles(item as Record<string, unknown>)
                : item,
            )
          : typeof valor === 'object' && valor !== null
            ? quitarDatosSensibles(valor as Record<string, unknown>)
            : valor,
      ]),
  );
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly repository: Repository<Auditoria>,
  ) {}

  // Registra metadatos y filtra claves sensibles para que auditoría no persista credenciales.
  async registrar(evento: {
    idUsuario?: number | null;
    accion: string;
    entidad: string;
    idEntidad?: number | null;
    detalle?: Record<string, unknown> | null;
    ip?: string | null;
  }, manager?: EntityManager): Promise<Auditoria> {
    const repository = manager?.getRepository(Auditoria) ?? this.repository;
    return await repository.save(
      repository.create({
        ...evento,
        idUsuario: evento.idUsuario ?? null,
        idEntidad: evento.idEntidad ?? null,
        detalle: evento.detalle
          ? quitarDatosSensibles(evento.detalle)
          : null,
        ip: evento.ip ?? null,
      }),
    );
  }

  async findAll(query: ListAuditoriaDto): Promise<PaginatedResult<Auditoria>> {
    const builder = this.repository.createQueryBuilder('auditoria');
    if (query.accion) {
      builder.andWhere('auditoria.accion = :accion', { accion: query.accion });
    }

    if (query.entidad) {
      builder.andWhere('auditoria.entidad = :entidad', {
        entidad: query.entidad,
      });
    }
    if (query.idUsuario !== undefined) {
      builder.andWhere('auditoria.idUsuario = :idUsuario', {
        idUsuario: query.idUsuario,
      });
    }
    if (query.desde) {
      builder.andWhere('auditoria.fecha >= :desde', {
        desde: new Date(query.desde),
      });
    }
    if (query.hasta) {
      builder.andWhere('auditoria.fecha <= :hasta', {
        hasta: new Date(query.hasta),
      });
    }
    const [data, total] = await builder
      .orderBy('auditoria.fecha', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
