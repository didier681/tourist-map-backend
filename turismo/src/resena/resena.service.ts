import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { SitioTuristico, EstadoRevision } from '../sitio-turistico/entities/sitio-turistico.entity';
import { User } from '../user/entities/user.entity';
import { Negocio, EstadoVerificacion } from '../negocio/entities/negocio.entity';
import { CreateResenaDto } from './dto/create-resena.dto';
import { UpdateResenaDto } from './dto/update-resena.dto';
import { Resena, EstadoResena } from './entities/resena.entity';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { PaginatedResult } from '../common/pagination/paginated-result';
import { sanitizeText } from '../common/sanitize-text';
import {
  MotivoReporteResena,
  ReporteResena,
} from './entities/reporte-resena.entity';
import { ModerarResenaDto } from './dto/moderar-resena.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ResenaService {
  constructor(
    @InjectRepository(Resena)
    private readonly resenaRepository: Repository<Resena>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SitioTuristico)
    private readonly sitioRepository: Repository<SitioTuristico>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    @InjectRepository(ReporteResena)
    private readonly reporteRepository: Repository<ReporteResena>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // Exige exactamente un destino y evita reseñas del propietario a su propio negocio.
  async create(dto: CreateResenaDto, user: User): Promise<Resena> {
    this.assertExactlyOneTarget(dto.idSitio, dto.idNegocio);
    if (!(await this.userRepository.existsBy({ id: user.id }))) {
      throw new NotFoundException(`Usuario con ID ${user.id} no encontrado`);
    }
    if (dto.idSitio !== undefined && dto.idSitio !== null) {
      const sitio = await this.sitioRepository.findOneBy({
        idSitio: dto.idSitio,
      });
      if (!sitio) {
        throw new NotFoundException(
          `Sitio turístico con ID ${dto.idSitio} no encontrado`,
        );
      }
      if (sitio.estadoRevision !== EstadoRevision.Aprobado) {
        throw new BadRequestException(
          'Solo se pueden reseñar sitios turísticos aprobados',
        );
      }
    } else {
      if (dto.idNegocio === undefined || dto.idNegocio === null) {
        throw new BadRequestException(
          'Debes indicar exactamente uno de idSitio o idNegocio',
        );
      }
      const negocio = await this.negocioRepository.findOneBy({
        idNegocio: dto.idNegocio,
        estadoVerificacion: EstadoVerificacion.Verificado,
      });
      if (!negocio) {
        throw new NotFoundException(
          `Negocio con ID ${dto.idNegocio} no encontrado o no verificado`,
        );
      }
      if (negocio.idUsuario === user.id) {
        throw new ForbiddenException('No puedes reseñar tu propio negocio');
      }
    }

    const target = dto.idSitio === undefined || dto.idSitio === null
      ? { idUsuario: user.id, idNegocio: dto.idNegocio! }
      : { idUsuario: user.id, idSitio: dto.idSitio };
    if (await this.resenaRepository.existsBy(target)) {
      throw new ConflictException('Ya tienes una reseña para este destino');
    }
    try {
      return await this.resenaRepository.save(
        this.resenaRepository.create({
          ...dto,
          idSitio: dto.idSitio ?? null,
          idNegocio: dto.idNegocio ?? null,
          comentario: sanitizeText(dto.comentario),
          idUsuario: user.id,
          estado: EstadoResena.Visible,
        }),
      );
    } catch (error) {
      if (esDuplicadoDeBaseDeDatos(error)) {
        throw new ConflictException('Ya tienes una reseña para este destino');
      }
      throw error;
    }
  }

  async findAll(
    query: PaginationQueryDto & { idSitio?: number },
  ): Promise<PaginatedResult<Resena>> {
    const builder = this.resenaRepository
      .createQueryBuilder('resena')
      .leftJoinAndSelect('resena.usuario', 'usuario')
      .leftJoinAndSelect('resena.sitio', 'sitio')
      .leftJoinAndSelect('resena.negocio', 'negocio')
      .where('resena.estado = :visible', { visible: EstadoResena.Visible })
      .andWhere(
        '((resena.idSitio IS NOT NULL AND sitio.estadoRevision = :aprobado) OR (resena.idNegocio IS NOT NULL AND negocio.estadoVerificacion = :verificado))',
        {
          aprobado: EstadoRevision.Aprobado,
          verificado: EstadoVerificacion.Verificado,
        },
      );
    if (query.idSitio !== undefined) {
      builder.andWhere('resena.idSitio = :idSitio', {
        idSitio: query.idSitio,
      });
    }
    const [data, total] = await builder
      .orderBy('resena.idResena', 'DESC')
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

  async findPending(query: PaginationQueryDto): Promise<PaginatedResult<Resena>> {
    const [data, total] = await this.resenaRepository.findAndCount({
      where: { estado: EstadoResena.EnRevision },
      relations: { usuario: true, sitio: true, negocio: true, reportes: true },
      order: { idResena: 'ASC' },
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

  async findOne(id: number): Promise<Resena> {
    const resena = await this.resenaRepository.findOne({
      where: { idResena: id, estado: EstadoResena.Visible },
      relations: { usuario: true, sitio: true, negocio: true },
    });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    if (
      (resena.idSitio !== null &&
        resena.sitio?.estadoRevision !== EstadoRevision.Aprobado) ||
      (resena.idNegocio !== null &&
        resena.negocio?.estadoVerificacion !== EstadoVerificacion.Verificado)
    ) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    return resena;
  }

  async update(id: number, dto: UpdateResenaDto, user: User): Promise<Resena> {
    const resena = await this.resenaRepository.findOneBy({ idResena: id });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    this.assertOwner(resena, user);
    const targetChanged = dto.idSitio !== undefined || dto.idNegocio !== undefined;
    const idSitio =
      dto.idNegocio !== undefined && dto.idSitio === undefined
        ? null
        : dto.idSitio === undefined
          ? resena.idSitio
          : dto.idSitio;
    const idNegocio =
      dto.idSitio !== undefined && dto.idNegocio === undefined
        ? null
        : dto.idNegocio === undefined
          ? resena.idNegocio
          : dto.idNegocio;
    this.assertExactlyOneTarget(idSitio ?? undefined, idNegocio ?? undefined);
    if (targetChanged) {
      await this.assertTargetExistsAndReviewable(idSitio, idNegocio, user.id);
      const target = idSitio === null
        ? { idUsuario: user.id, idNegocio: idNegocio ?? undefined }
        : { idUsuario: user.id, idSitio: idSitio ?? undefined };
      if (await this.resenaRepository.existsBy(target)) {
        throw new ConflictException('Ya tienes una reseña para este destino');
      }
    }
    this.resenaRepository.merge(resena, {
      ...dto,
      idSitio,
      idNegocio,
      comentario:
        dto.comentario === undefined
          ? undefined
          : sanitizeText(dto.comentario),
    });
    try {
      await this.resenaRepository.save(resena);
    } catch (error) {
      if (esDuplicadoDeBaseDeDatos(error)) {
        throw new ConflictException('Ya tienes una reseña para este destino');
      }
      throw error;
    }
    return await this.findOne(id);
  }

  async remove(id: number, user: User): Promise<void> {
    const resena = await this.resenaRepository.findOneBy({ idResena: id });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    this.assertOwner(resena, user);
    await this.resenaRepository.remove(resena);
  }

  // Serializa los reportes por reseña para que solicitudes concurrentes no omitan el umbral.
  async report(
    id: number,
    motivo: MotivoReporteResena,
    user: User,
  ): Promise<{ message: string; reportes: number; enRevision: boolean }> {
    return await this.dataSource.transaction(async (manager) => {
      const resenas = manager.getRepository(Resena);
      const resena = await resenas.findOne({
        where: { idResena: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resena) {
        throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
      }
      if (resena.idUsuario === user.id) {
        throw new BadRequestException('No puedes reportar tu propia reseña');
      }
      if (resena.estado !== EstadoResena.Visible) {
        throw new ConflictException('La reseña ya no está disponible para reportes');
      }
      const reportes = manager.getRepository(ReporteResena);
      if (await reportes.existsBy({ idResena: id, idUsuario: user.id })) {
        throw new ConflictException('Ya reportaste esta reseña');
      }
      await reportes.save(
        reportes.create({ idResena: id, idUsuario: user.id, motivo }),
      );
      const total = await reportes.countBy({ idResena: id });
      if (total >= 3) {
        resena.estado = EstadoResena.EnRevision;
        await resenas.save(resena);
      }
      return { message: 'Reporte recibido', reportes: total, enRevision: total >= 3 };
    });
  }

  async moderate(
    id: number,
    dto: ModerarResenaDto,
    admin: User,
    ip?: string,
  ): Promise<Resena> {
    const resena = await this.resenaRepository.findOneBy({ idResena: id });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    resena.estado = dto.estado;
    await this.resenaRepository.save(resena);
    await this.auditoriaService.registrar({
      idUsuario: admin.id,
      accion: 'moderacion_resena',
      entidad: 'resena',
      idEntidad: id,
      detalle: { estado: dto.estado },
      ip,
    });
    return resena;
  }

  // Solo permite que la solicitud seleccione un sitio o un negocio, nunca ambos ni ninguno.
  private assertExactlyOneTarget(
    idSitio: number | null | undefined,
    idNegocio: number | null | undefined,
  ): void {
    if ((idSitio === undefined || idSitio === null) === (idNegocio === undefined || idNegocio === null)) {
      throw new BadRequestException(
        'Debes indicar exactamente uno de idSitio o idNegocio',
      );
    }
  }

  private async assertTargetExistsAndReviewable(
    idSitio: number | null,
    idNegocio: number | null,
    userId: number,
  ): Promise<void> {
    this.assertExactlyOneTarget(idSitio, idNegocio);
    if (idSitio !== null) {
      const sitio = await this.sitioRepository.findOneBy({ idSitio });
      if (!sitio || sitio.estadoRevision !== EstadoRevision.Aprobado) {
        throw new BadRequestException('Solo se pueden reseñar sitios aprobados');
      }
      return;
    }
    const negocio = await this.negocioRepository.findOneBy({
      idNegocio: idNegocio!,
      estadoVerificacion: EstadoVerificacion.Verificado,
    });
    if (!negocio) {
      throw new BadRequestException('Solo se pueden reseñar negocios verificados');
    }
    if (negocio.idUsuario === userId) {
      throw new ForbiddenException('No puedes reseñar tu propio negocio');
    }
  }

  private assertOwner(resena: Resena, user: User): void {
    if (resena.idUsuario !== user.id) {
      throw new ForbiddenException('No puedes modificar la reseña de otro usuario');
    }
  }
}

function esDuplicadoDeBaseDeDatos(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === 'ER_DUP_ENTRY'
  );
}
