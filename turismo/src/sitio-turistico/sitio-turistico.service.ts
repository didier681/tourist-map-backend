import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOperator,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  EstadoRevision,
  SitioTuristico,
} from './entities/sitio-turistico.entity';
import { Zona } from '../zona/entities/zona.entity';
import { CreateSitioTuristicoDto } from './dto/create-sitio-turistico.dto';
import { UpdateSitioTuristicoDto } from './dto/update-sitio-turistico.dto';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { SugerirSitioTuristicoDto } from './dto/sugerir-sitio-turistico.dto';
import { RechazarSitioTuristicoDto } from './dto/rechazar-sitio-turistico.dto';
import { ConfirmacionSitio } from './entities/confirmacion-sitio.entity';
import { Resena } from '../resena/entities/resena.entity';
import {
  calculateBoundingBox,
  haversineDistanceMeters,
} from '../common/geo/haversine';
import { ProximityQueryDto } from '../common/geo/proximity-query.dto';
import { SiteListQueryDto } from '../common/pagination/site-list-query.dto';
import { PaginatedResult, paginateArray } from '../common/pagination/paginated-result';
import { sanitizeText } from '../common/sanitize-text';

@Injectable()
// Gestiona sitios turísticos, sugerencias de la comunidad y su moderación.
export class SitioTuristicoService {
  private readonly logger = new Logger(SitioTuristicoService.name);

  constructor(
    @InjectRepository(SitioTuristico)
    private readonly sitioRepository: Repository<SitioTuristico>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(GestorZona)
    private readonly gestorZonaRepository: Repository<GestorZona>,
    @InjectRepository(ConfirmacionSitio)
    private readonly confirmacionRepository: Repository<ConfirmacionSitio>,
    private readonly dataSource: DataSource,
  ) {}

  // Comprueba la zona asociada antes de guardar el nuevo sitio.
  async create(
    dto: CreateSitioTuristicoDto,
    user: User,
  ): Promise<SitioTuristico> {
    const zona = await this.zonaRepository.findOneBy({ idZona: dto.idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${dto.idZona} no encontrada`);
    }
    await this.assertCanManageZone(dto.idZona, user);
    this.assertInsideZone(
      Number(dto.latitud),
      Number(dto.longitud),
      zona.latitud,
      zona.longitud,
      zona.radioCoberturaM,
    );
    return await this.sitioRepository.save(
      this.sitioRepository.create({
        ...dto,
        descripcion: sanitizeText(dto.descripcion),
      }),
    );
  }

  // Registra una sugerencia pendiente después de validar zona, cuota y duplicados.
  async suggest(
    dto: SugerirSitioTuristicoDto,
    user: User,
  ): Promise<SitioTuristico> {
    const zona = await this.zonaRepository.findOneBy({ idZona: dto.idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${dto.idZona} no encontrada`);
    }
    this.assertInsideZone(
      Number(dto.latitud),
      Number(dto.longitud),
      zona.latitud,
      zona.longitud,
      zona.radioCoberturaM,
    );

    return await this.dataSource.transaction(async (manager) => {
      // Serializa solicitudes del mismo usuario antes de contar para no superar la cuota diaria.
      await manager.query(
        'SELECT id_usuario FROM users WHERE id_usuario = ? FOR UPDATE',
        [user.id],
      );
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const inicioDiaSiguiente = new Date(inicioDia);
      inicioDiaSiguiente.setDate(inicioDiaSiguiente.getDate() + 1);
      const repository = manager.getRepository(SitioTuristico);
      const sugerenciasHoy = await repository
        .createQueryBuilder('sitio')
        .where('sitio.idUsuarioSugiere = :idUsuario', { idUsuario: user.id })
        .andWhere('sitio.fechaCreacion >= :inicioDia', { inicioDia })
        .andWhere('sitio.fechaCreacion < :inicioDiaSiguiente', {
          inicioDiaSiguiente,
        })
        .getCount();
      if (sugerenciasHoy >= 3) {
        throw new BadRequestException(
          'Has alcanzado el límite de 3 sugerencias de sitios turísticos por día',
        );
      }

      const point = {
        lat: Number(dto.latitud),
        lng: Number(dto.longitud),
      };
      const box = calculateBoundingBox(point, 200);
      const sitiosCercanos = await repository
        .createQueryBuilder('sitio')
        .where('sitio.estadoRevision IN (:...estados)', {
          estados: [EstadoRevision.Pendiente, EstadoRevision.Aprobado],
        })
        .andWhere('sitio.latitud BETWEEN :minLat AND :maxLat', box)
        .andWhere('sitio.longitud BETWEEN :minLng AND :maxLng', box)
        .getMany();
      const duplicado = sitiosCercanos.find(
        (sitio) =>
          haversineDistanceMeters(point, {
            lat: Number(sitio.latitud),
            lng: Number(sitio.longitud),
          }) < 200 && nombresParecidos(sitio.nombre, dto.nombre),
      );
      if (duplicado) {
        throw new ConflictException({
          message:
            'Ya existe un sitio con un nombre parecido a menos de 200 metros',
          // No devuelve las relaciones ni los datos internos del sitio existente.
          sitio: { idSitio: duplicado.idSitio, nombre: duplicado.nombre },
        });
      }

      return await repository.save(
        repository.create({
          ...dto,
          descripcion: sanitizeText(dto.descripcion),
          estadoRevision: EstadoRevision.Pendiente,
          idUsuarioSugiere: user.id,
          motivoRechazo: null,
          confirmaciones: 0,
        }),
      );
    });
  }

