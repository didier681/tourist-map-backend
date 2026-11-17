import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Like, QueryFailedError, Repository } from 'typeorm';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { Zona } from '../zona/entities/zona.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { EstadoVerificacion, Negocio } from './entities/negocio.entity';
import { HorarioNegocio } from './entities/horario-negocio.entity';
import { EstadoResena, Resena } from '../resena/entities/resena.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { calculateBoundingBox, haversineDistanceMeters } from '../common/geo/haversine';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { SiteListQueryDto } from '../common/pagination/site-list-query.dto';
import { PaginatedResult, paginateArray } from '../common/pagination/paginated-result';
import { HorarioDiaDto } from './dto/horario-negocio.dto';
import { VerificarNegocioDto } from './dto/verificar-negocio.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { estaAbiertoAhora } from './horario.util';

@Injectable()
// Gestiona negocios, que siempre pertenecen a una zona y pueden asociarse a un sitio.
export class NegocioService {
  private readonly logger = new Logger(NegocioService.name);

  // Inyecta repositorios para validar la zona obligatoria y el sitio opcional.
  constructor(
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    @InjectRepository(SitioTuristico)
    private readonly sitioRepository: Repository<SitioTuristico>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(HorarioNegocio)
    private readonly horarioRepository: Repository<HorarioNegocio>,
    @InjectRepository(Resena)
    private readonly resenaRepository: Repository<Resena>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // Valida la zona y, si se indicó, que el sitio exista y pertenezca a esa zona.
  async create(dto: CreateNegocioDto, user: User): Promise<Negocio> {
    this.validateCoordinates(dto.latitud, dto.longitud);
    await this.validateReferences(dto.idZona, dto.idSitio);
    await this.assertInsideZone(
      dto.idZona,
      dto.latitud,
      dto.longitud,
    );
    await this.validateNit(dto.nitDocumento);
    try {
      return await this.negocioRepository.save(
        this.negocioRepository.create({
          ...dto,
          idUsuario: user.id,
          idSitio: dto.idSitio ?? null,
          latitud: String(dto.latitud),
          longitud: String(dto.longitud),
        }),
      );
    } catch (error) {
      if (esDuplicadoDeBaseDeDatos(error)) {
        throw new ConflictException(
          'Ya existe un negocio registrado con ese NIT o documento',
        );
      }
      throw error;
    }
  }

  // Reutiliza las reglas geográficas y guarda dentro de la transacción de aprobación.
  async createVerifiedFromRequest(
    dto: CreateNegocioDto,
    idUsuario: number,
    manager: EntityManager,
  ): Promise<Negocio> {
    const zones = manager.getRepository(Zona);
    const sites = manager.getRepository(SitioTuristico);
    const businesses = manager.getRepository(Negocio);
    const zona = await zones.findOneBy({ idZona: dto.idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${dto.idZona} no encontrada`);
    }
    if (dto.idSitio !== undefined && dto.idSitio !== null) {
      const sitio = await sites.findOneBy({ idSitio: dto.idSitio });
      if (!sitio || sitio.idZona !== dto.idZona) {
        throw new BadRequestException(
          'El sitio turístico no existe o no pertenece a la zona indicada',
        );
      }
    }
    const distancia = haversineDistanceMeters(
      { lat: dto.latitud, lng: dto.longitud },
      { lat: Number(zona.latitud), lng: Number(zona.longitud) },
    );
    if (distancia > zona.radioCoberturaM) {
      throw new BadRequestException(
        'Las coordenadas del negocio están fuera del radio de cobertura de la zona',
      );
    }
    if (await businesses.existsBy({ nitDocumento: dto.nitDocumento })) {
      throw new ConflictException(
        'Ya existe un negocio registrado con ese NIT o documento',
      );
    }
    return await businesses.save(
      businesses.create({
        ...dto,
        idUsuario,
        idSitio: dto.idSitio ?? null,
        latitud: String(dto.latitud),
        longitud: String(dto.longitud),
        estadoVerificacion: EstadoVerificacion.Verificado,
        motivoRechazo: null,
      }),
    );
  }

  // Lista negocios con el sitio y las categorías asociados.
  async findAll(query: SiteListQueryDto): Promise<PaginatedResult<Negocio>> {
    const where = {
      estadoVerificacion: EstadoVerificacion.Verificado,
      ...(query.idZona === undefined ? {} : { idZona: query.idZona }),
      ...(query.q?.trim()
        ? { nombreComercial: Like(`%${query.q.trim()}%`) }
        : {}),
    };
    return await this.negocioRepository.findAndCount({
      where,
      relations: {
        zona: true,
        sitio: true,
        categorias: { categoria: true },
        servicios: true,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }).then(([data, total]) => ({
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    }));
  }

  // Devuelve solo información pública, ya que el perfil fiscal y su propietario son privados.
  async findNearby(query: ProximityQueryDto) {
    const point = { lat: Number(query.lat), lng: Number(query.lng) };
    const box = calculateBoundingBox(point, query.radioM);
    const builder = this.negocioRepository
      .createQueryBuilder('negocio')
      .leftJoinAndSelect('negocio.zona', 'zona')
      .leftJoinAndSelect('negocio.sitio', 'sitio')
      .leftJoinAndSelect('negocio.categorias', 'negocioCategoria')
      .leftJoinAndSelect('negocioCategoria.categoria', 'categoria')
      .leftJoinAndSelect('negocio.servicios', 'servicio')
      .where('negocio.estadoVerificacion = :verificado', {
        verificado: EstadoVerificacion.Verificado,
      })
      .andWhere('negocio.latitud BETWEEN :minLat AND :maxLat', box)
      .andWhere('negocio.longitud BETWEEN :minLng AND :maxLng', box);
    if (query.idZona !== undefined) {
      builder.andWhere('negocio.idZona = :idZona', { idZona: query.idZona });
    }
    if (query.idCategoria !== undefined) {
      builder.andWhere('categoria.idCategoriaNeg = :idCategoria', {
        idCategoria: query.idCategoria,
      });
    }
    if (query.q?.trim()) {
      builder.andWhere('negocio.nombreComercial LIKE :nombre', {
        nombre: `%${query.q.trim()}%`,
      });
    }

    const negocios = await builder.distinct(true).getMany();
    let cercanos = negocios
      .map((negocio) => {
        const { idUsuario: _idUsuario, nitDocumento: _nitDocumento, ...publico } =
          negocio;
        return {
          ...publico,
          distanciaM: haversineDistanceMeters(point, {
            lat: Number(negocio.latitud),
            lng: Number(negocio.longitud),
          }),
        };
      })
      .filter((negocio) => negocio.distanciaM <= query.radioM)
      .sort((a, b) => a.distanciaM - b.distanciaM);

    if (query.abiertoAhora) {
      const horarios = cercanos.length
        ? await this.horarioRepository.findBy({
            idNegocio: In(cercanos.map((negocio) => negocio.idNegocio)),
          })
        : [];
      const horarioPorNegocio = new Map<number, HorarioNegocio[]>();
      for (const horario of horarios) {
        const lista = horarioPorNegocio.get(horario.idNegocio) ?? [];
        lista.push(horario);
        horarioPorNegocio.set(horario.idNegocio, lista);
      }
      cercanos = cercanos.filter((negocio) =>
        estaAbiertoAhora(
          horarioPorNegocio.get(negocio.idNegocio) ?? [],
        ),
      );
    }

    return paginateArray(cercanos, query);
  }

  // El propietario consulta su inventario completo aunque todavía no sea público.
  async findMine(user: User): Promise<Negocio[]> {
    return await this.negocioRepository.find({
      where: { idUsuario: user.id },
      relations: { zona: true, sitio: true, horarios: true },
      order: { idNegocio: 'DESC' },
    });
  }

  async findPending(): Promise<Negocio[]> {
    return await this.negocioRepository.find({
      where: { estadoVerificacion: EstadoVerificacion.Pendiente },
      relations: { usuario: true, zona: true },
      order: { idNegocio: 'ASC' },
    });
  }

  async verify(
    id: number,
    dto: VerificarNegocioDto,
    admin: User,
    ip?: string,
  ): Promise<Negocio> {
    if (
      [EstadoVerificacion.Rechazado, EstadoVerificacion.Suspendido].includes(
        dto.estado,
      ) &&
      !dto.motivo?.trim()
    ) {
      throw new BadRequestException(
        'El motivo es obligatorio al rechazar o suspender un negocio',
      );
    }
    const negocio = await this.negocioRepository.findOneBy({ idNegocio: id });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    negocio.estadoVerificacion = dto.estado;
    negocio.motivoRechazo =
      dto.estado === EstadoVerificacion.Rechazado ||
      dto.estado === EstadoVerificacion.Suspendido
        ? dto.motivo!.trim()
        : null;
    await this.negocioRepository.save(negocio);
    await this.auditoriaService.registrar({
      idUsuario: admin.id,
      accion: 'verificacion_negocio',
      entidad: 'negocio',
      idEntidad: id,
      detalle: { estado: dto.estado, motivo: negocio.motivoRechazo },
      ip,
    });
    return await this.findOneIncludingUnverified(id);
  }

  async replaceHorarios(
    id: number,
    horarios: HorarioDiaDto[],
    user: User,
  ): Promise<HorarioNegocio[]> {
    const negocio = await this.negocioRepository.findOneBy({ idNegocio: id });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    this.assertOwner(negocio, user);
    for (const horario of horarios) {
      if (horario.horaApertura >= horario.horaCierre) {
        throw new BadRequestException(
          'La hora de apertura debe ser anterior a la hora de cierre',
        );
      }
    }
    return await this.horarioRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(HorarioNegocio);
      await repository.delete({ idNegocio: id });
      if (horarios.length === 0) {
        return [];
      }
      return await repository.save(
        horarios.map((horario) =>
          repository.create({ ...horario, idNegocio: id }),
        ),
      );
    });
  }

  async findCalificacion(
    id: number,
  ): Promise<{ promedio: number; total: number }> {
    const negocio = await this.negocioRepository.findOneBy({
      idNegocio: id,
      estadoVerificacion: EstadoVerificacion.Verificado,
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    const result = await this.resenaRepository
      .createQueryBuilder('resena')
      .select('AVG(resena.calificacion)', 'promedio')
      .addSelect('COUNT(resena.idResena)', 'total')
      .where('resena.idNegocio = :id', { id })
      .andWhere('resena.estado = :visible', { visible: EstadoResena.Visible })
      .getRawOne<{ promedio: string | null; total: string }>();
    return {
      promedio: result?.promedio ? Number(result.promedio) : 0,
      total: Number(result?.total ?? 0),
    };
  }

  // Expone solo negocios verificados en la ruta pública de detalle.
  async findOne(id: number): Promise<Negocio> {
    const negocio = await this.negocioRepository.findOne({
      where: {
        idNegocio: id,
        estadoVerificacion: EstadoVerificacion.Verificado,
      },
      relations: {
        zona: true,
        sitio: true,
        categorias: { categoria: true },
        servicios: true,
        horarios: true,
      },
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    return negocio;
  }

  private async findOneIncludingUnverified(id: number): Promise<Negocio> {
    const negocio = await this.negocioRepository.findOne({
      where: { idNegocio: id },
      relations: { zona: true, sitio: true, horarios: true },
    });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    return negocio;
  }

  // Actualiza el negocio y valida la zona y el sitio opcional resultantes.
  async update(
    id: number,
    dto: UpdateNegocioDto,
    user: User,
  ): Promise<Negocio> {
    const negocio = await this.negocioRepository.findOneBy({ idNegocio: id });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    this.assertOwner(negocio, user);
    const latitud = dto.latitud ?? Number(negocio.latitud);
    const longitud = dto.longitud ?? Number(negocio.longitud);
    this.validateCoordinates(latitud, longitud);
    const idZona = dto.idZona ?? negocio.idZona;
    const idSitio = dto.idSitio === undefined ? negocio.idSitio : dto.idSitio;
    await this.validateReferences(idZona, idSitio);
    await this.assertInsideZone(idZona, latitud, longitud);
    const nitDocumento = dto.nitDocumento ?? negocio.nitDocumento;
    await this.validateNit(nitDocumento, id);
    this.negocioRepository.merge(negocio, {
      ...dto,
      idSitio: dto.idSitio === undefined ? undefined : dto.idSitio,
      latitud: dto.latitud === undefined ? undefined : String(dto.latitud),
      longitud: dto.longitud === undefined ? undefined : String(dto.longitud),
    });
    try {
      await this.negocioRepository.save(negocio);
    } catch (error) {
      if (esDuplicadoDeBaseDeDatos(error)) {
        throw new ConflictException(
          'Ya existe un negocio registrado con ese NIT o documento',
        );
      }
      throw error;
    }
    return await this.findOneIncludingUnverified(id);
  }

  // Centraliza el cambio de membresía, que no forma parte del CRUD del negocio.
  async updateMembresia(
    id: number,
    estadoMembresia: Negocio['estadoMembresia'],
    admin?: User,
    ip?: string,
  ): Promise<Negocio> {
    const negocio = await this.negocioRepository.findOneBy({ idNegocio: id });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    const estadoAnterior = negocio.estadoMembresia;
    negocio.estadoMembresia = estadoMembresia;
    await this.negocioRepository.save(negocio);
    // Conserva una traza de auditoría de cada cambio administrativo de membresía.
    this.logger.log(
      `Membresía del negocio ${id}: ${estadoAnterior} -> ${estadoMembresia}`,
    );
    await this.auditoriaService.registrar({
      idUsuario: admin?.id,
      accion: 'cambio_membresia',
      entidad: 'negocio',
      idEntidad: id,
      detalle: { anterior: estadoAnterior, nuevo: estadoMembresia },
      ip,
    });
    return await this.findOneIncludingUnverified(id);
  }

  // Elimina el negocio indicado.
  async remove(id: number, user: User): Promise<void> {
    const negocio = await this.negocioRepository.findOneBy({ idNegocio: id });
    if (!negocio) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }
    this.assertOwner(negocio, user);
    await this.negocioRepository.remove(negocio);
  }

  private assertOwner(negocio: Negocio, user: User): void {
    if (user.role !== UserRole.Admin && negocio.idUsuario !== user.id) {
      throw new ForbiddenException('No eres propietario de este negocio');
    }
  }

  private validateCoordinates(latitud: number, longitud: number): void {
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      throw new BadRequestException(
        'La latitud debe ser un número entre -90 y 90',
      );
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      throw new BadRequestException(
        'La longitud debe ser un número entre -180 y 180',
      );
    }
  }

  private async validateNit(
    nitDocumento: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.negocioRepository.findOneBy({ nitDocumento });
    if (existing && existing.idNegocio !== excludeId) {
      throw new ConflictException(
        'Ya existe un negocio registrado con ese NIT o documento',
      );
    }
  }

  // Confirma que la zona exista y que el sitio opcional pertenezca a esa zona.
  private async validateReferences(
    idZona: number,
    idSitio: number | null | undefined,
  ): Promise<void> {
    const zona = await this.zonaRepository.findOneBy({ idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${idZona} no encontrada`);
    }

    if (idSitio !== null && idSitio !== undefined) {
      const sitio = await this.sitioRepository.findOneBy({ idSitio });
      if (!sitio) {
        throw new NotFoundException(
          `Sitio turístico con ID ${idSitio} no encontrado`,
        );
      }
      if (sitio.idZona !== idZona) {
        throw new UnprocessableEntityException(
          'El sitio turístico no pertenece a la zona indicada',
        );
      }
    }

  }

  private async assertInsideZone(
    idZona: number,
    latitud: number,
    longitud: number,
  ): Promise<void> {
    const zona = await this.zonaRepository.findOneBy({ idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${idZona} no encontrada`);
    }
    const distancia = haversineDistanceMeters(
      { lat: latitud, lng: longitud },
      { lat: Number(zona.latitud), lng: Number(zona.longitud) },
    );
    if (distancia > zona.radioCoberturaM) {
      throw new BadRequestException(
        `Las coordenadas del negocio deben estar dentro del radio de cobertura de ${zona.radioCoberturaM} metros de la zona`,
      );
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
