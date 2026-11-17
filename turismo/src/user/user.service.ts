import {
  BadRequestException,
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateGestorDto } from './dto/create-gestor.dto';
import { AssignGestorZonasDto } from './dto/assign-gestor-zonas.dto';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { Zona } from '../zona/entities/zona.entity';
import { assertPasswordPolicy } from '../common/password-policy';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
// Contiene las reglas de negocio y el acceso a persistencia de usuarios.
export class UserService {
  private readonly logger = new Logger(UserService.name);

  // Número de rondas usado para generar hashes de contraseñas con bcrypt.
  private readonly saltRounds = 10;

  // Recibe el repositorio de TypeORM para consultar y guardar usuarios.
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GestorZona)
    private readonly gestorZonaRepository: Repository<GestorZona>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea una cuenta, comprueba el correo y guarda la contraseña como hash.
   */
  async create(
    createUserDto: CreateUserDto,
    terms?: { fechaAceptacionTerminos: Date; versionTerminos: string },
  ): Promise<User> {
    assertPasswordPolicy(createUserDto.password);
    if (createUserDto.role === UserRole.Gestor) {
      throw new BadRequestException(
        'Los gestores deben crearse mediante POST /users/gestores',
      );
    }
    await this.assertIdentityAvailable(
      createUserDto.email,
      createUserDto.documentoIdentidad,
    );

    // Nunca se persiste la contraseña recibida en texto plano.
    const hashedPassword: string = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );

    // Asigna solo los datos permitidos y usa el rol predeterminado si falta.
    const user: User = this.userRepository.create({
      email: createUserDto.email,
      nombre: createUserDto.nombre,
      idiomaPref: createUserDto.idiomaPref,
      passwordHash: hashedPassword,
      role: createUserDto.role ?? UserRole.Usuario,
      documentoIdentidad: createUserDto.documentoIdentidad ?? null,
      soporteUrl: createUserDto.soporteUrl ?? null,
      fechaAceptacionTerminos: terms?.fechaAceptacionTerminos ?? null,
      versionTerminos: terms?.versionTerminos ?? null,
    });

    // Persiste la cuenta y devuelve la entidad creada.
    return await this.userRepository.save(user);
  }

  // Crea un gestor inactivo; el administrador debe activarlo explícitamente.
  async createGestor(
    createGestorDto: CreateGestorDto,
    admin?: User,
    ip?: string,
  ): Promise<User> {
    assertPasswordPolicy(createGestorDto.password);
    await this.assertIdentityAvailable(
      createGestorDto.email,
      createGestorDto.documentoIdentidad,
    );
    const user = this.userRepository.create({
      email: createGestorDto.email,
      nombre: createGestorDto.nombre,
      idiomaPref: createGestorDto.idiomaPref,
      passwordHash: await bcrypt.hash(
        createGestorDto.password,
        this.saltRounds,
      ),
      documentoIdentidad: createGestorDto.documentoIdentidad,
      soporteUrl: createGestorDto.soporteUrl ?? null,
      role: UserRole.Gestor,
      isActive: false,
    });
    const gestor = await this.userRepository.save(user);
    // Registra la creación para auditoría sin incluir credenciales.
    this.logger.log(`Gestor creado: ${gestor.email} (ID ${gestor.id})`);
    await this.auditoriaService.registrar({
      idUsuario: admin?.id,
      accion: 'creacion_gestor',
      entidad: 'usuario',
      idEntidad: gestor.id,
      detalle: { rol: UserRole.Gestor },
      ip,
    });
    return gestor;
  }

  // Añade zonas a un gestor y evita crear asignaciones duplicadas.
  async assignZonas(
    idUsuario: number,
    dto: AssignGestorZonasDto,
    admin?: User,
    ip?: string,
  ): Promise<GestorZona[]> {
    const user = await this.findOne(idUsuario);
    if (user.role !== UserRole.Gestor) {
      throw new BadRequestException(
        'Las zonas solo pueden asignarse a usuarios con rol gestor',
      );
    }

    const zonasExistentes = await this.zonaRepository.findBy(
      dto.idZonas.map((idZona) => ({ idZona })),
    );
    if (zonasExistentes.length !== dto.idZonas.length) {
      const existentes = new Set(zonasExistentes.map((zona) => zona.idZona));
      const idInexistente = dto.idZonas.find(
        (idZona) => !existentes.has(idZona),
      );
      throw new NotFoundException(`Zona con ID ${idInexistente} no encontrada`);
    }

    const asignaciones = await this.gestorZonaRepository.save(
      dto.idZonas.map((idZona) =>
        this.gestorZonaRepository.create({ idUsuario, idZona }),
      ),
    );
    await this.auditoriaService.registrar({
      idUsuario: admin?.id,
      accion: 'asignacion_zonas',
      entidad: 'usuario',
      idEntidad: idUsuario,
      detalle: { idZonas: dto.idZonas },
      ip,
    });
    return asignaciones;
  }

  // Activa la cuenta de un gestor tras la aprobación administrativa.
  async activate(id: number): Promise<User> {
    const user = await this.findOne(id);
    if (user.role !== UserRole.Gestor) {
      throw new BadRequestException(
        'Solo pueden activarse cuentas con rol gestor mediante esta ruta',
      );
    }
    user.isActive = true;
    return await this.userRepository.save(user);
  }

  /**
   * Lista usuarios sin cargar hashes de contraseña.
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * Busca un usuario por ID o lanza 404 si no existe.
   */
  async findOne(id: number): Promise<User> {
    const user: User | null = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  /**
   * Busca por ID sin excepción; la estrategia JWT usa null para token inválido.
   */
  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  // Carga el hash solo en flujos que verifican la contraseña actual del titular.
  async findByIdWithPassword(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      select: { id: true, passwordHash: true, isActive: true },
    });
  }

  // Actualiza exclusivamente las preferencias del titular, sin aceptar datos administrativos.
  async updateMyProfile(
    id: number,
    changes: { nombre?: string; idiomaPref?: string },
  ): Promise<User> {
    const user = await this.findOne(id);
    this.userRepository.merge(user, changes);
    return await this.userRepository.save(user);
  }

  // Suspende o reactiva una cuenta; la revocación invalida todas sus sesiones renovables.
  async updateAccountState(
    id: number,
    isActive: boolean,
    motivo?: string,
    adminId?: number,
    ip?: string,
  ): Promise<User> {
    if (!isActive && id === adminId) {
      throw new BadRequestException('No puedes suspender tu propia cuenta');
    }
    const user = await this.findOne(id);
    // Guarda suspensión y revocación en una sola transacción para no dejar sesiones renovables.
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update({ id }, { isActive });
      if (!isActive) {
        await manager.getRepository(RefreshToken).update(
          { idUsuario: id, revocado: false },
          { revocado: true },
        );
      }
      await this.auditoriaService.registrar(
        {
          idUsuario: adminId,
          accion: isActive ? 'reactivacion_usuario' : 'suspension_usuario',
          entidad: 'usuario',
          idEntidad: id,
          detalle: { isActive, motivo: motivo ?? null },
          ip,
        },
        manager,
      );
    });
    user.isActive = isActive;
    // El motivo ayuda a auditar la acción, pero nunca sustituye el estado persistido.
    this.logger.warn(
      `Cuenta ${id} ${isActive ? 'reactivada' : 'suspendida'}${motivo ? `: ${motivo}` : ''}`,
    );
    return user;
  }

  /**
   * Busca por email y carga explícitamente el hash requerido por el login.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        documentoIdentidad: true,
        soporteUrl: true,
        nombre: true,
        idiomaPref: true,
        fechaRegistro: true,
        role: true,
        isActive: true,
      },
    });
  }

  /**
   * Actualiza los campos permitidos y vuelve a hashear si cambia la contraseña.
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user: User = await this.findOne(id);
    if (
      updateUserDto.role === UserRole.Gestor &&
      user.role !== UserRole.Gestor
    ) {
      throw new BadRequestException(
        'Los gestores deben crearse mediante POST /users/gestores',
      );
    }
    const documentoIdentidad =
      updateUserDto.documentoIdentidad === undefined
        ? user.documentoIdentidad
        : updateUserDto.documentoIdentidad;
    if (user.role === UserRole.Gestor && !documentoIdentidad) {
      throw new BadRequestException(
        'El documento de identidad es obligatorio para los gestores',
      );
    }

    // Evita asignar un correo que ya pertenezca a otra cuenta.
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailTaken: boolean = await this.userRepository.existsBy({
        email: updateUserDto.email,
      });
      if (emailTaken) {
        throw new ConflictException('El email ya está registrado');
      }
    }
    if (
      updateUserDto.documentoIdentidad &&
      updateUserDto.documentoIdentidad !== user.documentoIdentidad &&
      (await this.userRepository.existsBy({
        documentoIdentidad: updateUserDto.documentoIdentidad,
      }))
    ) {
      throw new ConflictException(
        'El documento de identidad ya está registrado',
      );
    }

    // Separa la contraseña para no copiarla en texto plano a la entidad.
    const { password, ...changes } = updateUserDto;

    // Calcula el nuevo hash únicamente cuando se envía una contraseña.
    let passwordHash: string | undefined;
    if (password) {
      assertPasswordPolicy(password);
      passwordHash = await bcrypt.hash(password, this.saltRounds);
    }

    // Aplica los campos validados y asigna el hash por separado.
    this.userRepository.merge(user, changes);
    if (passwordHash) {
      user.passwordHash = passwordHash;
    }

    return await this.userRepository.save(user);
  }

  private async assertIdentityAvailable(
    email: string,
    documentoIdentidad?: string,
  ): Promise<void> {
    if (await this.userRepository.existsBy({ email })) {
      throw new ConflictException('El email ya está registrado');
    }
    if (
      documentoIdentidad &&
      (await this.userRepository.existsBy({ documentoIdentidad }))
    ) {
      throw new ConflictException('El documento de identidad ya está registrado');
    }
  }

  /**
   * Elimina físicamente la cuenta después de comprobar que existe.
   */
  async remove(id: number, admin?: User, ip?: string): Promise<void> {
    const user: User = await this.findOne(id);
    await this.auditoriaService.registrar({
      idUsuario: admin?.id,
      accion: 'eliminacion_cuenta',
      entidad: 'usuario',
      idEntidad: id,
      ip,
    });
    await this.userRepository.remove(user);
  }
}