  // Incluye la zona y las categorías para entregar el contexto del sitio.
  // Los endpoints públicos solo exponen sitios aprobados.
  async findAll(
    query: SiteListQueryDto,
  ): Promise<PaginatedResult<SitioTuristico>> {
    const builder = this.sitioRepository
      .createQueryBuilder('sitio')
      .leftJoinAndSelect('sitio.zona', 'zona')
      .leftJoinAndSelect('sitio.categorias', 'sitioCategoria')
      .leftJoinAndSelect('sitioCategoria.categoria', 'categoria')
      .where('sitio.estadoRevision = :estadoRevision', {
        estadoRevision: EstadoRevision.Aprobado,
      });
    if (query.idZona !== undefined) {
      builder.andWhere('sitio.idZona = :idZona', { idZona: query.idZona });
    }
    if (query.q?.trim()) {
      builder.andWhere('sitio.nombre LIKE :nombre', {
        nombre: `%${query.q.trim()}%`,
      });
    }
    const [data, total] = await builder
      .distinct(true)
      .orderBy('sitio.idSitio', 'ASC')
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

  // Prefiltra por caja en SQL y calcula la distancia exacta solo para candidatos próximos.
  async findNearby(query: ProximityQueryDto) {
    const point = { lat: Number(query.lat), lng: Number(query.lng) };
    const box = calculateBoundingBox(point, query.radioM);
    const builder = this.sitioRepository
      .createQueryBuilder('sitio')
      .leftJoinAndSelect('sitio.zona', 'zona')
      .leftJoinAndSelect('sitio.categorias', 'sitioCategoria')
      .leftJoinAndSelect('sitioCategoria.categoria', 'categoria')
      .where('sitio.estadoRevision = :estadoRevision', {
        estadoRevision: EstadoRevision.Aprobado,
      })
      .andWhere('sitio.estado = :estado', { estado: 'activo' })
      .andWhere('sitio.latitud BETWEEN :minLat AND :maxLat', box)
      .andWhere('sitio.longitud BETWEEN :minLng AND :maxLng', box);
    if (query.idZona !== undefined) {
      builder.andWhere('sitio.idZona = :idZona', { idZona: query.idZona });
    }
    if (query.idCategoria !== undefined) {
      builder.andWhere('categoria.idCategoria = :idCategoria', {
        idCategoria: query.idCategoria,
      });
    }
    if (query.q?.trim()) {
      builder.andWhere('sitio.nombre LIKE :nombre', {
        nombre: `%${query.q.trim()}%`,
      });
    }

    const sitios = await builder.distinct(true).getMany();
    const cercanos = sitios
      .map((sitio) => ({
        ...sitio,
        distanciaM: haversineDistanceMeters(point, {
          lat: Number(sitio.latitud),
          lng: Number(sitio.longitud),
        }),
      }))
      .filter((sitio) => sitio.distanciaM <= query.radioM)
      .sort((a, b) => a.distanciaM - b.distanciaM);

    return paginateArray(cercanos, query);
  }

  // Devuelve un sitio aprobado con sus relaciones o responde con 404.
  async findOne(id: number): Promise<SitioTuristico> {
    const sitio = await this.sitioRepository.findOne({
      where: { idSitio: id, estadoRevision: EstadoRevision.Aprobado },
      relations: { zona: true, categorias: { categoria: true } },
    });
    if (!sitio) {
      throw new NotFoundException(`Sitio turístico con ID ${id} no encontrado`);
    }
    return sitio;
  }

  // Calcula el promedio y total de reseñas de un sitio público aprobado.
  async findCalificacion(
    id: number,
  ): Promise<{ promedio: number; total: number }> {
    await this.findOne(id);
    const resultado = await this.dataSource
      .getRepository(Resena)
      .createQueryBuilder('resena')
      .select('AVG(resena.calificacion)', 'promedio')
      .addSelect('COUNT(resena.idResena)', 'total')
      .where('resena.idSitio = :idSitio', { idSitio: id })
      .getRawOne<{ promedio: string | null; total: string }>();

    if (!resultado) {
      throw new Error('No se pudo calcular la calificación del sitio');
    }
    return {
      promedio:
        resultado.promedio === null ? 0 : Number(resultado.promedio),
      total: Number(resultado.total),
    };
  }

  // Lista pendientes por zona asignada al gestor o todas para el administrador.
  async findPending(user: User): Promise<SitioTuristico[]> {
    const where: {
      estadoRevision: EstadoRevision;
      idZona?: FindOperator<number>;
    } = { estadoRevision: EstadoRevision.Pendiente };

    if (user.role !== UserRole.Admin) {
      const asignaciones = await this.gestorZonaRepository.find({
        where: { idUsuario: user.id },
        select: { idZona: true },
      });
      const zonas = asignaciones.map(({ idZona }) => idZona);
      if (zonas.length === 0) {
        return [];
      }
      where.idZona = In(zonas);
    }

    return await this.sitioRepository.find({
      where,
      relations: { zona: true, categorias: { categoria: true } },
      order: { confirmaciones: 'DESC' },
    });
  }

  // Aprueba una sugerencia solo si el usuario administra la zona del sitio.
  async approve(id: number, user: User): Promise<SitioTuristico> {
    const sitio = await this.findForModeration(id);
    await this.assertCanManageZone(sitio.idZona, user);
    sitio.estadoRevision = EstadoRevision.Aprobado;
    sitio.motivoRechazo = null;
    const aprobado = await this.sitioRepository.save(sitio);
    // Identifica la sugerencia y al responsable para auditar la moderación.
    this.logger.log(`Sugerencia ${id} aprobada por el usuario ${user.id}`);
    return aprobado;
  }

  // Rechaza una sugerencia y guarda el motivo obligatorio de la decisión.
  async reject(
    id: number,
    dto: RechazarSitioTuristicoDto,
    user: User,
  ): Promise<SitioTuristico> {
    const sitio = await this.findForModeration(id);
    await this.assertCanManageZone(sitio.idZona, user);
    sitio.estadoRevision = EstadoRevision.Rechazado;
    sitio.motivoRechazo = sanitizeText(dto.motivoRechazo);
    const rechazado = await this.sitioRepository.save(sitio);
    // Registra el rechazo sin repetir el motivo, que puede contener datos aportados por usuarios.
    this.logger.log(`Sugerencia ${id} rechazada por el usuario ${user.id}`);
    return rechazado;
  }

  // Registra una única confirmación por usuario y actualiza el contador en transacción.
  async confirm(id: number, user: User): Promise<SitioTuristico> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const sitioRepository = manager.getRepository(SitioTuristico);
        const confirmacionRepository = manager.getRepository(ConfirmacionSitio);
        const sitio = await sitioRepository.findOneBy({ idSitio: id });
        if (!sitio) {
          throw new NotFoundException(
            `Sitio turístico con ID ${id} no encontrado`,
          );
        }
        if (sitio.estadoRevision !== EstadoRevision.Pendiente) {
          throw new BadRequestException(
            'Solo se pueden confirmar sitios turísticos pendientes',
          );
        }
        if (sitio.idUsuarioSugiere === user.id) {
          throw new BadRequestException(
            'No puedes confirmar un sitio que tú mismo sugeriste',
          );
        }
        if (
          await confirmacionRepository.existsBy({
            idUsuario: user.id,
            idSitio: id,
          })
        ) {
          throw new ConflictException('Ya confirmaste este sitio');
        }

        await confirmacionRepository.insert({
          idUsuario: user.id,
          idSitio: id,
        });
        await sitioRepository.increment({ idSitio: id }, 'confirmaciones', 1);
        return await sitioRepository.findOneByOrFail({ idSitio: id });
      });
    } catch (error) {
      if (esDuplicadoDeBaseDeDatos(error)) {
        throw new ConflictException('Ya confirmaste este sitio');
      }
      throw error;
    }
  }

  // Valida la zona si cambia y guarda los campos recibidos.
  async update(
    id: number,
    dto: UpdateSitioTuristicoDto,
    user: User,
  ): Promise<SitioTuristico> {
    const sitio = await this.sitioRepository.findOneBy({ idSitio: id });
    if (!sitio) {
      throw new NotFoundException(`Sitio turístico con ID ${id} no encontrado`);
    }
    const idZona = dto.idZona ?? sitio.idZona;
    const zona = await this.zonaRepository.findOneBy({ idZona });
    if (!zona) {
      throw new NotFoundException(`Zona con ID ${idZona} no encontrada`);
    }
    await this.assertCanManageZone(sitio.idZona, user);
    await this.assertCanManageZone(idZona, user);
    this.assertInsideZone(
      Number(dto.latitud ?? sitio.latitud),
      Number(dto.longitud ?? sitio.longitud),
      zona.latitud,
      zona.longitud,
      zona.radioCoberturaM,
    );
    this.sitioRepository.merge(sitio, {
      ...dto,
      descripcion:
        dto.descripcion === undefined
          ? undefined
          : sanitizeText(dto.descripcion),
    });
    return await this.sitioRepository.save(sitio);
  }

  private assertInsideZone(
    lat: number,
    lng: number,
    zoneLat: string,
    zoneLng: string,
    radiusMeters: number,
  ): void {
    const distance = haversineDistanceMeters(
      { lat, lng },
      { lat: Number(zoneLat), lng: Number(zoneLng) },
    );
    if (distance > radiusMeters) {
      throw new BadRequestException(
        `Las coordenadas del sitio deben estar dentro del radio de cobertura de ${radiusMeters} metros de la zona`,
      );
    }
  }

  // Elimina el sitio indicado o responde con 404 si no existe.
  async remove(id: number, user: User): Promise<void> {
    const sitio = await this.sitioRepository.findOneBy({ idSitio: id });
    if (!sitio) {
      throw new NotFoundException(`Sitio turístico con ID ${id} no encontrado`);
    }
    await this.assertCanManageZone(sitio.idZona, user);
    await this.sitioRepository.remove(sitio);
  }

  private async findForModeration(id: number): Promise<SitioTuristico> {
    const sitio = await this.sitioRepository.findOneBy({ idSitio: id });
    if (!sitio) {
      throw new NotFoundException(`Sitio turístico con ID ${id} no encontrado`);
    }
    return sitio;
  }

  private async assertCanManageZone(idZona: number, user: User): Promise<void> {
    if (user.role === UserRole.Admin) {
      return;
    }
    const assigned = await this.gestorZonaRepository.existsBy({
      idUsuario: user.id,
      idZona,
    });
    if (!assigned) {
      throw new ForbiddenException('No tienes permisos sobre esta zona');
    }
  }
}

function nombresParecidos(nombreA: string, nombreB: string): boolean {
  const normalizar = (nombre: string): string =>
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const a = normalizar(nombreA);
  const b = normalizar(nombreB);
  if (!a || !b) {
    return false;
  }

  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.6;
  }

  let anterior = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let fila = 1; fila <= a.length; fila += 1) {
    const actual = [fila];
    for (let columna = 1; columna <= b.length; columna += 1) {
      actual[columna] = Math.min(
        actual[columna - 1] + 1,
        anterior[columna] + 1,
        anterior[columna - 1] + (a[fila - 1] === b[columna - 1] ? 0 : 1),
      );
    }
    anterior = actual;
  }
  return anterior[b.length] / Math.max(a.length, b.length) <= 0.2;
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
